import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  serial,
  boolean
} from "drizzle-orm/pg-core";

// Enums are declared once as named, top-level exports (rather than inline
// per-column) so drizzle-kit's snapshot/diff actually tracks them and emits
// CREATE TYPE statements in generated migrations.
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const microDifficultyEnum = pgEnum("micro_difficulty", ["easy", "medium", "hard"]);
export const taskStatusEnum = pgEnum("task_status", ["pending", "in_progress", "completed"]);
export const taskPriorityEnum = pgEnum("task_priority", ["urgente", "alta", "media", "baixa", "sem"]);
export const categoryEnum = pgEnum("category", ["focus", "relief", "inspiration"]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  name: text("name"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Morning check-in data for each user
 */
export const morningCheckIns = pgTable("morning_check_ins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  sleepQuality: integer("sleep_quality").notNull(), // 1-10
  energyLevel: integer("energy_level").notNull(), // 1-10
  mentalClarity: integer("mental_clarity").notNull(), // 1-10
  notes: text("notes"), // Optional notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MorningCheckIn = typeof morningCheckIns.$inferSelect;
export type InsertMorningCheckIn = typeof morningCheckIns.$inferInsert;

/**
 * Decomposed tasks with micro-steps
 */
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  totalEstimatedTime: integer("total_estimated_time"), // in minutes
  difficulty: difficultyEnum("difficulty"),
  priority: taskPriorityEnum("priority").default("sem"),
  status: taskStatusEnum("status").default("pending"),
  scheduledTime: text("scheduled_time"), // fixed start time "HH:MM", null = flexible task
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

/**
 * Micro-steps for each decomposed task
 */
export const microSteps = pgTable("micro_steps", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  estimatedTime: integer("estimated_time").notNull(), // in minutes
  difficulty: microDifficultyEnum("difficulty"),
  completed: boolean("completed").default(false),
  order: integer("order").notNull(), // Order in the task
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MicroStep = typeof microSteps.$inferSelect;
export type InsertMicroStep = typeof microSteps.$inferInsert;

/**
 * Micro-practices library
 */
export const practices = pgTable("practices", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: categoryEnum("category").notNull(),
  duration: integer("duration").notNull(), // in minutes
  instructions: text("instructions"), // Detailed instructions
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Practice = typeof practices.$inferSelect;
export type InsertPractice = typeof practices.$inferInsert;

/**
 * Track user progress on practices
 */
export const userPracticeProgress = pgTable("user_practice_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  practiceId: integer("practice_id").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export type UserPracticeProgress = typeof userPracticeProgress.$inferSelect;
export type InsertUserPracticeProgress = typeof userPracticeProgress.$inferInsert;

/**
 * Store task decomposition history
 */
export const decompositionHistory = pgTable("decomposition_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  originalTask: text("original_task").notNull(),
  decomposedData: text("decomposed_data").notNull(), // JSON string of decomposition
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DecompositionHistory = typeof decompositionHistory.$inferSelect;
export type InsertDecompositionHistory = typeof decompositionHistory.$inferInsert;
