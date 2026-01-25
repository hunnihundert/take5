import { eq, asc } from 'drizzle-orm';
import { getDb, isDatabaseEnabled } from './index';
import { rooms, stories, RoomRecord, StoryRecord, NewRoom, NewStory } from './schema';
import { Story, JiraConfig } from '../types';

export interface DbRoom {
    code: string;
    createdAt: Date;
    activeStoryId: string | null;
    jiraConfig: JiraConfig | undefined;
    stories: Story[];
}

export class RoomRepository {
    async createRoom(code: string): Promise<void> {
        if (!isDatabaseEnabled()) return;

        const db = getDb();
        await db.insert(rooms).values({
            code,
        });
    }

    async getRoomWithStories(code: string): Promise<DbRoom | null> {
        if (!isDatabaseEnabled()) return null;

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
    }

    async roomExists(code: string): Promise<boolean> {
        if (!isDatabaseEnabled()) return false;

        const db = getDb();
        const result = await db.query.rooms.findFirst({
            where: eq(rooms.code, code),
            columns: { code: true },
        });

        return result !== undefined;
    }

    async addStory(roomCode: string, story: Story): Promise<void> {
        if (!isDatabaseEnabled()) return;

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
    }

    async removeStory(storyId: string): Promise<void> {
        if (!isDatabaseEnabled()) return;

        const db = getDb();
        await db.delete(stories).where(eq(stories.id, storyId));
    }

    async updateStoryPoints(storyId: string, points: number): Promise<void> {
        if (!isDatabaseEnabled()) return;

        const db = getDb();
        await db.update(stories)
            .set({ storyPoints: points, voted: true })
            .where(eq(stories.id, storyId));
    }

    async clearStories(roomCode: string): Promise<void> {
        if (!isDatabaseEnabled()) return;

        const db = getDb();
        await db.delete(stories).where(eq(stories.roomCode, roomCode));
    }

    async setActiveStory(roomCode: string, storyId: string | null): Promise<void> {
        if (!isDatabaseEnabled()) return;

        const db = getDb();
        await db.update(rooms)
            .set({ activeStoryId: storyId })
            .where(eq(rooms.code, roomCode));
    }

    async setJiraConfig(roomCode: string, config: JiraConfig | undefined): Promise<void> {
        if (!isDatabaseEnabled()) return;

        const db = getDb();

        if (config) {
            await db.update(rooms)
                .set({
                    jiraBaseUrl: config.baseUrl,
                    jiraEmail: config.email,
                    jiraApiToken: config.apiToken,
                    jiraStoryPointsFieldId: config.storyPointsFieldId,
                })
                .where(eq(rooms.code, roomCode));
        } else {
            await db.update(rooms)
                .set({
                    jiraBaseUrl: null,
                    jiraEmail: null,
                    jiraApiToken: null,
                    jiraStoryPointsFieldId: null,
                })
                .where(eq(rooms.code, roomCode));
        }
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

        const jiraConfig: JiraConfig | undefined = room.jiraBaseUrl && room.jiraEmail && room.jiraApiToken
            ? {
                baseUrl: room.jiraBaseUrl,
                email: room.jiraEmail,
                apiToken: room.jiraApiToken,
                storyPointsFieldId: room.jiraStoryPointsFieldId ?? undefined,
            }
            : undefined;

        return {
            code: room.code,
            createdAt: room.createdAt,
            activeStoryId: room.activeStoryId,
            jiraConfig,
            stories: storyList,
        };
    }
}
