import { drizzle } from 'drizzle-orm/postgres-js';
import * as postgres from 'postgres';
import * as schema from '../db/schema';
import { ConfigService } from '@nestjs/config';

export const DRIZZLE = 'DRIZZLE';

export const databaseProviders = [
  {
    provide: DRIZZLE,
    inject: [ConfigService],
    useFactory: async (configService: ConfigService) => {
      const databaseUrl = configService.get<string>('DATABASE_URL');
      if (!databaseUrl) {
        throw new Error('DATABASE_URL is not set');
      }
      const queryClient = postgres(databaseUrl);
      return drizzle(queryClient, { schema });
    },
  },
];

