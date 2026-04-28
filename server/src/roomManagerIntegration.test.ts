import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoomManager } from './roomManager';
import { RoomRepository } from './db/repository';

describe('RoomManager Integration with Repository', () => {
    let roomManager: RoomManager;
    let mockRepository: any;

    beforeEach(() => {
        mockRepository = {
            getRoomWithStories: vi.fn(),
            roomExists: vi.fn(),
            createRoom: vi.fn(),
            addStory: vi.fn(),
            removeStory: vi.fn(),
            setActiveStory: vi.fn(),
            updateStoryPoints: vi.fn(),
            clearStories: vi.fn(),
            setJiraConfig: vi.fn(),
            updateRoomCardValues: vi.fn(),
        };
        roomManager = new RoomManager(mockRepository as unknown as RoomRepository);
    });

    it('should hydrate room from repository on join if not in memory', async () => {
        const roomCode = 'HYDRATE1';
        const mockDbRoom = {
            code: roomCode,
            createdAt: new Date(),
            activeStoryId: 'story-123',
            jiraConfig: undefined,
            cardValues: ['XS', 'S', 'M', 'L', 'XL'],
            stories: [
                { id: 'story-123', summary: 'Hydrated Story', isManual: true, voted: false }
            ]
        };

        mockRepository.getRoomWithStories.mockResolvedValue(mockDbRoom);

        // Join room that is not in memory
        const result = await roomManager.joinRoom(roomCode, 'NewPlayer', 'player-id');

        expect(result.success).toBe(true);
        expect(mockRepository.getRoomWithStories).toHaveBeenCalledWith(roomCode);
        
        if (result.success) {
            expect(result.data.room.code).toBe(roomCode);
            expect(result.data.room.stories).toHaveLength(1);
            expect(result.data.room.stories[0].summary).toBe('Hydrated Story');
            expect(result.data.room.activeStoryId).toBe('story-123');
            expect(result.data.room.cardValues).toEqual(['XS', 'S', 'M', 'L', 'XL']);
        }
    });

    it('should persist new room to repository', async () => {
        mockRepository.roomExists.mockResolvedValue(false);
        mockRepository.createRoom.mockResolvedValue(undefined);

        const result = await roomManager.createRoom('Moderator', 'mod-id', 'NEWROOM');

        expect(result.success).toBe(true);
        expect(mockRepository.createRoom).toHaveBeenCalledWith('NEWROOM', expect.any(Array));
    });

    it('should persist new story to repository', async () => {
        // Create room first (in memory)
        mockRepository.roomExists.mockResolvedValue(false);
        await roomManager.createRoom('Moderator', 'mod-id', 'ROOM1');

        mockRepository.addStory.mockResolvedValue(undefined);

        const story = await roomManager.addManualStory('ROOM1', 'New Story');

        expect(story).not.toBeNull();
        expect(mockRepository.addStory).toHaveBeenCalledWith('ROOM1', expect.objectContaining({
            summary: 'New Story'
        }));
    });
});
