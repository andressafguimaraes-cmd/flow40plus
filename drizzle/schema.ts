import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Morning check-in data for each user
 */
export const morningCheckIns = mysqlTable("morning_check_ins", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  sleepQuality: int("sleep_quality").notNull(), // 1-10
  energyLevel: int("energy_level").notNull(), // 1-10
  mentalClarity: int("mental_clarity").notNull(), // 1-10
  notes: text("notes"), // Optional notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MorningCheckIn = typeof morningCheckIns.$inferSelect;
export type InsertMorningCheckIn = typeof morningCheckIns.$inferInsert;

/**
 * Decomposed tasks with micro-steps
 */
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  totalEstimatedTime: int("total_estimated_time"), // in minutes
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]),
  status: mysqlEnum("status", ["pending", "in_progress", "completed"]).default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

/**
 * Micro-steps for each decomposed task
 */
export const microSteps = mysqlTable("micro_steps", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("task_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  estimatedTime: int("estimated_time").notNull(), // in minutes
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]),
  completed: int("completed").default(0), // 0 or 1 for boolean
  order: int("order").notNull(), // Order in the task
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MicroStep = typeof microSteps.$inferSelect;
export type InsertMicroStep = typeof microSteps.$inferInsert;

/**
 * Micro-practices library
 */
export const practices = mysqlTable("practices", {
  id: int("id").autoincrement().primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: mysqlEnum("category", ["focus", "relief", "inspiration"]).notNull(),
  duration: int("duration").notNull(), // in minutes
  instructions: text("instructions"), // Detailed instructions
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Practice = typeof practices.$inferSelect;
export type InsertPractice = typeof practices.$inferInsert;

/**
 * Track user progress on practices
 */
export const userPracticeProgress = mysqlTable("user_practice_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  practiceId: int("practice_id").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export type UserPracticeProgress = typeof userPracticeProgress.$inferSelect;
export type InsertUserPracticeProgress = typeof userPracticeProgress.$inferInsert;

/**
 * Store task decomposition history
 */
export const decompositionHistory = mysqlTable("decomposition_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  originalTask: text("original_task").notNull(),
  decomposedData: text("decomposed_data").notNull(), // JSON string of decomposition
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DecompositionHistory = typeof decompositionHistory.$inferSelect;
export type InsertDecompositionHistory = typeof decompositionHistory.$inferInsert;
