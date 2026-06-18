import { pgTable, text, timestamp, boolean, integer, pgEnum, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums for Tasks
export const priorityEnum = pgEnum("priority", ["low", "medium", "high", "urgent"]);
export const columnEnum = pgEnum("column", ["new", "active", "staging", "deployed"]);
export const createdByEnum = pgEnum("created_by", ["ui", "ai", "slash"]);

/**
 * Better Auth Tables
 */

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
  color: text("color"), // avatar background class
  isAi: boolean("is_ai").default(false),
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

/**
 * Queen PM Core Tables
 */

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

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  assigneeId: text("assignee_id").references(() => user.id),
  priority: priorityEnum("priority").default("medium").notNull(),
  column: columnEnum("column").default("new").notNull(),
  createdBy: createdByEnum("created_by").default("ui").notNull(),
  originMessageId: uuid("origin_message_id"), // will be updated once messages table is defined
  originChannelId: uuid("origin_channel_id").references(() => channels.id),
  projectId: uuid("project_id").references(() => projects.id),
  parentId: uuid("parent_id"), // for subtasks
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
  parentId: uuid("parent_id"), // for threads
  taskRef: uuid("task_ref").references(() => tasks.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Relations
 */

export const userRelations = relations(user, ({ many }) => ({
  tasks: many(tasks),
  messages: many(messages),
}));

export const projectRelations = relations(projects, ({ many }) => ({
  channels: many(channels),
  tasks: many(tasks),
}));

export const channelRelations = relations(channels, ({ one, many }) => ({
  project: one(projects, {
    fields: [channels.projectId],
    references: [projects.id],
  }),
  messages: many(messages),
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
