import { Room, Player, CardValue } from './types';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  generateRoomCode(): string {
    let code: string;
    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(playerName: string, playerId: string): { room: Room; player: Player } {
    const code = this.generateRoomCode();

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
      createdAt: new Date()
    };

    this.rooms.set(code, room);
    return { room, player };
  }

  joinRoom(roomCode: string, playerName: string, playerId: string): { room: Room; player: Player; error?: string } | null {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) {
      return null;
    }

    // Check if name already exists in the room
    const nameExists = Array.from(room.players.values()).some(
      p => p.name.toLowerCase() === playerName.toLowerCase()
    );

    if (nameExists) {
      return { room, player: null as any, error: 'Dieser Name wird bereits verwendet' };
    }

    const player: Player = {
      id: playerId,
      name: playerName,
      selectedCard: null,
      hasVoted: false,
      isModerator: false,
      isObserver: false,
      avatarUrl: null
    };

    room.players.set(playerId, player);
    return { room, player };
  }

  getRoom(roomCode: string): Room | undefined {
    return this.rooms.get(roomCode.toUpperCase());
  }

  removePlayer(roomCode: string, playerId: string): boolean {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) {
      return false;
    }

    room.players.delete(playerId);

    // Delete room if empty
    if (room.players.size === 0) {
      this.rooms.delete(roomCode.toUpperCase());
    } else {
      // If moderator left, assign new moderator
      const hasModerator = Array.from(room.players.values()).some(p => p.isModerator);
      if (!hasModerator) {
        const firstPlayer = Array.from(room.players.values())[0];
        firstPlayer.isModerator = true;
      }
    }

    return true;
  }

  selectCard(roomCode: string, playerId: string, cardValue: CardValue): boolean {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) {
      return false;
    }

    const player = room.players.get(playerId);
    if (!player) {
      return false;
    }

    player.selectedCard = cardValue;
    player.hasVoted = true;
    return true;
  }

  revealCards(roomCode: string): Room | null {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) {
      return null;
    }

    room.revealed = true;
    return room;
  }

  startNewRound(roomCode: string): Room | null {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) {
      return null;
    }

    room.revealed = false;
    room.players.forEach(player => {
      player.selectedCard = null;
      player.hasVoted = false;
    });

    return room;
  }

  allPlayersVoted(roomCode: string): boolean {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room || room.players.size === 0) {
      return false;
    }

    // Filter out observers
    const activePlayers = Array.from(room.players.values()).filter(p => !p.isObserver);

    if (activePlayers.length === 0) {
      return false;
    }

    return activePlayers.every(player => player.hasVoted);
  }

  toggleObserver(roomCode: string, playerId: string): Player | null {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) {
      return null;
    }

    const player = room.players.get(playerId);
    if (!player) {
      return null;
    }

    player.isObserver = !player.isObserver;

    // Reset vote when becoming observer
    if (player.isObserver) {
      player.selectedCard = null;
      player.hasVoted = false;
    }

    return player;
  }

  updateAvatar(roomCode: string, playerId: string, avatarUrl: string | null): Player | null {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) {
      return null;
    }

    const player = room.players.get(playerId);
    if (!player) {
      return null;
    }

    player.avatarUrl = avatarUrl;
    return player;
  }

  getPlayersArray(room: Room): Player[] {
    return Array.from(room.players.values());
  }
}
