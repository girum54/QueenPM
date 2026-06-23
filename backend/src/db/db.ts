import { drizzle } from 'drizzle-orm/postgres-js';
import * as postgres from 'postgres';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

export const queryClient = postgres(databaseUrl, {
  ssl: { rejectUnauthorized: false },
  idle_timeout: 30, // Close idle connections after 30 seconds of inactivity
  max_lifetime: 60 * 3, // Recreate connections every 3 minutes to avoid stale sockets
  keep_alive: null, // Disable TCP keep-alive probes to prevent half-open sockets from persisting
});
export const db = drizzle(queryClient, { schema });
