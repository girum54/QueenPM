import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { DRIZZLE } from '../database/database.provider';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class DashboardService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async getStats(projectId?: string, sprintId?: string) {
    const where = sprintId
      ? eq(schema.tasks.sprintId, sprintId)
      : projectId
        ? eq(schema.tasks.projectId, projectId)
        : undefined;

    // ── All tasks for project/sprint ──────────────────────────────────────────
    const tasks = await this.db.query.tasks.findMany({
      where,
      with: { assignee: true },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });

    const total = tasks.length;

    // ── Column distribution ───────────────────────────────────────────────────
    const byCol = { new: 0, active: 0, staging: 0, deployed: 0 };
    tasks.forEach((t) => {
      if (t.column in byCol) byCol[t.column as keyof typeof byCol]++;
    });

    // ── Avg completion time (deployed tasks with completedAt) ─────────────────
    const deployedTasks = tasks.filter((t) => t.column === 'deployed' && t.completedAt);
    const avgCompletionDays =
      deployedTasks.length === 0
        ? 0
        : deployedTasks.reduce(
            (acc, t) =>
              acc + (t.completedAt!.getTime() - t.createdAt.getTime()) / 86400000,
            0,
          ) / deployedTasks.length;

    // ── Automation breakdown ──────────────────────────────────────────────────
    const aiCount = tasks.filter((t) => t.createdBy === 'ai').length;
    const slashCount = tasks.filter((t) => t.createdBy === 'slash').length;
    const uiCount = tasks.filter((t) => t.createdBy === 'ui').length;
    const autoRatio = total === 0 ? 0 : Math.round(((aiCount + slashCount) / total) * 100);

    // ── Weekly velocity (last 7 full weeks of deployed tasks + current week) ──
    const now = Date.now();
    const WEEK = 7 * 86400000;
    const velocity: number[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = now - (i + 1) * WEEK;
      const weekEnd = now - i * WEEK;
      velocity.push(
        deployedTasks.filter((t) => {
          const ts = t.completedAt!.getTime();
          return ts >= weekStart && ts < weekEnd;
        }).length,
      );
    }
    const movingAvg = velocity.reduce((a, b) => a + b, 0) / velocity.length;

    // ── Per-user efficiency ───────────────────────────────────────────────────
    const userMap = new Map<
      string,
      { userId: string; name: string; color: string; isAi: boolean; total: number; done: number; doneWithTime: number; totalDays: number }
    >();

    tasks.forEach((t) => {
      if (!t.assigneeId || !t.assignee) return;
      const u = t.assignee;
      if (!userMap.has(u.id)) {
        userMap.set(u.id, {
          userId: u.id,
          name: u.name,
          color: u.color ?? 'bg-slate-500',
          isAi: u.isAi ?? false,
          total: 0,
          done: 0,
          doneWithTime: 0,
          totalDays: 0,
        });
      }
      const entry = userMap.get(u.id)!;
      entry.total++;
      if (t.column === 'deployed') {
        entry.done++;
        if (t.completedAt) {
          entry.doneWithTime++;
          entry.totalDays += (t.completedAt.getTime() - t.createdAt.getTime()) / 86400000;
        }
      }
    });

    const perUser = [...userMap.values()]
      .filter((r) => r.total > 0)
      .map((r) => ({
        userId: r.userId,
        name: r.name,
        color: r.color,
        isAi: r.isAi,
        total: r.total,
        done: r.done,
        avgDays: r.doneWithTime > 0 ? r.totalDays / r.doneWithTime : null,
      }));

    // ── Recent activity (last 10 tasks created/updated) ───────────────────────
    const recentTasks = tasks.slice(0, 10).map((t) => ({
      id: t.id,
      title: t.title,
      column: t.column,
      priority: t.priority,
      assigneeId: t.assigneeId,
      assigneeName: t.assignee?.name ?? null,
      assigneeColor: t.assignee?.color ?? null,
      createdBy: t.createdBy,
      createdAt: t.createdAt,
    }));

    return {
      total,
      byCol,
      avgCompletionDays: parseFloat(avgCompletionDays.toFixed(2)),
      aiCount,
      slashCount,
      uiCount,
      autoRatio,
      velocity,
      movingAvg: parseFloat(movingAvg.toFixed(2)),
      perUser,
      recentTasks,
    };
  }

  // ── Get sprint-specific stats ─────────────────────────────────────────────
  async getSprintStats(sprintId: string) {
    const sprint = await this.db.query.sprints.findFirst({
      where: (s) => eq(s.id, sprintId),
    });

    if (!sprint) {
      return null;
    }

    const tasks = await this.db.query.tasks.findMany({
      where: (t) => eq(t.sprintId, sprintId),
      with: { assignee: true },
    });

    const total = tasks.length;

    const byCol = { new: 0, active: 0, staging: 0, deployed: 0 };
    tasks.forEach((t) => {
      if (t.column in byCol) byCol[t.column as keyof typeof byCol]++;
    });

    const deployedTasks = tasks.filter((t) => t.column === 'deployed' && t.completedAt);
    const completionRate = total === 0 ? 0 : Math.round((deployedTasks.length / total) * 100);

    const avgCompletionDays =
      deployedTasks.length === 0
        ? 0
        : deployedTasks.reduce(
            (acc, t) =>
              acc + (t.completedAt!.getTime() - t.createdAt.getTime()) / 86400000,
            0,
          ) / deployedTasks.length;

    const priorityCounts = {
      low: tasks.filter((t) => t.priority === 'low').length,
      medium: tasks.filter((t) => t.priority === 'medium').length,
      high: tasks.filter((t) => t.priority === 'high').length,
      urgent: tasks.filter((t) => t.priority === 'urgent').length,
    };

    return {
      sprintId,
      sprintName: sprint.name,
      total,
      completed: deployedTasks.length,
      completionRate,
      byCol,
      priorityCounts,
      avgCompletionDays: parseFloat(avgCompletionDays.toFixed(2)),
      startDate: sprint.startDate,
      durationWeeks: sprint.durationWeeks,
    };
  }

  // ── Get user-specific stats ──────────────────────────────────────────────
  async getUserStats(userId: string) {
    const userTasks = await this.db.query.tasks.findMany({
      where: (t) => eq(t.assigneeId, userId),
      with: { assignee: true },
    });

    const total = userTasks.length;
    const completed = userTasks.filter((t) => t.column === 'deployed').length;
    const inProgress = userTasks.filter((t) => t.column === 'active').length;
    const pending = userTasks.filter((t) => t.column === 'new').length;
    const inStaging = userTasks.filter((t) => t.column === 'staging').length;

    const deployedTasks = userTasks.filter((t) => t.column === 'deployed' && t.completedAt);
    const avgCompletionDays =
      deployedTasks.length === 0
        ? 0
        : deployedTasks.reduce(
            (acc, t) =>
              acc + (t.completedAt!.getTime() - t.createdAt.getTime()) / 86400000,
            0,
          ) / deployedTasks.length;

    const creationBreakdown = {
      ui: userTasks.filter((t) => t.createdBy === 'ui').length,
      ai: userTasks.filter((t) => t.createdBy === 'ai').length,
      slash: userTasks.filter((t) => t.createdBy === 'slash').length,
    };

    const priorityDistribution = {
      low: userTasks.filter((t) => t.priority === 'low').length,
      medium: userTasks.filter((t) => t.priority === 'medium').length,
      high: userTasks.filter((t) => t.priority === 'high').length,
      urgent: userTasks.filter((t) => t.priority === 'urgent').length,
    };

    return {
      userId,
      userName: userTasks[0]?.assignee?.name ?? 'Unknown',
      total,
      completed,
      inProgress,
      pending,
      inStaging,
      completionRate: total === 0 ? 0 : Math.round((completed / total) * 100),
      avgCompletionDays: parseFloat(avgCompletionDays.toFixed(2)),
      creationBreakdown,
      priorityDistribution,
    };
  }

  // ── Get task breakdown by priority and status ─────────────────────────────
  async getTaskBreakdown(projectId?: string) {
    const where = projectId ? eq(schema.tasks.projectId, projectId) : undefined;

    const tasks = await this.db.query.tasks.findMany({
      where,
      with: { assignee: true },
    });

    const breakdown = {
      byPriority: {
        low: [] as typeof tasks,
        medium: [] as typeof tasks,
        high: [] as typeof tasks,
        urgent: [] as typeof tasks,
      },
      byStatus: {
        new: [] as typeof tasks,
        active: [] as typeof tasks,
        staging: [] as typeof tasks,
        deployed: [] as typeof tasks,
      },
      overdue: [] as typeof tasks,
      unassigned: [] as typeof tasks,
    };

    const now = Date.now();
    tasks.forEach((t) => {
      // By priority
      breakdown.byPriority[t.priority as keyof typeof breakdown.byPriority].push(t);

      // By status
      breakdown.byStatus[t.column as keyof typeof breakdown.byStatus].push(t);

      // Overdue (deadline passed and not completed)
      if (t.deadline && t.deadline.getTime() < now && t.column !== 'deployed') {
        breakdown.overdue.push(t);
      }

      // Unassigned
      if (!t.assigneeId) {
        breakdown.unassigned.push(t);
      }
    });

    return {
      total: tasks.length,
      priorityCounts: {
        low: breakdown.byPriority.low.length,
        medium: breakdown.byPriority.medium.length,
        high: breakdown.byPriority.high.length,
        urgent: breakdown.byPriority.urgent.length,
      },
      statusCounts: {
        new: breakdown.byStatus.new.length,
        active: breakdown.byStatus.active.length,
        staging: breakdown.byStatus.staging.length,
        deployed: breakdown.byStatus.deployed.length,
      },
      overdueCount: breakdown.overdue.length,
      unassignedCount: breakdown.unassigned.length,
      overdueTasks: breakdown.overdue.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        deadline: t.deadline,
        assigneeName: t.assignee?.name ?? 'Unassigned',
      })),
    };
  }

  // ── Get trend analysis over time ──────────────────────────────────────────
  async getTrendAnalysis(projectId?: string, days: number = 30) {
    const where = projectId ? eq(schema.tasks.projectId, projectId) : undefined;

    const tasks = await this.db.query.tasks.findMany({
      where,
    });

    const now = Date.now();
    const dayInMs = 86400000;
    const trends: Array<{
      date: string;
      created: number;
      completed: number;
      total: number;
    }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = now - (i + 1) * dayInMs;
      const dayEnd = now - i * dayInMs;
      const date = new Date(dayStart).toISOString().split('T')[0];

      const created = tasks.filter((t) => {
        const ts = t.createdAt.getTime();
        return ts >= dayStart && ts < dayEnd;
      }).length;

      const completed = tasks.filter((t) => {
        if (!t.completedAt) return false;
        const ts = t.completedAt.getTime();
        return ts >= dayStart && ts < dayEnd;
      }).length;

      trends.push({
        date,
        created,
        completed,
        total: tasks.filter((t) => {
          const ts = t.createdAt.getTime();
          return ts <= dayEnd;
        }).length,
      });
    }

    return { trends };
  }

  // ── Get team overview ────────────────────────────────────────────────────
  async getTeamOverview(projectId?: string) {
    const where = projectId ? eq(schema.tasks.projectId, projectId) : undefined;

    const tasks = await this.db.query.tasks.findMany({
      where,
      with: { assignee: true },
    });

    const userStats = new Map<
      string,
      {
        userId: string;
        name: string;
        color: string;
        taskCount: number;
        completedCount: number;
        activeCount: number;
      }
    >();

    tasks.forEach((t) => {
      if (!t.assignee) return;
      if (!userStats.has(t.assigneeId!)) {
        userStats.set(t.assigneeId!, {
          userId: t.assigneeId!,
          name: t.assignee.name,
          color: t.assignee.color ?? 'bg-slate-500',
          taskCount: 0,
          completedCount: 0,
          activeCount: 0,
        });
      }
      const stats = userStats.get(t.assigneeId!)!;
      stats.taskCount++;
      if (t.column === 'deployed') stats.completedCount++;
      if (t.column === 'active') stats.activeCount++;
    });

    const team = [...userStats.values()].sort((a, b) => b.taskCount - a.taskCount);

    return {
      teamSize: team.length,
      totalTasks: tasks.length,
      totalCompleted: tasks.filter((t) => t.column === 'deployed').length,
      totalActive: tasks.filter((t) => t.column === 'active').length,
      team,
    };
  }
}
