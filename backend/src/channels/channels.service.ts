import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { DRIZZLE } from '../database/database.provider';
import { CreateChannelDto, UpdateChannelDto } from './dto/channel.dto';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class ChannelsService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async findAllByProject(projectId: string) {
    return this.db.query.channels.findMany({
      where: eq(schema.channels.projectId, projectId),
      orderBy: (c, { asc }) => [asc(c.name)],
    });
  }

  async findOne(id: string) {
    const channel = await this.db.query.channels.findFirst({
      where: eq(schema.channels.id, id),
    });
    if (!channel) throw new NotFoundException(`Channel ${id} not found`);
    return channel;
  }

  async create(dto: CreateChannelDto) {
    const [channel] = await this.db
      .insert(schema.channels)
      .values({
        name: dto.name,
        projectId: dto.projectId,
        aiActive: dto.aiActive ?? false,
      })
      .returning();
    return channel;
  }

  async update(id: string, dto: UpdateChannelDto) {
    await this.findOne(id);
    const [updated] = await this.db
      .update(schema.channels)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.projectId !== undefined && { projectId: dto.projectId }),
        ...(dto.aiActive !== undefined && { aiActive: dto.aiActive }),
      })
      .where(eq(schema.channels.id, id))
      .returning();
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.delete(schema.channels).where(eq(schema.channels.id, id));
    return { deleted: id };
  }
}
