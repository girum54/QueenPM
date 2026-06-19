import { ConfigService } from '@nestjs/config';
import { count } from 'drizzle-orm';
import { db } from '../db/db';
import * as schema from '../db/schema';

export const DRIZZLE = 'DRIZZLE';

export const databaseProviders = [
  {
    provide: DRIZZLE,
    inject: [ConfigService],
    useFactory: async (configService: ConfigService) => {

      // Auto-seed default users if empty
      try {
        const [userCount] = await db.select({ val: count() }).from(schema.user);
        if (userCount.val === 0) {
          console.log('Database user table is empty. Seeding default users...');
          await db.insert(schema.user).values([
            {
              id: 'u1',
              name: 'Mira Chen',
              email: 'mira@queenpm.dev',
              emailVerified: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              username: '@mira',
              color: 'bg-rose-500',
              isAi: false,
            },
            {
              id: 'u2',
              name: 'Daniel Park',
              email: 'dan@queenpm.dev',
              emailVerified: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              username: '@dan',
              color: 'bg-amber-500',
              isAi: false,
            },
            {
              id: 'u3',
              name: 'Sofia Reyes',
              email: 'sofia@queenpm.dev',
              emailVerified: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              username: '@sofia',
              color: 'bg-emerald-500',
              isAi: false,
            },
            {
              id: 'u4',
              name: 'Kai Tanaka',
              email: 'kai@queenpm.dev',
              emailVerified: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              username: '@kai',
              color: 'bg-sky-500',
              isAi: false,
            },
            {
              id: 'uq',
              name: 'Queen PM',
              email: 'queen@queenpm.dev',
              emailVerified: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              username: '@queen',
              color: 'bg-gradient-to-br from-fuchsia-500 to-violet-600',
              isAi: true,
            },
            {
              id: 'me',
              name: 'You',
              email: 'me@queenpm.dev',
              emailVerified: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              username: '@you',
              color: 'bg-slate-500',
              isAi: false,
            },
          ]);
          console.log('Seeding completed successfully!');
        }
      } catch (err) {
        console.error('Error during auto-seeding:', err);
      }

      return db;
    },
  },
];

