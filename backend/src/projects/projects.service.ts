import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { DRIZZLE } from '../database/database.provider';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class ProjectsService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async findAll() {
    return this.db.query.projects.findMany({
      with: {
        channels: true,
        sprints: true,
      },
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    });
  }

  async findOne(id: string) {
    const project = await this.db.query.projects.findFirst({
      where: eq(schema.projects.id, id),
      with: {
        channels: true,
        sprints: true,
      },
    });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return project;
  }

  async create(dto: CreateProjectDto) {
    const [project] = await this.db
      .insert(schema.projects)
      .values({
        name: dto.name,
        color: dto.color,
        ownerId: dto.ownerId ?? null,
      })
      .returning();
    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.findOne(id);
    const [updated] = await this.db
      .update(schema.projects)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.ownerId !== undefined && { ownerId: dto.ownerId }),
      })
      .where(eq(schema.projects.id, id))
      .returning();
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.delete(schema.projects).where(eq(schema.projects.id, id));
    return { deleted: id };
  }
}
