import { eq, asc } from 'drizzle-orm';
import { getDb, isDatabaseEnabled } from './index';
import { rooms, stories, RoomRecord, StoryRecord, NewRoom, NewStory } from './schema';
import { Story, JiraConfig } from '../types';
import { logger } from '../utils/logger';

export class DatabaseError extends Error {
    constructor(message: string, public code?: string) {
        super(message);
        this.name = 'DatabaseError';
    }
}

export interface DbRoom {
    code: string;
    createdAt: Date;
    activeStoryId: string | null;
    jiraConfig: JiraConfig | undefined;
    stories: Story[];
}

export class RoomRepository {
    private handleError(error: unknown, operation: string): never {
        logger.error(`Database error during ${operation}:`, error);
        
        // Handle Postgres unique_violation error specifically if needed by caller
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
            throw new DatabaseError('Ein Eintrag mit diesem Schlüssel existiert bereits.', '23505');
        }
        
        // Sanitize message for the user but keep it informative
        throw new DatabaseError('Datenbank-Fehler. Bitte versuche es später erneut.');
    }

    async createRoom(code: string): Promise<void> {
        if (!isDatabaseEnabled()) return;

        try {
            const db = getDb();
            await db.insert(rooms).values({
                code,
            });
        } catch (error: unknown) {
            this.handleError(error, 'createRoom');
        }
    }

    async getRoomWithStories(code: string): Promise<DbRoom | null> {
        if (!isDatabaseEnabled()) return null;

        try {
            const db = getDb();

            const roomRecord = await db.query.rooms.findFirst({
                where: eq(rooms.code, code),
            });

            if (!roomRecord) return null;

            const storyRecords = await db.query.stories.findMany({
                where: eq(stories.roomCode, code),
                orderBy: [asc(stories.position), asc(stories.createdAt)],
            });

            return this.hydrateRoom(roomRecord, storyRecords);
        } catch (error: unknown) {
            this.handleError(error, 'getRoomWithStories');
        }
    }

    async roomExists(code: string): Promise<boolean> {
        if (!isDatabaseEnabled()) return false;

        try {
            const db = getDb();
            const result = await db.query.rooms.findFirst({
                where: eq(rooms.code, code),
                columns: { code: true },
            });

            return result !== undefined;
        } catch (error: unknown) {
            this.handleError(error, 'roomExists');
        }
    }

    async addStory(roomCode: string, story: Story): Promise<void> {
        if (!isDatabaseEnabled()) return;

        try {
            const db = getDb();

            // Get current max position
            const existingStories = await db.query.stories.findMany({
                where: eq(stories.roomCode, roomCode),
                columns: { position: true },
                orderBy: [asc(stories.position)],
            });

            const maxPosition = existingStories.length > 0
                ? Math.max(...existingStories.map(s => s.position))
                : -1;

            await db.insert(stories).values({
                id: story.id,
                roomCode,
                key: story.key,
                summary: story.summary,
                storyPoints: story.storyPoints,
                url: story.url,
                isManual: story.isManual,
                voted: story.voted,
                position: maxPosition + 1,
            });
        } catch (error: unknown) {
            this.handleError(error, 'addStory');
        }
    }

    async removeStory(storyId: string): Promise<void> {
        if (!isDatabaseEnabled()) return;

        try {
            const db = getDb();
            await db.delete(stories).where(eq(stories.id, storyId));
        } catch (error: unknown) {
            this.handleError(error, 'removeStory');
        }
    }

    async updateStoryPoints(storyId: string, points: number): Promise<void> {
        if (!isDatabaseEnabled()) return;

        try {
            const db = getDb();
            await db.update(stories)
                .set({ storyPoints: points, voted: true })
                .where(eq(stories.id, storyId));
        } catch (error: unknown) {
            this.handleError(error, 'updateStoryPoints');
        }
    }

    async clearStories(roomCode: string): Promise<void> {
        if (!isDatabaseEnabled()) return;

        try {
            const db = getDb();
            await db.delete(stories).where(eq(stories.roomCode, roomCode));
        } catch (error: unknown) {
            this.handleError(error, 'clearStories');
        }
    }

    async setActiveStory(roomCode: string, storyId: string | null): Promise<void> {
        if (!isDatabaseEnabled()) return;

        try {
            const db = getDb();
            await db.update(rooms)
                .set({ activeStoryId: storyId })
                .where(eq(rooms.code, roomCode));
        } catch (error: unknown) {
            this.handleError(error, 'setActiveStory');
        }
    }

    async setJiraConfig(_roomCode: string, _config: JiraConfig | undefined): Promise<void> {
        // Jira config is intentionally not persisted to avoid storing API tokens in the database
        // Config is kept in-memory only and must be re-entered when rejoining a room
        return;
    }

    private hydrateRoom(room: RoomRecord, storyRecords: StoryRecord[]): DbRoom {
        const storyList: Story[] = storyRecords.map(s => ({
            id: s.id,
            key: s.key ?? undefined,
            summary: s.summary,
            storyPoints: s.storyPoints ?? undefined,
            url: s.url ?? undefined,
            isManual: s.isManual,
            voted: s.voted,
        }));

        // Jira config is not persisted (security: no tokens in DB)
        // Users must re-configure Jira when rejoining a room
        return {
            code: room.code,
            createdAt: room.createdAt,
            activeStoryId: room.activeStoryId,
            jiraConfig: undefined,
            stories: storyList,
        };
    }
}
