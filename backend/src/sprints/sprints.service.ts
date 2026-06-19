import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { DRIZZLE } from '../database/database.provider';
import { CreateSprintDto, UpdateSprintDto, CreateDeliverableDto, UpdateDeliverableDto } from './dto/sprint.dto';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class SprintsService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  // ─── Sprints ──────────────────────────────────────────────────────────────

  async findAllByProject(projectId: string) {
    return this.db.query.sprints.findMany({
      where: eq(schema.sprints.projectId, projectId),
      with: { deliverables: true, board: true },
      orderBy: (sprints, { desc }) => [desc(sprints.createdAt)],
    });
  }

  async findOne(id: string) {
    const sprint = await this.db.query.sprints.findFirst({
      where: eq(schema.sprints.id, id),
      with: { deliverables: true, board: true, tasks: true },
    });
    if (!sprint) throw new NotFoundException(`Sprint ${id} not found`);
    return sprint;
  }

  async findActive(projectId: string) {
    const sprint = await this.db.query.sprints.findFirst({
      where: and(
        eq(schema.sprints.projectId, projectId),
        eq(schema.sprints.isActive, true),
      ),
      with: { deliverables: true, board: true },
    });
    if (!sprint) throw new NotFoundException('No active sprint for this project');
    return sprint;
  }

  async create(dto: CreateSprintDto) {
    const [sprint] = await this.db
      .insert(schema.sprints)
      .values({
        projectId: dto.projectId,
        name: dto.name,
        goal: dto.goal ?? null,
        style: dto.style ?? null,
        durationWeeks: dto.durationWeeks,
        startDate: new Date(dto.startDate),
      })
      .returning();
    return sprint;
  }

  async update(id: string, dto: UpdateSprintDto) {
    await this.findOne(id); // guard: 404 if not found
    const [updated] = await this.db
      .update(schema.sprints)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.goal !== undefined && { goal: dto.goal }),
        ...(dto.style !== undefined && { style: dto.style }),
        ...(dto.durationWeeks !== undefined && { durationWeeks: dto.durationWeeks }),
        ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      })
      .where(eq(schema.sprints.id, id))
      .returning();
    return updated;
  }

  /** Activate a sprint — deactivates any other active sprint in the same project first */
  async activate(id: string) {
    const sprint = await this.findOne(id);
    // Deactivate all other sprints in the project
    await this.db
      .update(schema.sprints)
      .set({ isActive: false })
      .where(eq(schema.sprints.projectId, sprint.projectId));
    // Activate this one
    const [activated] = await this.db
      .update(schema.sprints)
      .set({ isActive: true })
      .where(eq(schema.sprints.id, id))
      .returning();
    return activated;
  }

  /** Complete a sprint — marks it inactive and sets completedAt */
  async complete(id: string) {
    await this.findOne(id);
    const [completed] = await this.db
      .update(schema.sprints)
      .set({ isActive: false, completedAt: new Date() })
      .where(eq(schema.sprints.id, id))
      .returning();
    return completed;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.delete(schema.sprints).where(eq(schema.sprints.id, id));
    return { deleted: id };
  }

  // ─── Deliverables ─────────────────────────────────────────────────────────

  async findDeliverables(sprintId: string) {
    await this.findOne(sprintId); // guard
    return this.db.query.sprintDeliverables.findMany({
      where: eq(schema.sprintDeliverables.sprintId, sprintId),
      orderBy: (d, { asc }) => [asc(d.createdAt)],
    });
  }

  async addDeliverable(sprintId: string, dto: CreateDeliverableDto) {
    await this.findOne(sprintId); // guard
    const [deliverable] = await this.db
      .insert(schema.sprintDeliverables)
      .values({ sprintId, text: dto.text })
      .returning();
    return deliverable;
  }

  async updateDeliverable(sprintId: string, deliverableId: string, dto: UpdateDeliverableDto) {
    const existing = await this.db.query.sprintDeliverables.findFirst({
      where: and(
        eq(schema.sprintDeliverables.id, deliverableId),
        eq(schema.sprintDeliverables.sprintId, sprintId),
      ),
    });
    if (!existing) throw new NotFoundException(`Deliverable ${deliverableId} not found`);
    const [updated] = await this.db
      .update(schema.sprintDeliverables)
      .set({
        ...(dto.text !== undefined && { text: dto.text }),
        ...(dto.done !== undefined && { done: dto.done }),
      })
      .where(eq(schema.sprintDeliverables.id, deliverableId))
      .returning();
    return updated;
  }

  async removeDeliverable(sprintId: string, deliverableId: string) {
    const existing = await this.db.query.sprintDeliverables.findFirst({
      where: and(
        eq(schema.sprintDeliverables.id, deliverableId),
        eq(schema.sprintDeliverables.sprintId, sprintId),
      ),
    });
    if (!existing) throw new NotFoundException(`Deliverable ${deliverableId} not found`);
    await this.db
      .delete(schema.sprintDeliverables)
      .where(eq(schema.sprintDeliverables.id, deliverableId));
    return { deleted: deliverableId };
  }

  /** Bulk-replace all deliverables for a sprint (used on initial sprint creation) */
  async replaceDeliverables(sprintId: string, texts: string[]) {
    await this.findOne(sprintId); // guard
    await this.db
      .delete(schema.sprintDeliverables)
      .where(eq(schema.sprintDeliverables.sprintId, sprintId));
    if (texts.length === 0) return [];
    const rows = await this.db
      .insert(schema.sprintDeliverables)
      .values(texts.map((text) => ({ sprintId, text })))
      .returning();
    return rows;
  }
}
