import { pgTable, text, timestamp, boolean, integer, pgEnum, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const priorityEnum = pgEnum("priority", ["low", "medium", "high", "urgent"]);
export const columnEnum = pgEnum("column", ["new", "active", "staging", "deployed"]);
export const createdByEnum = pgEnum("created_by", ["ui", "ai", "slash"]);
export const roleEnum = pgEnum("role", ["developer", "stakeholder"]);

// ─── Better Auth Tables ───────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),

  // Custom Queen PM fields
  username: text("username"), // e.g. @mira
  color: text("color"),       // avatar background class
  isAi: boolean("is_ai").default(false),
  role: roleEnum("role").default("developer").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// ─── Queen PM Core Tables ─────────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  color: text("color").notNull(), // gradient class
  ownerId: text("owner_id").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const channels = pgTable("channels", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  projectId: uuid("project_id").references(() => projects.id),
  aiActive: boolean("ai_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Sprints
 *
 * One project → many sprints (past + current). Only one should have
 * isActive = true at a time (enforced at the app layer).
 *
 * `style` is a free-text field — users name and define their own methodology
 * (e.g. "Chaos Mode", "Weekly Pulse", "Death March"). No enum constraint.
 */
export const sprints = pgTable("sprints", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  name: text("name").notNull(),         // e.g. "Sprint Q3 - Payments Overhaul"
  goal: text("goal"),                   // free-text sprint objective / context
  style: text("style"),                 // user-defined methodology label, no enum
  durationWeeks: integer("duration_weeks").default(2).notNull(),
  startDate: timestamp("start_date").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Sprint Deliverables (checklist items)
 *
 * Displayed in the Active Deliverables panel.
 * Cascade-deleted when the parent sprint is removed.
 */
export const sprintDeliverables = pgTable("sprint_deliverables", {
  id: uuid("id").primaryKey().defaultRandom(),
  sprintId: uuid("sprint_id")
    .notNull()
    .references(() => sprints.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  done: boolean("done").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Boards
 *
 * A board is always tied to exactly one sprint.
 * The `.unique()` on sprintId enforces a strict 1-to-1 at the DB level.
 * Cascade-deleted when the parent sprint is removed.
 */
export const boards = pgTable("boards", {
  id: uuid("id").primaryKey().defaultRandom(),
  sprintId: uuid("sprint_id")
    .notNull()
    .unique()                           // 1-to-1: one board per sprint
    .references(() => sprints.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  name: text("name").notNull(),         // e.g. "Sprint Board — Q3 Iter 4"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Tasks
 *
 * `sprintId` is nullable — backlog tasks don't need a sprint yet.
 * Any task on a board must have a sprintId (enforced in app logic).
 */
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  assigneeId: text("assignee_id").references(() => user.id),
  priority: priorityEnum("priority").default("medium").notNull(),
  column: columnEnum("column").default("new").notNull(),
  createdBy: createdByEnum("created_by").default("ui").notNull(),
  originMessageId: uuid("origin_message_id"),
  originChannelId: uuid("origin_channel_id").references(() => channels.id),
  projectId: uuid("project_id").references(() => projects.id),
  sprintId: uuid("sprint_id").references(() => sprints.id), // required when on a board
  parentId: uuid("parent_id"),          // for subtasks
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  deadline: timestamp("deadline"),
  estimateDays: integer("estimate_days"),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorId: text("author_id")
    .notNull()
    .references(() => user.id),
  channelId: uuid("channel_id")
    .notNull()
    .references(() => channels.id),
  text: text("text"),
  pinned: boolean("pinned").default(false).notNull(),
  parentId: uuid("parent_id"),          // for threads
  taskRef: uuid("task_ref").references(() => tasks.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const channelMembers = pgTable("channel_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  channelId: uuid("channel_id")
    .notNull()
    .references(() => channels.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectMembers = pgTable("project_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const userRelations = relations(user, ({ many }) => ({
  tasks: many(tasks),
  messages: many(messages),
  channelMembers: many(channelMembers),
  projectMembers: many(projectMembers),
}));

export const projectRelations = relations(projects, ({ many }) => ({
  channels: many(channels),
  tasks: many(tasks),
  sprints: many(sprints),
  boards: many(boards),
  members: many(projectMembers),
}));

export const channelRelations = relations(channels, ({ one, many }) => ({
  project: one(projects, {
    fields: [channels.projectId],
    references: [projects.id],
  }),
  messages: many(messages),
  members: many(channelMembers),
}));

export const sprintRelations = relations(sprints, ({ one, many }) => ({
  project: one(projects, {
    fields: [sprints.projectId],
    references: [projects.id],
  }),
  deliverables: many(sprintDeliverables),
  board: one(boards, {
    fields: [sprints.id],
    references: [boards.sprintId],
  }),
  tasks: many(tasks),
}));

export const sprintDeliverableRelations = relations(sprintDeliverables, ({ one }) => ({
  sprint: one(sprints, {
    fields: [sprintDeliverables.sprintId],
    references: [sprints.id],
  }),
}));

export const boardRelations = relations(boards, ({ one }) => ({
  sprint: one(sprints, {
    fields: [boards.sprintId],
    references: [sprints.id],
  }),
  project: one(projects, {
    fields: [boards.projectId],
    references: [projects.id],
  }),
}));

export const taskRelations = relations(tasks, ({ one, many }) => ({
  assignee: one(user, {
    fields: [tasks.assigneeId],
    references: [user.id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  sprint: one(sprints, {
    fields: [tasks.sprintId],
    references: [sprints.id],
  }),
  subtasks: many(tasks, { relationName: "subtasks" }),
  parent: one(tasks, {
    fields: [tasks.parentId],
    references: [tasks.id],
    relationName: "subtasks",
  }),
}));

export const messageRelations = relations(messages, ({ one }) => ({
  author: one(user, {
    fields: [messages.authorId],
    references: [user.id],
  }),
  channel: one(channels, {
    fields: [messages.channelId],
    references: [channels.id],
  }),
  task: one(tasks, {
    fields: [messages.taskRef],
    references: [tasks.id],
  }),
}));

export const channelMemberRelations = relations(channelMembers, ({ one }) => ({
  channel: one(channels, {
    fields: [channelMembers.channelId],
    references: [channels.id],
  }),
  user: one(user, {
    fields: [channelMembers.userId],
    references: [user.id],
  }),
}));

export const projectMemberRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(user, {
    fields: [projectMembers.userId],
    references: [user.id],
  }),
}));
