import {
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import * as schema from '../db/schema';
import { DRIZZLE } from '../database/database.provider';

type Db = NodePgDatabase<typeof schema>;

export type NotificationType =
  | 'task_assigned'
  | 'task_moved'
  | 'mentioned'
  | 'sprint_started'
  | 'sprint_completed'
  | 'task_added';

export interface CreateNotificationDto {
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  body?: string;
  projectId?: string | null;
  taskId?: string | null;
}

export interface NotificationPayload {
  id: string;
  recipientId: string;
  actorId: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  projectId: string | null;
  taskId: string | null;
  read: boolean;
  createdAt: Date;
}

@Injectable()
export class NotificationsService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  // In-memory SSE bus — Subject streams to all subscribers
  private readonly events$ = new Subject<NotificationPayload>();

  /** Internal method used by other services to fire a notification */
  async push(dto: CreateNotificationDto): Promise<void> {
    const [notif] = await this.db
      .insert(schema.notifications)
      .values({
        recipientId: dto.recipientId,
        actorId: dto.actorId ?? null,
        type: dto.type,
        title: dto.title,
        body: dto.body ?? null,
        projectId: dto.projectId ?? null,
        taskId: dto.taskId ?? null,
      })
      .returning();

    // Emit to SSE stream
    this.events$.next(notif as NotificationPayload);
  }

  /** Get SSE stream for a specific user */
  streamForUser(userId: string) {
    return this.events$.pipe(
      filter((n) => n.recipientId === userId),
      map((n) => ({ data: n })),
    );
  }

  /** Get all notifications for a user (unread first) */
  async findAllForUser(userId: string) {
    return this.db.query.notifications.findMany({
      where: eq(schema.notifications.recipientId, userId),
      orderBy: [
        // unread first, then newest
        desc(schema.notifications.read),
        desc(schema.notifications.createdAt),
      ],
      limit: 50,
    });
  }

  /** Mark a single notification as read */
  async markRead(id: string, userId: string) {
    const existing = await this.db.query.notifications.findFirst({
      where: and(
        eq(schema.notifications.id, id),
        eq(schema.notifications.recipientId, userId),
      ),
    });
    if (!existing) throw new NotFoundException(`Notification ${id} not found`);

    const [updated] = await this.db
      .update(schema.notifications)
      .set({ read: true })
      .where(eq(schema.notifications.id, id))
      .returning();
    return updated;
  }

  /** Mark all notifications for a user as read */
  async markAllRead(userId: string) {
    await this.db
      .update(schema.notifications)
      .set({ read: true })
      .where(eq(schema.notifications.recipientId, userId));
    return { success: true };
  }

  /** Delete a single notification */
  async remove(id: string, userId: string) {
    await this.db
      .delete(schema.notifications)
      .where(
        and(
          eq(schema.notifications.id, id),
          eq(schema.notifications.recipientId, userId),
        ),
      );
    return { deleted: id };
  }
}
