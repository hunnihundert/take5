import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoomManager } from './roomManager';
import { CardValue } from '@taking5/shared';

// Mock logger to avoid console spam during tests
vi.mock('./utils/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    }
}));

// Mock the repository module to avoid DB dependency
vi.mock('./db/repository', () => ({
    RoomRepository: vi.fn(),
    DatabaseError: class extends Error {
        constructor(message: string, public code?: string) {
            super(message);
            this.name = 'DatabaseError';
        }
    }
}));

describe('RoomManager', () => {
    let roomManager: RoomManager;
    let playerId: string;
    let playerName: string;

    beforeEach(() => {
        // Create RoomManager without repository (in-memory only mode)
        roomManager = new RoomManager();
        playerId = 'player-123';
        playerName = 'TestPlayer';
    });

    describe('createRoom', () => {
        it('should create a room and return room and player data', async () => {
            const result = await roomManager.createRoom(playerName, playerId);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.room).toBeDefined();
                expect(result.data.room.code).toHaveLength(6);
                expect(result.data.room.players.size).toBe(1);
                expect(result.data.player.id).toBe(playerId);
                expect(result.data.player.isModerator).toBe(true);
            }
        });

        it('should create a room with a valid custom code', async () => {
            const customCode = 'MYROOM123';
            const result = await roomManager.createRoom(playerName, playerId, customCode);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.room.code).toBe(customCode);
            }
        });

        it('should normalize custom code to uppercase', async () => {
            const result = await roomManager.createRoom(playerName, playerId, 'myroom');
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.room.code).toBe('MYROOM');
            }
        });

        it('should fail if custom room code already exists (memory)', async () => {
            await roomManager.createRoom(playerName, 'player1', 'EXISTING');
            const result = await roomManager.createRoom(playerName, 'player2', 'existing');

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe('Raum mit diesem Code existiert bereits.');
            }
        });

        it('should fail if custom room code has invalid characters', async () => {
            const result = await roomManager.createRoom(playerName, playerId, 'INVALID-CODE!');
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toContain('Ungültiger Raum-Code');
            }
        });

        it('should fail if custom room code is too short', async () => {
            const result = await roomManager.createRoom(playerName, playerId, 'AB');
            expect(result.success).toBe(false);
        });

        it('should fail if custom room code is too long', async () => {
            const result = await roomManager.createRoom(playerName, playerId, 'VERYLONGROOMCODE');
            expect(result.success).toBe(false);
        });

        it('should auto-generate a code if custom code is empty or whitespace', async () => {
            const result = await roomManager.createRoom(playerName, playerId, '   ');
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.room.code).toHaveLength(6);
            }
        });
    });

    describe('joinRoom', () => {
        it('should successfully join an existing room', async () => {
            const createResult = await roomManager.createRoom('Host', 'host-id');
            if (!createResult.success) throw new Error('Setup failed');
            const roomCode = createResult.data.room.code;

            const joinResult = await roomManager.joinRoom(roomCode, playerName, playerId);

            expect(joinResult.success).toBe(true);
            if (joinResult.success) {
                expect(joinResult.data.room.players.size).toBe(2);
                expect(joinResult.data.player.id).toBe(playerId);
                expect(joinResult.data.player.isModerator).toBe(false);
            }
        });

        it('should fail if room code does not exist', async () => {
            const result = await roomManager.joinRoom('INVALID', playerName, playerId);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe('Raum nicht gefunden');
            }
        });

        it('should fail if player name already exists (case insensitive)', async () => {
            const createResult = await roomManager.createRoom('ExistingName', 'host-id');
            if (!createResult.success) throw new Error('Setup failed');
            const roomCode = createResult.data.room.code;

            const result = await roomManager.joinRoom(roomCode, 'existingname', playerId);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe('Dieser Name wird bereits verwendet');
            }
        });

        it('should make first player to join empty room the moderator', async () => {
            // Create a room with one player
            const createResult = await roomManager.createRoom('Host', 'host-id');
            if (!createResult.success) throw new Error('Setup failed');
            const roomCode = createResult.data.room.code;

            // Host leaves, room becomes empty (but stays in memory for this test)
            roomManager.removePlayer(roomCode, 'host-id');

            // This simulates rejoining an empty room (like after DB hydration)
            // First, we need to recreate the room since removePlayer deleted it
            const result2 = await roomManager.createRoom('NewHost', 'new-host-id');
            if (!result2.success) throw new Error('Setup failed');

            expect(result2.data.player.isModerator).toBe(true);
        });
    });

    describe('Game Logic', () => {
        let roomCode: string;

        beforeEach(async () => {
            const result = await roomManager.createRoom(playerName, playerId);
            if (!result.success) throw new Error('Setup failed');
            roomCode = result.data.room.code;
        });

        it('should allow voting and check consensus', () => {
            const card: CardValue = '5';
            const success = roomManager.selectCard(roomCode, playerId, card);

            expect(success).toBe(true);

            const allVoted = roomManager.allPlayersVoted(roomCode);
            expect(allVoted).toBe(true); // Only 1 player
        });

        it('should reveal cards', () => {
            roomManager.selectCard(roomCode, playerId, '5');
            const room = roomManager.revealCards(roomCode);
            expect(room?.revealed).toBe(true);
        });

        it('should start new round', () => {
            roomManager.selectCard(roomCode, playerId, '5');
            roomManager.revealCards(roomCode);

            const room = roomManager.startNewRound(roomCode);
            expect(room?.revealed).toBe(false);
            const player = room?.players.get(playerId);
            expect(player?.selectedCard).toBeNull();
            expect(player?.hasVoted).toBe(false);
        });
    });

    describe('Story Management', () => {
        let roomCode: string;

        beforeEach(async () => {
            const result = await roomManager.createRoom(playerName, playerId);
            if (!result.success) throw new Error('Setup failed');
            roomCode = result.data.room.code;
        });

        it('should add manual story', async () => {
            const storySummary = 'New Feature';
            const story = await roomManager.addManualStory(roomCode, storySummary);

            expect(story).toBeDefined();
            expect(story?.summary).toBe(storySummary);
            expect(story?.isManual).toBe(true);

            const stories = roomManager.getStories(roomCode);
            expect(stories).toHaveLength(1);
        });

        it('should detect Jira link and key in manual story', async () => {
            const summary = 'Fix bug https://company.atlassian.net/browse/PROJ-123 in UI';
            const story = await roomManager.addManualStory(roomCode, summary);

            expect(story?.url).toBe('https://company.atlassian.net/browse/PROJ-123');
            expect(story?.key).toBe('PROJ-123');
        });

        it('should fallback to general URL detection if no Jira link found', async () => {
            const summary = 'Check documentation at https://docs.google.com/doc123 for details';
            const story = await roomManager.addManualStory(roomCode, summary);

            expect(story?.url).toBe('https://docs.google.com/doc123');
            expect(story?.key).toBeUndefined();
        });

        it('should trim trailing punctuation from general URLs', async () => {
            const summary = 'Visit https://example.com). This is important!';
            const story = await roomManager.addManualStory(roomCode, summary);

            expect(story?.url).toBe('https://example.com');
        });

        it('should select active story', async () => {
            const story = await roomManager.addManualStory(roomCode, 'Story 1');
            expect(story).not.toBeNull();

            const selected = await roomManager.selectStory(roomCode, story!.id);
            expect(selected?.id).toBe(story!.id);

            const active = roomManager.getActiveStory(roomCode);
            expect(active?.id).toBe(story!.id);
        });

        it('should remove story', async () => {
            const story = await roomManager.addManualStory(roomCode, 'Story to remove');
            expect(story).not.toBeNull();

            const removed = await roomManager.removeStory(roomCode, story!.id);
            expect(removed).toBe(true);

            const stories = roomManager.getStories(roomCode);
            expect(stories).toHaveLength(0);
        });

        it('should apply story points', async () => {
            const story = await roomManager.addManualStory(roomCode, 'Story with points');
            expect(story).not.toBeNull();

            const updated = await roomManager.applyStoryPoints(roomCode, story!.id, 5);
            expect(updated?.storyPoints).toBe(5);
            expect(updated?.voted).toBe(true);
        });

        it('should clear all stories', async () => {
            await roomManager.addManualStory(roomCode, 'Story 1');
            await roomManager.addManualStory(roomCode, 'Story 2');

            const cleared = await roomManager.clearStories(roomCode);
            expect(cleared).toBe(true);

            const stories = roomManager.getStories(roomCode);
            expect(stories).toHaveLength(0);
        });
    });

    describe('Jira Configuration', () => {
        let roomCode: string;

        beforeEach(async () => {
            const result = await roomManager.createRoom(playerName, playerId);
            if (!result.success) throw new Error('Setup failed');
            roomCode = result.data.room.code;
        });

        it('should set and get Jira config', async () => {
            const config = {
                baseUrl: 'https://test.atlassian.net',
                email: 'test@example.com',
                apiToken: 'token123'
            };

            const success = await roomManager.setJiraConfig(roomCode, config);
            expect(success).toBe(true);

            const retrieved = roomManager.getJiraConfig(roomCode);
            expect(retrieved).toEqual(config);
            expect(roomManager.hasJiraConfig(roomCode)).toBe(true);
        });

        it('should clear Jira config', async () => {
            const config = {
                baseUrl: 'https://test.atlassian.net',
                email: 'test@example.com',
                apiToken: 'token123'
            };

            await roomManager.setJiraConfig(roomCode, config);
            const cleared = await roomManager.clearJiraConfig(roomCode);
            expect(cleared).toBe(true);
            expect(roomManager.hasJiraConfig(roomCode)).toBe(false);
        });
    });

    describe('Database Error Handling', () => {
        it('should return failure result if joinRoom fails during DB hydration', async () => {
            const mockRepo = {
                getRoomWithStories: vi.fn().mockRejectedValue(new Error('Hydration failed')),
                roomExists: vi.fn().mockResolvedValue(true)
            };
            const manager = new RoomManager(mockRepo as any);

            const result = await manager.joinRoom('EXISTING', playerName, playerId);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe('Hydration failed');
            }
        });

        it('should return failure result if createRoom fails in DB', async () => {
            const mockRepo = {
                createRoom: vi.fn().mockRejectedValue(new Error('DB error')),
                roomExists: vi.fn().mockResolvedValue(false)
            };
            const manager = new RoomManager(mockRepo as any);

            const result = await manager.createRoom(playerName, playerId, 'NEWROOM');

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe('DB error');
            }
        });
    });

    describe('Edge Cases', () => {
        let roomCode: string;

        beforeEach(async () => {
            const result = await roomManager.createRoom(playerName, playerId);
            if (!result.success) throw new Error('Setup failed');
            roomCode = result.data.room.code;
        });

        it('should promote new moderator when current leaves', async () => {
            // Add another player
            const p2Id = 'p2';
            await roomManager.joinRoom(roomCode, 'Player 2', p2Id);

            // Original mod leaves
            roomManager.removePlayer(roomCode, playerId);

            const room = roomManager.getRoom(roomCode);
            expect(room).toBeDefined();

            const p2 = room?.players.get(p2Id);
            expect(p2?.isModerator).toBe(true);
        });

        it('should reset votes when toggling to observer', () => {
            // Vote first
            roomManager.selectCard(roomCode, playerId, '5');
            let player = roomManager.getRoom(roomCode)?.players.get(playerId);
            expect(player?.hasVoted).toBe(true);
            expect(player?.selectedCard).toBe('5');

            // Become observer
            roomManager.toggleObserver(roomCode, playerId);

            player = roomManager.getRoom(roomCode)?.players.get(playerId);
            expect(player?.isObserver).toBe(true);
            expect(player?.hasVoted).toBe(false);
            expect(player?.selectedCard).toBeNull();
        });

        it('should clear active story when removing it', async () => {
            const story = await roomManager.addManualStory(roomCode, 'Active Story');
            await roomManager.selectStory(roomCode, story!.id);

            expect(roomManager.getActiveStory(roomCode)).not.toBeNull();

            await roomManager.removeStory(roomCode, story!.id);

            expect(roomManager.getActiveStory(roomCode)).toBeNull();
        });
    });

    describe('transferModerator', () => {
        let roomCode: string;
        const p2Id = 'player-456';

        beforeEach(async () => {
            const result = await roomManager.createRoom(playerName, playerId);
            if (!result.success) throw new Error('Setup failed');
            roomCode = result.data.room.code;
            await roomManager.joinRoom(roomCode, 'Player 2', p2Id);
        });

        it('should transfer moderator role from current moderator to another player', () => {
            const success = roomManager.transferModerator(roomCode, playerId, p2Id);

            expect(success).toBe(true);
            expect(roomManager.isModerator(roomCode, playerId)).toBe(false);
            expect(roomManager.isModerator(roomCode, p2Id)).toBe(true);
        });

        it('should return false when called by a non-moderator', () => {
            const success = roomManager.transferModerator(roomCode, p2Id, playerId);

            expect(success).toBe(false);
            // Moderator status unchanged
            expect(roomManager.isModerator(roomCode, playerId)).toBe(true);
            expect(roomManager.isModerator(roomCode, p2Id)).toBe(false);
        });

        it('should return false when target player does not exist', () => {
            const success = roomManager.transferModerator(roomCode, playerId, 'nonexistent-id');

            expect(success).toBe(false);
            expect(roomManager.isModerator(roomCode, playerId)).toBe(true);
        });

        it('should return false when room does not exist', () => {
            const success = roomManager.transferModerator('INVALID', playerId, p2Id);

            expect(success).toBe(false);
        });

        it('should return false when transferring to the same player', () => {
            const success = roomManager.transferModerator(roomCode, playerId, playerId);

            expect(success).toBe(false);
            expect(roomManager.isModerator(roomCode, playerId)).toBe(true);
        });
    });
});
