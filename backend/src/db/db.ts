import { drizzle } from 'drizzle-orm/postgres-js';
import * as postgres from 'postgres';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

export const queryClient = postgres(databaseUrl, {
  ssl: { rejectUnauthorized: false },
  idle_timeout: 20,
  max_lifetime: 60 * 30,
  keep_alive: 15,
});
export const db = drizzle(queryClient, { schema });
