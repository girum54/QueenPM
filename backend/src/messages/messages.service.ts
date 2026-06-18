import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { DRIZZLE } from '../database/database.provider';
import { CreateMessageDto, UpdateMessageDto } from './dto/message.dto';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class MessagesService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async findAllByChannel(channelId: string) {
    return this.db.query.messages.findMany({
      where: eq(schema.messages.channelId, channelId),
      with: {
        author: true,
        channel: true,
        task: true,
      },
      orderBy: (m, { asc }) => [asc(m.createdAt)],
    });
  }

  async findOne(id: string) {
    const message = await this.db.query.messages.findFirst({
      where: eq(schema.messages.id, id),
      with: {
        author: true,
        channel: true,
        task: true,
      },
    });
    if (!message) throw new NotFoundException(`Message ${id} not found`);
    return message;
  }

  async create(dto: CreateMessageDto) {
    const [message] = await this.db
      .insert(schema.messages)
      .values({
        authorId: dto.authorId,
        channelId: dto.channelId,
        text: dto.text ?? null,
        pinned: dto.pinned ?? false,
        parentId: dto.parentId ?? null,
        taskRef: dto.taskRef ?? null,
      })
      .returning();
    return message;
  }

  async update(id: string, dto: UpdateMessageDto) {
    await this.findOne(id);
    const [updated] = await this.db
      .update(schema.messages)
      .set({
        ...(dto.text !== undefined && { text: dto.text }),
        ...(dto.pinned !== undefined && { pinned: dto.pinned }),
        ...(dto.taskRef !== undefined && { taskRef: dto.taskRef }),
      })
      .where(eq(schema.messages.id, id))
      .returning();
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.delete(schema.messages).where(eq(schema.messages.id, id));
    return { deleted: id };
  }
}
