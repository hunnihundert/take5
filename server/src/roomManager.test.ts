import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoomManager } from './roomManager';
import { CardValue, Story } from '@taking5/shared';

// Mock logger to avoid console spam during tests
vi.mock('./utils/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    }
}));

describe('RoomManager', () => {
    let roomManager: RoomManager;
    let playerId: string;
    let playerName: string;

    beforeEach(() => {
        roomManager = new RoomManager();
        playerId = 'player-123';
        playerName = 'TestPlayer';
    });

    describe('createRoom', () => {
        it('should create a room and return room and player data', () => {
            const result = roomManager.createRoom(playerName, playerId);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.room).toBeDefined();
                expect(result.data.room.code).toHaveLength(6);
                expect(result.data.room.players.size).toBe(1);
                expect(result.data.player.id).toBe(playerId);
                expect(result.data.player.isModerator).toBe(true);
            }
        });
    });

    describe('joinRoom', () => {
        it('should successfully join an existing room', () => {
            const createResult = roomManager.createRoom('Host', 'host-id');
            if (!createResult.success) throw new Error('Setup failed');
            const roomCode = createResult.data.room.code;

            const joinResult = roomManager.joinRoom(roomCode, playerName, playerId);

            expect(joinResult.success).toBe(true);
            if (joinResult.success) {
                expect(joinResult.data.room.players.size).toBe(2);
                expect(joinResult.data.player.id).toBe(playerId);
                expect(joinResult.data.player.isModerator).toBe(false);
            }
        });

        it('should fail if room code does not exist', () => {
            const result = roomManager.joinRoom('INVALID', playerName, playerId);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe('Raum nicht gefunden');
            }
        });

        it('should fail if player name already exists (case insensitive)', () => {
            const createResult = roomManager.createRoom('ExistingName', 'host-id');
            if (!createResult.success) throw new Error('Setup failed');
            const roomCode = createResult.data.room.code;

            const result = roomManager.joinRoom(roomCode, 'existingname', playerId);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe('Dieser Name wird bereits verwendet');
            }
        });
    });

    describe('Game Logic', () => {
        let roomCode: string;

        beforeEach(() => {
            const result = roomManager.createRoom(playerName, playerId);
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

        beforeEach(() => {
            const result = roomManager.createRoom(playerName, playerId);
            if (!result.success) throw new Error('Setup failed');
            roomCode = result.data.room.code;
        });

        it('should add manual story', () => {
            const storySummary = 'New Feature';
            const story = roomManager.addManualStory(roomCode, storySummary);

            expect(story).toBeDefined();
            expect(story?.summary).toBe(storySummary);
            expect(story?.isManual).toBe(true);

            const stories = roomManager.getStories(roomCode);
            expect(stories).toHaveLength(1);
        });

        it('should select active story', () => {
            const story = roomManager.addManualStory(roomCode, 'Story 1');
            expect(story).not.toBeNull();

            const selected = roomManager.selectStory(roomCode, story!.id);
            expect(selected?.id).toBe(story!.id);

            const active = roomManager.getActiveStory(roomCode);
            expect(active?.id).toBe(story!.id);
        });
    });
});
