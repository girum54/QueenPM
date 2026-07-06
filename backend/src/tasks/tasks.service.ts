import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { DRIZZLE } from '../database/database.provider';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { NotificationsService } from '../notifications/notifications.service';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class TasksService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly notificationsService: NotificationsService,
  ) {}

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

  private async assertAssigneeAllowed(
    actingUserId: string,
    assigneeId: string | null | undefined,
    projectId: string | null | undefined,
  ) {
    if (!assigneeId || assigneeId === actingUserId) return;

    if (!projectId) {
      throw new ForbiddenException(
        'Only the project manager can assign tasks to other users',
      );
    }

    const project = await this.db.query.projects.findFirst({
      where: eq(schema.projects.id, projectId),
    });
    if (!project) throw new NotFoundException('Project not found');

    if (project.ownerId !== actingUserId) {
      throw new ForbiddenException(
        'Only the project manager can assign tasks to other users',
      );
    }
  }

  async create(dto: CreateTaskDto, actingUserId: string) {
    await this.assertAssigneeAllowed(
      actingUserId,
      dto.assigneeId,
      dto.projectId,
    );

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

    // Notify assignee if different from creator
    if (task.assigneeId && task.assigneeId !== actingUserId) {
      await this.notificationsService.push({
        recipientId: task.assigneeId,
        actorId: actingUserId,
        type: 'task_assigned',
        title: 'You were assigned a task',
        body: task.title,
        projectId: task.projectId,
        taskId: task.id,
      });
    }

    // Broadcast task creation for real-time board synchronization
    this.notificationsService.broadcast(
      'task_added',
      'Task Created',
      JSON.stringify({ action: 'create', task }),
      task.projectId,
    );

    return task;
  }

  async update(id: string, dto: UpdateTaskDto, actingUserId: string) {
    const existing = await this.findOne(id);

    if (dto.assigneeId !== undefined) {
      await this.assertAssigneeAllowed(
        actingUserId,
        dto.assigneeId,
        existing.projectId,
      );
    }

    // Auto-stamp completedAt when moving to 'deployed', clear it when moving back
    const columnCompletedAt =
      dto.column === 'deployed' && existing.column !== 'deployed'
        ? new Date()
        : dto.column !== undefined && dto.column !== 'deployed' && existing.column === 'deployed'
          ? null
          : undefined; // no change — leave existing value

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
        // Use auto-derived value if column changed, otherwise honour explicit client value
        ...(columnCompletedAt !== undefined
          ? { completedAt: columnCompletedAt }
          : dto.completedAt !== undefined && { completedAt: dto.completedAt ? new Date(dto.completedAt) : null }),
        ...(dto.deadline !== undefined && {
          deadline: dto.deadline ? new Date(dto.deadline) : null,
        }),
        ...(dto.estimateDays !== undefined && { estimateDays: dto.estimateDays }),
      })
      .where(eq(schema.tasks.id, id))
      .returning();


    // Notify on assignee change
    if (
      dto.assigneeId &&
      dto.assigneeId !== existing.assigneeId &&
      dto.assigneeId !== actingUserId
    ) {
      await this.notificationsService.push({
        recipientId: dto.assigneeId,
        actorId: actingUserId,
        type: 'task_assigned',
        title: 'You were assigned a task',
        body: updated.title,
        projectId: updated.projectId,
        taskId: updated.id,
      });
    }

    // Notify task creator when task is deployed
    if (
      dto.column === 'deployed' &&
      existing.column !== 'deployed' &&
      existing.assigneeId &&
      existing.assigneeId !== actingUserId
    ) {
      await this.notificationsService.push({
        recipientId: existing.assigneeId,
        actorId: actingUserId,
        type: 'task_moved',
        title: 'Your task was deployed! 🚀',
        body: updated.title,
        projectId: updated.projectId,
        taskId: updated.id,
      });
    }

    // Broadcast task update for real-time board synchronization
    this.notificationsService.broadcast(
      'task_moved',
      'Task Updated',
      JSON.stringify({ action: 'update', task: updated }),
      updated.projectId,
    );

    return updated;
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    await this.db.delete(schema.tasks).where(eq(schema.tasks.id, id));

    // Broadcast task deletion for real-time board synchronization
    this.notificationsService.broadcast(
      'task_moved',
      'Task Deleted',
      JSON.stringify({ action: 'delete', taskId: id }),
      existing.projectId,
    );

    return { deleted: id };
  }
}
