import { Room, Player, CardValue, Story, JiraConfig } from './types';
import { randomUUID } from 'crypto';
import { logger } from './utils/logger';
import { RoomRepository, DatabaseError } from './db/repository';

export type Result<T> = { success: true; data: T } | { success: false; error: string };

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private repository: RoomRepository | null;

  constructor(repository?: RoomRepository) {
    this.repository = repository ?? null;
  }

  private normalizeRoomCode(code: string): string {
    return code.toUpperCase();
  }

  async generateRoomCode(): Promise<string> {
    let code: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      // Check memory first, then DB
      const inMemory = this.rooms.has(code);
      const inDb = this.repository ? await this.repository.roomExists(code) : false;

      if (!inMemory && !inDb) {
        return code;
      }
      attempts++;
    } while (attempts < maxAttempts);

    throw new Error('Failed to generate unique room code');
  }

  async createRoom(playerName: string, playerId: string, roomCode?: string): Promise<Result<{ room: Room; player: Player }>> {
    let code: string;

    if (roomCode && roomCode.trim().length > 0) {
      code = this.normalizeRoomCode(roomCode.trim());

      // Validation: 3-12 alphanumeric characters
      const codeRegex = /^[A-Z0-9]{3,12}$/;
      if (!codeRegex.test(code)) {
        return { success: false, error: 'Ungültiger Raum-Code. Verwende 3-12 alphanumerische Zeichen.' };
      }

      // Check for collisions
      const inMemory = this.rooms.has(code);
      const inDb = this.repository ? await this.repository.roomExists(code) : false;

      if (inMemory || inDb) {
        return { success: false, error: 'Raum mit diesem Code existiert bereits.' };
      }
    } else {
      code = await this.generateRoomCode();
    }

    const player: Player = {
      id: playerId,
      name: playerName,
      selectedCard: null,
      hasVoted: false,
      isModerator: true,
      isObserver: false,
      avatarUrl: null
    };

    const room: Room = {
      code,
      players: new Map([[playerId, player]]),
      revealed: false,
      createdAt: new Date(),
      stories: [],
      activeStoryId: undefined,
      jiraConfig: undefined
    };

    // Persist to DB first
    if (this.repository) {
      try {
        await this.repository.createRoom(code);
      } catch (error: unknown) {
        // Handle Postgres unique_violation error (23505) via DatabaseError
        if (error instanceof DatabaseError && error.code === '23505') {
          return { success: false, error: 'Raum mit diesem Code existiert bereits.' };
        }
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
      }
    }

    this.rooms.set(code, room);
    logger.info(`Room created: ${code} by player ${playerName} (${playerId})`);
    return { success: true, data: { room, player } };
  }

  async joinRoom(roomCode: string, playerName: string, playerId: string): Promise<Result<{ room: Room; player: Player }>> {
    const normalizedCode = this.normalizeRoomCode(roomCode);
    let room = this.rooms.get(normalizedCode);

    // If not in memory, try to load from DB
    if (!room && this.repository) {
      try {
        const dbRoom = await this.repository.getRoomWithStories(normalizedCode);

        if (dbRoom) {
          // Hydrate room from DB - empty players Map
          room = {
            code: dbRoom.code,
            players: new Map(),
            revealed: false,
            createdAt: dbRoom.createdAt,
            stories: dbRoom.stories,
            activeStoryId: dbRoom.activeStoryId ?? undefined,
            jiraConfig: dbRoom.jiraConfig,
          };
          this.rooms.set(normalizedCode, room);
          logger.info(`Room ${normalizedCode} hydrated from database`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
      }
    }

    if (!room) {
      return { success: false, error: 'Raum nicht gefunden' };
    }

    // Check if name already exists in the room
    const nameExists = Array.from(room.players.values()).some(
      p => p.name.toLowerCase() === playerName.toLowerCase()
    );

    if (nameExists) {
      return { success: false, error: 'Dieser Name wird bereits verwendet' };
    }

    // First player to join an empty room becomes moderator
    const isModerator = room.players.size === 0;

    const player: Player = {
      id: playerId,
      name: playerName,
      selectedCard: null,
      hasVoted: false,
      isModerator,
      isObserver: false,
      avatarUrl: null
    };

    room.players.set(playerId, player);
    logger.info(`Player ${playerName} (${playerId}) joined room ${normalizedCode}${isModerator ? ' as moderator' : ''}`);
    return { success: true, data: { room, player } };
  }

  getRoom(roomCode: string): Room | undefined {
    return this.rooms.get(this.normalizeRoomCode(roomCode));
  }

  removePlayer(roomCode: string, playerId: string): { removed: boolean; newModerator?: Player } {
    const normalizedCode = this.normalizeRoomCode(roomCode);
    const room = this.rooms.get(normalizedCode);
    if (!room) {
      return { removed: false };
    }

    room.players.delete(playerId);

    // Remove from memory when empty (but keep in DB for future joins)
    if (room.players.size === 0) {
      this.rooms.delete(normalizedCode);
      logger.info(`Room ${normalizedCode} removed from memory (empty)`);
      return { removed: true };
    }

    // If moderator left, assign new moderator
    const hasModerator = Array.from(room.players.values()).some(p => p.isModerator);
    if (!hasModerator) {
      const firstPlayer = Array.from(room.players.values())[0];
      firstPlayer.isModerator = true;
      logger.info(`New moderator assigned in room ${normalizedCode}: ${firstPlayer.name}`);
      return { removed: true, newModerator: firstPlayer };
    }

    return { removed: true };
  }

  selectCard(roomCode: string, playerId: string, cardValue: CardValue): boolean {
    const room = this.getRoom(roomCode);
    if (!room) return false;

    const player = room.players.get(playerId);
    if (!player) return false;

    player.selectedCard = cardValue;
    player.hasVoted = true;
    return true;
  }

  revealCards(roomCode: string): Room | null {
    const room = this.getRoom(roomCode);
    if (!room) return null;

    room.revealed = true;
    return room;
  }

  startNewRound(roomCode: string): Room | null {
    const room = this.getRoom(roomCode);
    if (!room) return null;

    room.revealed = false;
    room.players.forEach(player => {
      player.selectedCard = null;
      player.hasVoted = false;
    });

    return room;
  }

  allPlayersVoted(roomCode: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.players.size === 0) return false;

    // Filter out observers
    const activePlayers = Array.from(room.players.values()).filter(p => !p.isObserver);

    if (activePlayers.length === 0) return false;

    return activePlayers.every(player => player.hasVoted);
  }

  toggleObserver(roomCode: string, playerId: string): Player | null {
    const room = this.getRoom(roomCode);
    if (!room) return null;

    const player = room.players.get(playerId);
    if (!player) return null;

    player.isObserver = !player.isObserver;

    // Reset vote when becoming observer
    if (player.isObserver) {
      player.selectedCard = null;
      player.hasVoted = false;
    }

    return player;
  }

  updateAvatar(roomCode: string, playerId: string, avatarUrl: string | null): Player | null {
    const room = this.getRoom(roomCode);
    if (!room) return null;

    const player = room.players.get(playerId);
    if (!player) return null;

    player.avatarUrl = avatarUrl;
    return player;
  }

  getPlayersArray(room: Room): Player[] {
    return Array.from(room.players.values());
  }

  // Story management methods

  isModerator(roomCode: string, playerId: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room) return false;
    const player = room.players.get(playerId);
    return player?.isModerator ?? false;
  }

  async addManualStory(roomCode: string, summary: string): Promise<Story | null> {
    const room = this.getRoom(roomCode);
    if (!room) return null;

    // Detect Jira URL in summary
    const jiraUrlRegex = /(https?:\/\/[^\s]+\/browse\/([A-Z][A-Z0-9]+-\d+))/i;
    const match = summary.match(jiraUrlRegex);

    let key: string | undefined;
    let url: string | undefined;

    if (match) {
      url = match[1];
      key = match[2];
    } else {
      // Fallback: detect first general URL
      const generalUrlRegex = /(https?:\/\/[^\s]+)/i;
      const generalMatch = summary.match(generalUrlRegex);
      if (generalMatch) {
        url = generalMatch[1].replace(/[.,!?;:)]+$/, '');
      }
    }

    const story: Story = {
      id: randomUUID(),
      summary: summary.trim(),
      isManual: true,
      voted: false,
      key,
      url
    };

    // Persist to DB first
    if (this.repository) {
      await this.repository.addStory(roomCode, story);
    }

    room.stories.push(story);
    return story;
  }

  async addJiraStory(roomCode: string, jiraStory: Omit<Story, 'id' | 'isManual' | 'voted'>): Promise<Story | null> {
    const room = this.getRoom(roomCode);
    if (!room) return null;

    // Check for duplicates by key
    if (jiraStory.key && room.stories.some(s => s.key === jiraStory.key)) {
      return null; // Duplicate
    }

    const story: Story = {
      id: randomUUID(),
      ...jiraStory,
      isManual: false,
      voted: false
    };

    // Persist to DB first
    if (this.repository) {
      await this.repository.addStory(roomCode, story);
    }

    room.stories.push(story);
    return story;
  }

  async removeStory(roomCode: string, storyId: string): Promise<boolean> {
    const room = this.getRoom(roomCode);
    if (!room) return false;

    const index = room.stories.findIndex(s => s.id === storyId);
    if (index === -1) return false;

    // Remove from DB first
    if (this.repository) {
      await this.repository.removeStory(storyId);
    }

    room.stories.splice(index, 1);

    // If active story was removed, clear selection
    if (room.activeStoryId === storyId) {
      room.activeStoryId = undefined;
      if (this.repository) {
        try {
          await this.repository.setActiveStory(roomCode, null);
        } catch (error: unknown) {
          // Re-throw the sanitized error from repository
          throw error;
        }
        }    }

    return true;
  }

  async selectStory(roomCode: string, storyId: string | null): Promise<Story | null> {
    const room = this.getRoom(roomCode);
    if (!room) return null;

    if (storyId === null) {
      room.activeStoryId = undefined;
      if (this.repository) {
        try {
          await this.repository.setActiveStory(roomCode, null);
        } catch (error: unknown) {
          throw error;
        }
        }      return null;
    }

    const story = room.stories.find(s => s.id === storyId);
    if (!story) return null;

    room.activeStoryId = storyId;
    if (this.repository) {
      await this.repository.setActiveStory(roomCode, storyId);
    }
    return story;
  }

  getActiveStory(roomCode: string): Story | null {
    const room = this.getRoom(roomCode);
    if (!room || !room.activeStoryId) return null;
    return room.stories.find(s => s.id === room.activeStoryId) || null;
  }

  async applyStoryPoints(roomCode: string, storyId: string, points: number): Promise<Story | null> {
    const room = this.getRoom(roomCode);
    if (!room) return null;

    const story = room.stories.find(s => s.id === storyId);
    if (!story) return null;

    // Keep old values in case DB update fails
    const oldPoints = story.storyPoints;
    const oldVoted = story.voted;

    story.storyPoints = points;
    story.voted = true;

    // Persist to DB
    if (this.repository) {
      try {
        await this.repository.updateStoryPoints(storyId, points);
      } catch (error: unknown) {
        // Revert memory state
        story.storyPoints = oldPoints;
        story.voted = oldVoted;
        throw error;
      }
    }

    return story;
  }

  async clearStories(roomCode: string): Promise<boolean> {
    const room = this.getRoom(roomCode);
    if (!room) return false;

    // Clear from DB first
    if (this.repository) {
      await this.repository.clearStories(roomCode);
      await this.repository.setActiveStory(roomCode, null);
    }

    room.stories = [];
    room.activeStoryId = undefined;
    return true;
  }

  getStories(roomCode: string): Story[] {
    const room = this.getRoom(roomCode);
    if (!room) return [];
    return room.stories;
  }

  // Jira configuration methods

  async setJiraConfig(roomCode: string, config: JiraConfig): Promise<boolean> {
    const room = this.getRoom(roomCode);
    if (!room) return false;

    room.jiraConfig = config;

    // Persist to DB
    if (this.repository) {
      await this.repository.setJiraConfig(roomCode, config);
    }

    return true;
  }

  getJiraConfig(roomCode: string): JiraConfig | undefined {
    const room = this.getRoom(roomCode);
    return room?.jiraConfig;
  }

  async clearJiraConfig(roomCode: string): Promise<boolean> {
    const room = this.getRoom(roomCode);
    if (!room) return false;

    room.jiraConfig = undefined;

    // Persist to DB
    if (this.repository) {
      await this.repository.setJiraConfig(roomCode, undefined);
    }

    return true;
  }

  hasJiraConfig(roomCode: string): boolean {
    const room = this.getRoom(roomCode);
    return room?.jiraConfig !== undefined;
  }
}
