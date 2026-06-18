import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { DRIZZLE } from '../database/database.provider';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class TasksService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async findAll(projectId?: string, sprintId?: string) {
    return this.db.query.tasks.findMany({
      where: and(
        ...(projectId ? [eq(schema.tasks.projectId, projectId)] : []),
        ...(sprintId ? [eq(schema.tasks.sprintId, sprintId)] : []),
      ),
      with: {
        assignee: true,
        project: true,
        sprint: true,
      },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  }

  async findOne(id: string) {
    const task = await this.db.query.tasks.findFirst({
      where: eq(schema.tasks.id, id),
      with: {
        assignee: true,
        project: true,
        sprint: true,
        subtasks: true,
        parent: true,
      },
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  async create(dto: CreateTaskDto) {
    const [task] = await this.db
      .insert(schema.tasks)
      .values({
        title: dto.title,
        description: dto.description ?? null,
        assigneeId: dto.assigneeId ?? null,
        priority: dto.priority ?? 'medium',
        column: dto.column ?? 'new',
        createdBy: dto.createdBy ?? 'ui',
        originMessageId: dto.originMessageId ?? null,
        originChannelId: dto.originChannelId ?? null,
        projectId: dto.projectId ?? null,
        sprintId: dto.sprintId ?? null,
        parentId: dto.parentId ?? null,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        estimateDays: dto.estimateDays ?? null,
      })
      .returning();
    return task;
  }

  async update(id: string, dto: UpdateTaskDto) {
    await this.findOne(id);
    const [updated] = await this.db
      .update(schema.tasks)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.assigneeId !== undefined && { assigneeId: dto.assigneeId }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.column !== undefined && { column: dto.column }),
        ...(dto.createdBy !== undefined && { createdBy: dto.createdBy }),
        ...(dto.sprintId !== undefined && { sprintId: dto.sprintId }),
        ...(dto.completedAt !== undefined && { completedAt: dto.completedAt ? new Date(dto.completedAt) : null }),
        ...(dto.deadline !== undefined && { deadline: dto.deadline ? new Date(dto.deadline) : null }),
        ...(dto.estimateDays !== undefined && { estimateDays: dto.estimateDays }),
      })
      .where(eq(schema.tasks.id, id))
      .returning();
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.delete(schema.tasks).where(eq(schema.tasks.id, id));
    return { deleted: id };
  }
}
