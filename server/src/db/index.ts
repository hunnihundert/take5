import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let pool: Pool | null = null;

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

export async function closeDatabase(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
        db = null;
    }
}

export { schema };
