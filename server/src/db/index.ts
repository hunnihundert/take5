import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let pool: Pool | null = null;

export function setTestDb(testDb: any) {
    db = testDb;
}

export function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

export async function initDatabase(): Promise<void> {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.log('DATABASE_URL not set - running without persistence');
        return;
    }

    pool = new Pool({
        connectionString,
        max: 10,
    });

    db = drizzle(pool, { schema });

    // Test connection
    await pool.query('SELECT 1');
    console.log('Database connected successfully');
}

export function isDatabaseEnabled(): boolean {
    return db !== null;
}

export async function syncSchema(): Promise<void> {
    if (!db || !pool) return;

    // Create tables if they don't exist
    await pool.query(`
        CREATE TABLE IF NOT EXISTS rooms (
            code VARCHAR(6) PRIMARY KEY,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            active_story_id UUID
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS stories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            room_code VARCHAR(6) NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
            key VARCHAR(50),
            summary TEXT NOT NULL,
            story_points INTEGER,
            url VARCHAR(500),
            is_manual BOOLEAN NOT NULL DEFAULT TRUE,
            voted BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            position INTEGER NOT NULL DEFAULT 0
        )
    `);

    console.log('Database schema synchronized');
}

export async function closeDatabase(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
        db = null;
    }
}

export { schema };
