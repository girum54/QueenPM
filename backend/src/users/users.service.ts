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
}
