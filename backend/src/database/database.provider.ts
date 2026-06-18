import { drizzle } from 'drizzle-orm/postgres-js';
import * as postgres from 'postgres';
import * as schema from '../db/schema';

export const DRIZZLE = 'DRIZZLE';

export const databaseProviders = [
  {
    provide: DRIZZLE,
    useFactory: async () => {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL is not set');
      }
      const queryClient = postgres(databaseUrl);
      return drizzle(queryClient, { schema });
    },
  },
];
