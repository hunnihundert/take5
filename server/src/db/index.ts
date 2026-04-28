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

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Create tables if they don't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS rooms (
                code VARCHAR(12) PRIMARY KEY,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                active_story_id UUID
            )
        `);

        // Add card_values column if not present (idempotent — no-op on existing DBs)
        await client.query(`
            ALTER TABLE rooms ADD COLUMN IF NOT EXISTS card_values JSONB
        `);

        // Ensure code column is VARCHAR(12) if table already existed with VARCHAR(6)
        // Check current length to avoid redundant ALTER TABLE
        const roomsCodeRes = await client.query(`
            SELECT character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'rooms' AND column_name = 'code'
        `);
        
        if (roomsCodeRes.rows.length > 0 && (roomsCodeRes.rows[0].character_maximum_length || 0) < 12) {
            await client.query(`ALTER TABLE rooms ALTER COLUMN code TYPE VARCHAR(12);`);
            console.log('Migrated rooms.code to VARCHAR(12)');
        }

        await client.query(`
            CREATE TABLE IF NOT EXISTS stories (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                room_code VARCHAR(12) NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
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

        // Ensure room_code column is VARCHAR(12) if table already existed with VARCHAR(6)
        const storiesRoomCodeRes = await client.query(`
            SELECT character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'stories' AND column_name = 'room_code'
        `);

        if (storiesRoomCodeRes.rows.length > 0 && (storiesRoomCodeRes.rows[0].character_maximum_length || 0) < 12) {
            await client.query(`ALTER TABLE stories ALTER COLUMN room_code TYPE VARCHAR(12);`);
            console.log('Migrated stories.room_code to VARCHAR(12)');
        }

        await client.query('COMMIT');
        console.log('Database schema synchronized');
    } catch (error: unknown) {
        await client.query('ROLLBACK');
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to synchronize database schema:', message);
        throw error;
    } finally {
        client.release();
    }
}

export async function closeDatabase(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
        db = null;
    }
}

export { schema };
