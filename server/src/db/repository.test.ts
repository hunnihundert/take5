import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoomRepository } from './repository';
import { setTestDb } from './index';

describe('RoomRepository', () => {
    let repository: RoomRepository;
    let mockDb: any;

    beforeEach(() => {
        mockDb = {
            insert: vi.fn().mockReturnValue({
                values: vi.fn().mockResolvedValue({}),
            }),
            query: {
                rooms: {
                    findFirst: vi.fn(),
                },
                stories: {
                    findFirst: vi.fn(),
                    findMany: vi.fn(),
                },
            },
            update: vi.fn().mockReturnValue({
                set: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue({}),
                }),
            }),
            delete: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue({}),
            }),
        };
        setTestDb(mockDb);
        repository = new RoomRepository();
    });

    it('should call insert when creating a room', async () => {
        await repository.createRoom('TEST1');
        expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should call findFirst when checking if a room exists', async () => {
        mockDb.query.rooms.findFirst.mockResolvedValue({ code: 'TEST1' });
        const exists = await repository.roomExists('TEST1');
        expect(exists).toBe(true);
        expect(mockDb.query.rooms.findFirst).toHaveBeenCalled();
    });

    it('should return null if room does not exist', async () => {
        mockDb.query.rooms.findFirst.mockResolvedValue(undefined);
        const room = await repository.getRoomWithStories('NONE');
        expect(room).toBeNull();
    });

    it('should hydrate room with stories', async () => {
        const mockRoom = {
            code: 'ROOM1',
            createdAt: new Date(),
            activeStoryId: 'story-1',
        };
        const mockStories = [
            {
                id: 'story-1',
                summary: 'Story 1',
                isManual: true,
                voted: false,
                position: 0,
            }
        ];

        mockDb.query.rooms.findFirst.mockResolvedValue(mockRoom);
        mockDb.query.stories.findMany.mockResolvedValue(mockStories);

        const room = await repository.getRoomWithStories('ROOM1');
        
        expect(room).toBeDefined();
        expect(room?.code).toBe('ROOM1');
        expect(room?.stories).toHaveLength(1);
        expect(room?.stories[0].summary).toBe('Story 1');
        expect(room?.activeStoryId).toBe('story-1');
    });
});
