import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { DRIZZLE } from '../database/database.provider';
import { CreateBoardDto, UpdateBoardDto } from './dto/board.dto';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class BoardsService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async findByProject(projectId: string) {
    return this.db.query.boards.findMany({
      where: eq(schema.boards.projectId, projectId),
      with: { sprint: { with: { deliverables: true } } },
      orderBy: (b, { desc }) => [desc(b.createdAt)],
    });
  }

  async findOne(id: string) {
    const board = await this.db.query.boards.findFirst({
      where: eq(schema.boards.id, id),
      with: { sprint: { with: { deliverables: true } } },
    });
    if (!board) throw new NotFoundException(`Board ${id} not found`);
    return board;
  }

  async findBySprint(sprintId: string) {
    const board = await this.db.query.boards.findFirst({
      where: eq(schema.boards.sprintId, sprintId),
      with: { sprint: true },
    });
    if (!board) throw new NotFoundException(`No board found for sprint ${sprintId}`);
    return board;
  }

  async create(dto: CreateBoardDto) {
    // Enforce 1-to-1: check no board already exists for this sprint
    const existing = await this.db.query.boards.findFirst({
      where: eq(schema.boards.sprintId, dto.sprintId),
    });
    if (existing) {
      throw new ConflictException(`A board already exists for sprint ${dto.sprintId}`);
    }

    // Fetch sprint name for auto-naming the board
    const sprint = await this.db.query.sprints.findFirst({
      where: eq(schema.sprints.id, dto.sprintId),
    });
    if (!sprint) throw new NotFoundException(`Sprint ${dto.sprintId} not found`);

    const boardName = dto.name ?? `Sprint Board — ${sprint.name}`;

    const [board] = await this.db
      .insert(schema.boards)
      .values({
        sprintId: dto.sprintId,
        projectId: dto.projectId,
        name: boardName,
      })
      .returning();
    return board;
  }

  async update(id: string, dto: UpdateBoardDto) {
    await this.findOne(id); // guard
    const [updated] = await this.db
      .update(schema.boards)
      .set({ ...(dto.name !== undefined && { name: dto.name }) })
      .where(eq(schema.boards.id, id))
      .returning();
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id); // guard
    await this.db.delete(schema.boards).where(eq(schema.boards.id, id));
    return { deleted: id };
  }

  /** Return all tasks currently on this board's sprint */
  async findBoardTasks(sprintId: string) {
    return this.db.query.tasks.findMany({
      where: eq(schema.tasks.sprintId, sprintId),
      with: { assignee: true },
      orderBy: (t, { asc }) => [asc(t.createdAt)],
    });
  }
}
