import { pgTable, varchar, timestamp, uuid, text, integer, boolean } from 'drizzle-orm/pg-core';

export const rooms = pgTable('rooms', {
    code: varchar('code', { length: 6 }).primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    activeStoryId: uuid('active_story_id'),
    jiraBaseUrl: varchar('jira_base_url', { length: 255 }),
    jiraEmail: varchar('jira_email', { length: 255 }),
    jiraApiToken: varchar('jira_api_token', { length: 500 }),
    jiraStoryPointsFieldId: varchar('jira_story_points_field_id', { length: 100 }),
});

export const stories = pgTable('stories', {
    id: uuid('id').primaryKey().defaultRandom(),
    roomCode: varchar('room_code', { length: 6 }).notNull().references(() => rooms.code, { onDelete: 'cascade' }),
    key: varchar('key', { length: 50 }),
    summary: text('summary').notNull(),
    storyPoints: integer('story_points'),
    url: varchar('url', { length: 500 }),
    isManual: boolean('is_manual').notNull().default(true),
    voted: boolean('voted').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    position: integer('position').notNull().default(0),
});

export type RoomRecord = typeof rooms.$inferSelect;
export type StoryRecord = typeof stories.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;
export type NewStory = typeof stories.$inferInsert;
