import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import { DRIZZLE } from '../database/database.provider';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async findAll() {
    return this.db.query.user.findMany({
      orderBy: (u, { asc }) => [asc(u.name)],
    });
  }

  async findByProject(projectId: string) {
    const projectMembers = await this.db.query.projectMembers.findMany({
      where: eq(schema.projectMembers.projectId, projectId),
      with: {
        user: true,
      },
    });
    return projectMembers.map((m) => m.user);
  }

  async findAiUser() {
    const aiUser = await this.db.query.user.findFirst({
      where: eq(schema.user.isAi, true),
    });
    return aiUser;
  }

  async createAiUser() {
    const existing = await this.findAiUser();
    if (existing) return existing;

    const [newUser] = await this.db
      .insert(schema.user)
      .values({
        id: 'ai-gemini',
        name: 'Gemini AI',
        email: 'gemini@queenpm.ai',
        emailVerified: true,
        username: 'gemini',
        color: 'bg-gradient-to-br from-fuchsia-500 to-violet-600',
        isAi: true,
        role: 'developer',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newUser;
  }
}
