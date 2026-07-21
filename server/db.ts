import { eq, desc, and, gte, count, isNotNull, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { InsertUser, users, morningCheckIns, tasks, microSteps, practices, userPracticeProgress, decompositionHistory, pushSubscriptions, notificationSettings, notificationLog } from "../drizzle/schema_postgres";
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
    // Capped at a handful of connections: on serverless (Vercel), every
    // concurrent invocation can spin up its own Pool, so a high per-instance
    // max risks exhausting Postgres' connection limit fast. Use Supabase's
    // pooled (pgbouncer) connection string in DATABASE_URL on Vercel.
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
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
    .orderBy(desc(morningCheckIns.createdAt))
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

  await db.update(tasks).set({ status, updatedAt: new Date() }).where(eq(tasks.id, taskId));
}

export async function updateTaskScheduledTime(taskId: number, scheduledTime: string | null) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      memoryDb.updateTaskScheduledTime(taskId, scheduledTime);
      return;
    }
    throw new Error("Database not available");
  }

  await db.update(tasks).set({ scheduledTime }).where(eq(tasks.id, taskId));
}

export async function updateTaskPlannedDate(taskId: number, plannedDate: string | null) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      memoryDb.updateTaskPlannedDate(taskId, plannedDate);
      return;
    }
    throw new Error("Database not available");
  }

  await db.update(tasks).set({ plannedDate }).where(eq(tasks.id, taskId));
}

export async function updateTaskPriority(taskId: number, priority: "urgente" | "alta" | "media" | "baixa" | "sem") {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      memoryDb.updateTaskPriority(taskId, priority);
      return;
    }
    throw new Error("Database not available");
  }

  await db.update(tasks).set({ priority, updatedAt: new Date() }).where(eq(tasks.id, taskId));
}

export async function updateTaskDetails(taskId: number, updates: { title?: string; totalEstimatedTime?: number; priority?: "urgente" | "alta" | "media" | "baixa" | "sem" }) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      memoryDb.updateTaskDetails(taskId, updates);
      return;
    }
    throw new Error("Database not available");
  }

  await db.update(tasks).set({ ...updates, updatedAt: new Date() }).where(eq(tasks.id, taskId));
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

export async function addMicroStep(taskId: number, title: string, estimatedTime: number = 10) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      return memoryDb.addMicroStep(taskId, title, estimatedTime);
    }
    throw new Error("Database not available");
  }

  const existing = await db.select({ order: microSteps.order }).from(microSteps).where(eq(microSteps.taskId, taskId));
  const nextOrder = existing.length > 0 ? Math.max(...existing.map(s => s.order)) + 1 : 1;

  const result = await db.insert(microSteps).values({
    taskId,
    title,
    estimatedTime,
    order: nextOrder,
  }).returning({ id: microSteps.id });

  return { insertId: result[0]?.id ?? 0 };
}

export async function updateMicroStepDetails(microStepId: number, updates: { title?: string; estimatedTime?: number }) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      memoryDb.updateMicroStepDetails(microStepId, updates);
      return;
    }
    throw new Error("Database not available");
  }

  await db.update(microSteps).set(updates).where(eq(microSteps.id, microStepId));
}

export async function deleteMicroStep(microStepId: number) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      memoryDb.deleteMicroStep(microStepId);
      return;
    }
    throw new Error("Database not available");
  }

  await db.delete(microSteps).where(eq(microSteps.id, microStepId));
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

// ===== Push Notification Functions =====

export async function upsertPushSubscription(userId: number, endpoint: string, p256dh: string, auth: string) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      memoryDb.upsertPushSubscription(userId, endpoint, p256dh, auth);
      return;
    }
    throw new Error("Database not available");
  }

  await db
    .insert(pushSubscriptions)
    .values({ userId, endpoint, p256dh, auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId, p256dh, auth },
    });
}

// Usado pelo broadcast de aviso geral: uma usuária pode ter várias
// inscrições (mais de um aparelho/navegador), então agrupa por userId.
export async function getAllUserIdsWithPushSubscriptions() {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      return memoryDb.getAllUserIdsWithPushSubscriptions();
    }
    throw new Error("Database not available");
  }

  const rows = await db.selectDistinct({ userId: pushSubscriptions.userId }).from(pushSubscriptions);
  return rows.map(r => r.userId);
}

export async function deletePushSubscription(endpoint: string) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      memoryDb.deletePushSubscription(endpoint);
      return;
    }
    throw new Error("Database not available");
  }

  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function getPushSubscriptionsForUser(userId: number) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      return memoryDb.getPushSubscriptionsForUser(userId);
    }
    throw new Error("Database not available");
  }

  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
}

export async function getNotificationSettings(userId: number) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      return memoryDb.getNotificationSettings(userId);
    }
    throw new Error("Database not available");
  }

  const result = await db.select().from(notificationSettings).where(eq(notificationSettings.userId, userId)).limit(1);
  return result.length > 0 ? (result[0].settings as Record<string, unknown>) : null;
}

export async function saveNotificationSettings(userId: number, settings: Record<string, unknown>) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      memoryDb.saveNotificationSettings(userId, settings);
      return;
    }
    throw new Error("Database not available");
  }

  await db
    .insert(notificationSettings)
    .values({ userId, settings })
    .onConflictDoUpdate({
      target: notificationSettings.userId,
      set: { settings, updatedAt: new Date() },
    });
}

// Usado pelo cron diário: varre todas as configurações salvas (uma linha por
// usuária que já abriu a tela de notificações) e decide em memória quais
// lembretes batem com o horário atual — mais simples que filtrar por jsonb
// no SQL, e a tabela tende a ser pequena (uma linha por usuária).
export async function getAllNotificationSettings() {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      return memoryDb.getAllNotificationSettings();
    }
    throw new Error("Database not available");
  }

  const rows = await db.select().from(notificationSettings);
  return rows.map(row => ({ userId: row.userId, settings: row.settings as Record<string, unknown> }));
}

export async function wasNotificationSent(userId: number, kind: string, refId: number, sentDate: string) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      return memoryDb.wasNotificationSent(userId, kind, refId, sentDate);
    }
    throw new Error("Database not available");
  }

  const result = await db
    .select({ id: notificationLog.id })
    .from(notificationLog)
    .where(and(
      eq(notificationLog.userId, userId),
      eq(notificationLog.kind, kind),
      eq(notificationLog.refId, refId),
      eq(notificationLog.sentDate, sentDate),
    ))
    .limit(1);

  return result.length > 0;
}

export async function markNotificationSent(userId: number, kind: string, refId: number, sentDate: string) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      memoryDb.markNotificationSent(userId, kind, refId, sentDate);
      return;
    }
    throw new Error("Database not available");
  }

  await db.insert(notificationLog).values({ userId, kind, refId, sentDate }).onConflictDoNothing();
}

// Usado pelo cron de âncoras: tarefas com horário fixo, planejadas pro dia
// informado, ainda não concluídas.
export async function getAnchorTasksForDate(date: string) {
  const db = await getDb();
  if (!db) {
    if (useMemoryFallback) {
      return memoryDb.getAnchorTasksForDate(date);
    }
    throw new Error("Database not available");
  }

  return db
    .select()
    .from(tasks)
    .where(and(
      eq(tasks.plannedDate, date),
      isNotNull(tasks.scheduledTime),
      ne(tasks.status, "completed"),
    ));
}
