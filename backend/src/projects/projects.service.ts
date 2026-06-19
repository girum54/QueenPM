import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { DRIZZLE } from '../database/database.provider';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class ProjectsService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async findAll() {
    const projects = await this.db.query.projects.findMany({
      with: {
        channels: true,
        sprints: true,
        members: { with: { user: true } },
      },
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    });
    return projects.map((p) => this.withMemberUsers(p));
  }

  async findOne(id: string) {
    const project = await this.db.query.projects.findFirst({
      where: eq(schema.projects.id, id),
      with: {
        channels: true,
        sprints: true,
        members: { with: { user: true } },
      },
    });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return this.withMemberUsers(project);
  }

  private withMemberUsers(project: {
    members?: { user: typeof schema.user.$inferSelect }[];
    [key: string]: unknown;
  }) {
    const { members, ...rest } = project;
    return {
      ...rest,
      members: members?.map((m) => m.user) ?? [],
    };
  }

  async create(dto: CreateProjectDto, currentUserId?: string) {
    const ownerId = dto.ownerId ?? currentUserId ?? null;
    const [project] = await this.db
      .insert(schema.projects)
      .values({
        name: dto.name,
        color: dto.color,
        ownerId,
      })
      .returning();

    if (ownerId) {
      await this.addMember(project.id, ownerId);
    }

    return this.findOne(project.id);
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
    return this.findOne(updated.id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.delete(schema.projects).where(eq(schema.projects.id, id));
    return { deleted: id };
  }

  async findMembers(projectId: string) {
    await this.findOne(projectId);
    const members = await this.db.query.projectMembers.findMany({
      where: eq(schema.projectMembers.projectId, projectId),
      with: { user: true },
    });
    return members.map((m) => m.user);
  }

  async addMember(projectId: string, userId: string) {
    await this.findOne(projectId);
    const existing = await this.db.query.projectMembers.findFirst({
      where: and(
        eq(schema.projectMembers.projectId, projectId),
        eq(schema.projectMembers.userId, userId),
      ),
    });
    if (existing) return existing;

    const [inserted] = await this.db
      .insert(schema.projectMembers)
      .values({ projectId, userId })
      .returning();
    return inserted;
  }

  async removeMember(projectId: string, userId: string) {
    await this.findOne(projectId);
    await this.db
      .delete(schema.projectMembers)
      .where(
        and(
          eq(schema.projectMembers.projectId, projectId),
          eq(schema.projectMembers.userId, userId),
        ),
      );
    return { deleted: true, projectId, userId };
  }
}
