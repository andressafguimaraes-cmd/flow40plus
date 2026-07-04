import { eq, desc, and, gte, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { InsertUser, users, morningCheckIns, tasks, microSteps, practices, userPracticeProgress, decompositionHistory } from "../drizzle/schema_postgres";
import { ENV } from './_core/env';
import { memoryDb } from './db-memory';

let _db: ReturnType<typeof drizzle> | null = null;
let useMemoryFallback = false;

export async function getDb() {
  if (_db) return _db;

  if (!process.env.DATABASE_URL) {
    if (ENV.isProduction) {
      // Fail loudly instead of silently discarding writes in production.
      throw new Error("DATABASE_URL is required in production");
    }
    useMemoryFallback = true;
    return null;
  }

  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    _db = drizzle(pool);
    useMemoryFallback = false;
    console.log("[Database] Connected to Postgres");
  } catch (error) {
    if (ENV.isProduction) {
      throw error;
    }
    console.warn("[Database] Failed to connect to Postgres, using in-memory fallback:", error);
    useMemoryFallback = true;
    _db = null;
  }
  return _db;
}

export function isUsingMemoryFallback() {
  return useMemoryFallback;
}

export async function getUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      return memoryDb.getUserByEmail(normalizedEmail);
    }
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      return memoryDb.getUserById(id);
    }
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUser(user: { email: string; name?: string | null; passwordHash?: string | null; loginMethod?: string | null; role?: "user" | "admin" }) {
  const normalizedEmail = user.email.trim().toLowerCase();
  const role = user.role ?? (ENV.adminEmail && normalizedEmail === ENV.adminEmail ? "admin" : "user");
  const now = new Date();

  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      return memoryDb.createUser({
        email: normalizedEmail,
        name: user.name ?? null,
        passwordHash: user.passwordHash ?? null,
        loginMethod: user.loginMethod ?? null,
        role,
        createdAt: now,
        updatedAt: now,
        lastSignedIn: now,
      });
    }
    throw new Error("Database not available");
  }

  const result = await db.insert(users).values({
    email: normalizedEmail,
    name: user.name ?? null,
    passwordHash: user.passwordHash ?? null,
    loginMethod: user.loginMethod ?? null,
    role,
  }).returning();

  return result[0];
}

export async function updateLastSignedIn(id: number) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      memoryDb.updateLastSignedIn(id);
      return;
    }
    console.warn("[Database] Cannot update user: database not available");
    return;
  }

  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, id));
}

// ===== Morning Check-in Functions =====

export async function createMorningCheckIn(userId: number, sleepQuality: number, energyLevel: number, mentalClarity: number, notes?: string) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      return memoryDb.createCheckIn(userId, sleepQuality, energyLevel, mentalClarity, notes);
    }
    throw new Error("Database not available");
  }

  const result = await db.insert(morningCheckIns).values({
    userId,
    sleepQuality,
    energyLevel,
    mentalClarity,
    notes,
  }).returning({ id: morningCheckIns.id });

  return { insertId: result[0]?.id ?? 0 };
}

export async function getWeeklyCheckIns(userId: number) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      return memoryDb.getWeeklyCheckIns(userId);
    }
    throw new Error("Database not available");
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const checkIns = await db
    .select()
    .from(morningCheckIns)
    .where(and(eq(morningCheckIns.userId, userId), gte(morningCheckIns.createdAt, sevenDaysAgo)))
    .orderBy(desc(morningCheckIns.createdAt));

  return checkIns;
}

export async function getTodayCheckIn(userId: number) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      return memoryDb.getTodayCheckIn(userId);
    }
    throw new Error("Database not available");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const checkIn = await db
    .select()
    .from(morningCheckIns)
    .where(and(eq(morningCheckIns.userId, userId), gte(morningCheckIns.createdAt, today)))
    .limit(1);

  return checkIn.length > 0 ? checkIn[0] : null;
}

export async function getCheckInCount(userId: number) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      return memoryDb.getCheckInCount(userId);
    }
    throw new Error("Database not available");
  }

  const result = await db
    .select({ count: count() })
    .from(morningCheckIns)
    .where(eq(morningCheckIns.userId, userId));

  return result[0]?.count ?? 0;
}

// ===== Task Functions =====

export async function createTask(userId: number, title: string, description?: string, totalEstimatedTime?: number, difficulty?: string, priority?: string) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      return memoryDb.createTask(userId, title, description, totalEstimatedTime, difficulty, priority);
    }
    throw new Error("Database not available");
  }

  const result = await db.insert(tasks).values({
    userId,
    title,
    description,
    totalEstimatedTime,
    difficulty: difficulty as "easy" | "medium" | "hard" | undefined,
    priority: (priority ?? "sem") as "urgente" | "alta" | "media" | "baixa" | "sem",
  }).returning({ id: tasks.id });

  return { insertId: result[0]?.id ?? 0 };
}

