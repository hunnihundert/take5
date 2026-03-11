import { pgTable, varchar, timestamp, uuid, text, integer, boolean } from 'drizzle-orm/pg-core';

export const rooms = pgTable('rooms', {
    code: varchar('code', { length: 12 }).primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    activeStoryId: uuid('active_story_id'),
    // Jira config is intentionally not persisted - tokens should not be stored in the database
    // Users must re-configure Jira when rejoining a room
});

export const stories = pgTable('stories', {
    id: uuid('id').primaryKey().defaultRandom(),
    roomCode: varchar('room_code', { length: 12 }).notNull().references(() => rooms.code, { onDelete: 'cascade' }),
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