export async function getUserTasks(userId: number) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      return memoryDb.getUserTasks(userId);
    }
    throw new Error("Database not available");
  }

  const userTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(desc(tasks.createdAt));

  return userTasks;
}

export async function updateTaskStatus(taskId: number, status: "pending" | "in_progress" | "completed") {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      memoryDb.updateTaskStatus(taskId, status);
      return;
    }
    throw new Error("Database not available");
  }

  await db.update(tasks).set({ status }).where(eq(tasks.id, taskId));
}

export async function deleteTask(taskId: number) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      memoryDb.deleteTask(taskId);
      return;
    }
    throw new Error("Database not available");
  }

  // Delete micro-steps first (foreign key constraint)
  await db.delete(microSteps).where(eq(microSteps.taskId, taskId));
  
  // Then delete the task
  await db.delete(tasks).where(eq(tasks.id, taskId));
}

// ===== Micro-step Functions =====

export async function createMicroSteps(taskId: number, steps: Array<{ title: string; description?: string; estimatedTime: number; difficulty: string; order: number }>) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      return memoryDb.createMicroSteps(taskId, steps);
    }
    throw new Error("Database not available");
  }

  const stepsToInsert = steps.map(step => ({
    taskId,
    title: step.title,
    description: step.description,
    estimatedTime: step.estimatedTime,
    difficulty: step.difficulty as "easy" | "medium" | "hard",
    order: step.order,
  }));

  const result = await db.insert(microSteps).values(stepsToInsert).returning({ id: microSteps.id });
  return { insertId: result[0]?.id ?? 0 };
}

export async function getTaskMicroSteps(taskId: number) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      return memoryDb.getTaskMicroSteps(taskId);
    }
    throw new Error("Database not available");
  }

  const steps = await db
    .select()
    .from(microSteps)
    .where(eq(microSteps.taskId, taskId))
    .orderBy(microSteps.order);

  return steps;
}

export async function updateMicroStepStatus(microStepId: number, completed: boolean) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      memoryDb.updateMicroStepStatus(microStepId, completed);
      return;
    }
    throw new Error("Database not available");
  }

  await db.update(microSteps).set({ completed }).where(eq(microSteps.id, microStepId));
}

// ===== Practice Functions =====

export async function getAllPractices() {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      return memoryDb.getAllPractices();
    }
    throw new Error("Database not available");
  }

  const allPractices = await db.select().from(practices);
  return allPractices;
}

export async function getPracticesByCategory(category: "focus" | "relief" | "inspiration") {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      return memoryDb.getPracticesByCategory(category);
    }
    throw new Error("Database not available");
  }

  const categoryPractices = await db
    .select()
    .from(practices)
    .where(eq(practices.category, category));

  return categoryPractices;
}

export async function createPractice(title: string, description: string, category: "focus" | "relief" | "inspiration", duration: number, instructions?: string) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      return memoryDb.createPractice(title, description, category, duration, instructions);
    }
    throw new Error("Database not available");
  }

  const result = await db.insert(practices).values({
    title,
    description,
    category,
    duration,
    instructions,
  }).returning({ id: practices.id });

  return { insertId: result[0]?.id ?? 0 };
}

export async function logPracticeProgress(userId: number, practiceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(userPracticeProgress).values({
    userId,
    practiceId,
  }).returning({ id: userPracticeProgress.id });

  return { insertId: result[0]?.id ?? 0 };
}

export async function getUserPracticeProgress(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const progress = await db
    .select()
    .from(userPracticeProgress)
    .where(eq(userPracticeProgress.userId, userId))
    .orderBy(desc(userPracticeProgress.completedAt));

  return progress;
}

// ===== Decomposition History Functions =====

export async function saveDecompositionHistory(userId: number, originalTask: string, decomposedData: any) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      return memoryDb.saveDecompositionHistory(userId, originalTask, decomposedData);
    }
    throw new Error("Database not available");
  }

  const result = await db.insert(decompositionHistory).values({
    userId,
    originalTask,
    decomposedData: JSON.stringify(decomposedData),
  }).returning({ id: decompositionHistory.id });

  return { insertId: result[0]?.id ?? 0 };
}

export async function getUserDecompositionHistory(userId: number) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      return memoryDb.getUserDecompositionHistory(userId);
    }
    throw new Error("Database not available");
  }

  const history = await db
    .select()
    .from(decompositionHistory)
    .where(eq(decompositionHistory.userId, userId))
    .orderBy(desc(decompositionHistory.createdAt));

  return history.map(item => ({
    ...item,
    decomposedData: JSON.parse(item.decomposedData),
  }));
}
