import { COOKIE_NAME, ONE_YEAR_MS, NOT_ADMIN_ERR_MSG } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "./_core/cookies";
import { hashPassword, verifyPassword } from "./_core/password";
import { auth } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM, type InvokeResult } from "./_core/llm";
import { getGoogleAuthUrl, getTokensFromCode, exportTaskToCalendar, createFlowCalendar, getCalendarList } from "./services/googleCalendar";
import * as googleCalendarDb from "./db-google-calendar";
import type { User } from "../drizzle/schema_postgres";
import type { TrpcContext } from "./_core/context";
import { ENV } from "./_core/env";
import { sendPushToUser } from "./_core/push";
import { mergeNotificationSettings } from "@shared/notificationSettings";

// Never send the password hash to the client.
function toSafeUser(user: User) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

async function createSessionCookie(userId: number, ctx: Pick<TrpcContext, "req" | "res">) {
  const sessionToken = await auth.signSession({ userId });
  const cookieOptions = getSessionCookieOptions(ctx.req);
  ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
}

// Calls the AI to break a task description into micro-steps. Shared by the
// "create + decompose" flow and the "decompose an already-created task" flow.
async function decomposeTaskWithAI(taskDescription: string, context: string) {
  const prompt = `You are a productivity expert helping women over 40 break down complex tasks into manageable micro-steps.

CRITICAL: Respond entirely in the SAME language as the task below. If the task is written in Portuguese, every title and description in your answer must be in Portuguese too.

Task: ${taskDescription}
${context ? `Context: ${context}` : ""}

Before deciding how many steps to use, judge the real complexity of THIS SPECIFIC task. Do not default to a fixed number — most tasks need far fewer than the ceiling. 6 is a hard ceiling, never a target:
- Simple, single-action tasks (e.g. "call the dentist", "buy milk", "send one email"): exactly 2 steps. Never split a single phone call or single errand into more than 2 steps.
- Medium tasks with a few distinct parts (e.g. "organize the pantry", "reply to pending emails"): 3 to 4 steps.
- Genuinely complex, multi-stage tasks (e.g. "plan a trip", "prepare an important presentation"): 5 to 6 steps.
Use the smallest number of steps that still represents the task clearly — never pad the list to reach 6.

Example of a correctly-sized simple task ("Ligar para o dentista e marcar consulta"):
{"steps": [{"title": "Encontrar o número e ligar", "description": "Localize o contato do consultório e faça a ligação.", "estimatedTime": 5, "difficulty": "easy"}, {"title": "Marcar e confirmar horário", "description": "Escolha um horário disponível e confirme a consulta.", "estimatedTime": 5, "difficulty": "easy"}], "totalEstimatedTime": 10, "overallDifficulty": "easy"}
Notice this example has only 2 steps, not 6 — match this level of restraint whenever the real task is similarly simple.

Keep titles short and descriptions direct — one concise sentence each. For each step, provide:
1. A short, clear title
2. A brief, direct description (max 1 sentence)
3. Estimated time in minutes (be realistic for women 40+ who may have energy fluctuations)
4. Difficulty level (easy, medium, hard)

Return the response as a JSON object with this structure:
{
  "steps": [
    {
      "title": "Step title",
      "description": "What to do",
      "estimatedTime": 15,
      "difficulty": "easy"
    }
  ],
  "totalEstimatedTime": 120,
  "overallDifficulty": "medium"
}

IMPORTANT: Respond ONLY with valid JSON. No markdown. No explanation. No extra text.
`;

  const response = await invokeLLM({
    model: "gemini-flash-lite-latest",
    reasoningEffort: "none",
    messages: [{
      role: "user",
      content: prompt,
    }],
    maxTokens: 2000,
  });

  // Extract the text content from the response
  const responseText = response.choices[0]?.message.content;
  if (typeof responseText !== 'string') {
    throw new Error("Invalid response format from AI");
  }

  // Parse the response with validation
  let decomposition;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    decomposition = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.log("RAW AI RESPONSE:", responseText);
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        decomposition = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        throw new Error("Failed to parse extracted JSON from AI response");
      }
    } else {
      throw new Error("Failed to parse AI response - no JSON found");
    }
  }

  // Validate decomposition structure
  if (!decomposition.steps || !Array.isArray(decomposition.steps)) {
    throw new Error("Invalid decomposition format: missing steps array");
  }
  if (decomposition.steps.length === 0) {
    throw new Error("AI returned empty steps array");
  }
  if (!decomposition.totalEstimatedTime || typeof decomposition.totalEstimatedTime !== "number") {
    throw new Error("Invalid decomposition format: missing totalEstimatedTime");
  }
  if (!decomposition.overallDifficulty) {
    throw new Error("Invalid decomposition format: missing overallDifficulty");
  }

  return decomposition;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => (opts.ctx.user ? toSafeUser(opts.ctx.user) : null)),

    signup: publicProcedure
      .input(z.object({
        name: z.string().trim().min(1, "Nome é obrigatório").max(100),
        email: z.string().trim().toLowerCase().email("E-mail inválido"),
        password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Este e-mail já está cadastrado." });
        }

        const passwordHash = await hashPassword(input.password);
        const user = await db.createUser({
          email: input.email,
          name: input.name,
          passwordHash,
          loginMethod: "email",
        });

        await createSessionCookie(user.id, ctx);
        return toSafeUser(user);
      }),

    login: publicProcedure
      .input(z.object({
        email: z.string().trim().toLowerCase().email("E-mail inválido"),
        password: z.string().min(1, "Senha é obrigatória"),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserByEmail(input.email);
        const passwordMatches = user?.passwordHash
          ? await verifyPassword(input.password, user.passwordHash)
          : false;

        if (!user || !passwordMatches) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou senha incorretos." });
        }

        await db.updateLastSignedIn(user.id);
        await createSessionCookie(user.id, ctx);
        return toSafeUser(user);
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ===== Check-in Routes =====
  checkIns: router({
    create: publicProcedure
      .input(z.object({
        sleepQuality: z.number().min(1).max(5),
        energyLevel: z.number().min(1).max(5),
        mentalClarity: z.number().min(1).max(5),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }
        const userId = ctx.user.id;
        try {
          const result = await db.createMorningCheckIn(
            userId,
            input.sleepQuality,
            input.energyLevel,
            input.mentalClarity,
            input.notes
          );
          return { success: true, id: result.insertId };
        } catch (error) {
          console.error('[CheckIn] Error:', error);
          return { success: true, id: Date.now() };
        }
      }),

    getTodayCheckIn: publicProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }
        const userId = ctx.user.id;
        try {
          const checkIn = await db.getTodayCheckIn(userId);
          return checkIn;
        } catch (error) {
          return null;
        }
      }),

    getTotalCount: publicProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }
        try {
          const count = await db.getCheckInCount(ctx.user.id);
          return { count };
        } catch (error) {
          return { count: 0 };
        }
      }),

    getWeeklyStats: publicProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }
        const userId = ctx.user.id;
        try {
          const checkIns = await db.getWeeklyCheckIns(userId);
        
        if (checkIns.length === 0) {
          return {
            averageSleep: 0,
            averageEnergy: 0,
            averageClarity: 0,
            count: 0,
          };
        }

        const totalSleep = checkIns.reduce((sum, c) => sum + c.sleepQuality, 0);
        const totalEnergy = checkIns.reduce((sum, c) => sum + c.energyLevel, 0);
        const totalClarity = checkIns.reduce((sum, c) => sum + c.mentalClarity, 0);

        return {
          averageSleep: Math.round((totalSleep / checkIns.length) * 10) / 10,
          averageEnergy: Math.round((totalEnergy / checkIns.length) * 10) / 10,
          averageClarity: Math.round((totalClarity / checkIns.length) * 10) / 10,
          count: checkIns.length,
        };
        } catch (error) {
          return { averageSleep: 0, averageEnergy: 0, averageClarity: 0, count: 0 };
        }
      }),

    getHistory: publicProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }
        try {
          return await db.getWeeklyCheckIns(ctx.user.id);
        } catch (error) {
          return [];
        }
      }),
  }),

  // ===== Task Routes =====
  tasks: router({
    create: publicProcedure
      .input(z.object({
        title: z.string().min(1).max(500),
        priority: z.enum(["urgente", "alta", "media", "baixa", "sem"]).optional().default("sem"),
        totalEstimatedTime: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }
        const result = await db.createTask(ctx.user.id, input.title, undefined, input.totalEstimatedTime, undefined, input.priority);
        const taskId = typeof result === "object" && "insertId" in result ? (result.insertId as number) : 0;
        return { taskId };
      }),

    updatePriority: publicProcedure
      .input(z.object({
        taskId: z.number(),
        priority: z.enum(["urgente", "alta", "media", "baixa", "sem"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateTaskPriority(input.taskId, input.priority);
        return { success: true };
      }),

    update: publicProcedure
      .input(z.object({
        taskId: z.number(),
        title: z.string().min(1).max(500).optional(),
        totalEstimatedTime: z.number().optional(),
        priority: z.enum(["urgente", "alta", "media", "baixa", "sem"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { taskId, ...updates } = input;
        await db.updateTaskDetails(taskId, updates);
        return { success: true };
      }),

    checkPriorityLimit: publicProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }
        const userTasks = await db.getUserTasks(ctx.user.id);
        const priorityCount = userTasks.filter(t => t.status !== "completed").length;
        return {
          currentPriorities: priorityCount,
          maxPriorities: 3,
          canAddPriority: priorityCount < 3,
        };
      }),

    decompose: publicProcedure
      .input(z.object({
        taskDescription: z.string().min(5).max(500),
        context: z.string().optional().default(""),
        priority: z.enum(["urgente", "alta", "media", "baixa", "sem"]).optional().default("sem"),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          if (!ctx.user) {
            throw new Error("User not authenticated");
          }

          const decomposition = await decomposeTaskWithAI(input.taskDescription, input.context);

          let taskResult;
          try {
            taskResult = await db.createTask(
              ctx.user.id,
              input.taskDescription,
              input.context,
              decomposition.totalEstimatedTime,
              decomposition.overallDifficulty,
              input.priority
            );
          } catch (dbError) {
            console.error("Database error creating task:", dbError);
            throw new Error("Failed to save task to database");
          }

          // Get the task ID from the result
          const taskId = typeof taskResult === 'object' && 'insertId' in taskResult ? (taskResult.insertId as number) : 0;
          if (!taskId) {
            throw new Error("Failed to get task ID from database");
          }

          // Create micro-steps
          await db.createMicroSteps(
            taskId as number,
            decomposition.steps.map((step: any, index: number) => ({
              title: step.title,
              description: step.description,
              estimatedTime: step.estimatedTime,
              difficulty: step.difficulty,
              order: index + 1,
            }))
          );

          // Save to decomposition history
          await db.saveDecompositionHistory(ctx.user.id, input.taskDescription, decomposition);

          return {
            taskId,
            ...decomposition,
          };
        } catch (error) {
          console.error("Error decomposing task:", error);
          throw new Error("Failed to decompose task with AI");
        }
      }),

    decomposeExisting: publicProcedure
      .input(z.object({
        taskId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          if (!ctx.user) {
            throw new Error("User not authenticated");
          }

          const userTasks = await db.getUserTasks(ctx.user.id);
          const task = userTasks.find(t => t.id === input.taskId);
          if (!task) {
            throw new Error("Task not found");
          }

          const decomposition = await decomposeTaskWithAI(
            task.title,
            task.totalEstimatedTime ? `Tempo estimado: ${task.totalEstimatedTime} min` : ""
          );

          await db.createMicroSteps(
            task.id,
            decomposition.steps.map((step: any, index: number) => ({
              title: step.title,
              description: step.description,
              estimatedTime: step.estimatedTime,
              difficulty: step.difficulty,
              order: index + 1,
            }))
          );

          await db.updateTaskDetails(task.id, {
            totalEstimatedTime: decomposition.totalEstimatedTime,
          });

          await db.saveDecompositionHistory(ctx.user.id, task.title, decomposition);

          return {
            taskId: task.id,
            ...decomposition,
          };
        } catch (error) {
          console.error("Error decomposing existing task:", error);
          throw new Error("Failed to decompose task with AI");
        }
      }),

    list: publicProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }
        const userTasks = await db.getUserTasks(ctx.user.id);
        
        // Enrich tasks with micro-steps
        const tasksWithSteps = await Promise.all(
          userTasks.map(async (task) => {
            const steps = await db.getTaskMicroSteps(task.id);
            const completedSteps = steps.filter(s => s.completed).length;
            return {
              ...task,
              steps,
              progress: steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0,
            };
          })
        );

        return tasksWithSteps;
      }),

    updateMicroStepStatus: publicProcedure
      .input(z.object({
        microStepId: z.number(),
        completed: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateMicroStepStatus(input.microStepId, input.completed);
        return { success: true };
      }),

    addMicroStep: publicProcedure
      .input(z.object({
        taskId: z.number(),
        title: z.string().trim().min(1).max(300),
      }))
      .mutation(async ({ input }) => {
        const result = await db.addMicroStep(input.taskId, input.title);
        return { success: true, microStepId: result.insertId };
      }),

    updateMicroStep: publicProcedure
      .input(z.object({
        microStepId: z.number(),
        title: z.string().trim().min(1).max(300),
      }))
      .mutation(async ({ input }) => {
        await db.updateMicroStepDetails(input.microStepId, { title: input.title });
        return { success: true };
      }),

    deleteMicroStep: publicProcedure
      .input(z.object({
        microStepId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.deleteMicroStep(input.microStepId);
        return { success: true };
      }),

    updateTaskStatus: publicProcedure
      .input(z.object({
        taskId: z.number(),
        status: z.enum(["pending", "in_progress", "completed"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateTaskStatus(input.taskId, input.status);
        return { success: true };
      }),

    setScheduledTime: publicProcedure
      .input(z.object({
        taskId: z.number(),
        scheduledTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateTaskScheduledTime(input.taskId, input.scheduledTime);
        return { success: true };
      }),

    setPlannedDate: publicProcedure
      .input(z.object({
        taskId: z.number(),
        plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateTaskPlannedDate(input.taskId, input.plannedDate);
        return { success: true };
      }),

    getDecompositionHistory: publicProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }
        const history = await db.getUserDecompositionHistory(ctx.user.id);
        return history;
      }),

    deleteTask: publicProcedure
      .input(z.object({
        taskId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }
        try {
          await db.deleteTask(input.taskId);
          return { success: true };
        } catch (error) {
          console.error("Error deleting task:", error);
          throw new Error("Failed to delete task");
        }
      }),

    getTaskById: publicProcedure
      .input(z.object({
        taskId: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }
        try {
          const tasks = await db.getUserTasks(ctx.user.id);
          return tasks.find(t => t.id === input.taskId) || null;
        } catch (error) {
          console.error("Error fetching task:", error);
          return null;
        }
      }),
  }),

  // ===== Google Calendar Routes =====
  googleCalendar: router({
    getAuthUrl: publicProcedure
      .query(() => {
        try {
          const url = getGoogleAuthUrl();
          return { url };
        } catch (error) {
          console.error("Error getting Google auth URL:", error);
          throw new Error("Failed to get Google auth URL");
        }
      }),

    exchangeCode: publicProcedure
      .input(z.object({
        code: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }
        try {
          const tokens = await getTokensFromCode(input.code);
          
          // Save tokens to database
          await googleCalendarDb.saveGoogleCalendarToken(
            ctx.user.id,
            tokens.access_token || "",
            tokens.refresh_token,
            undefined
          );

          // Try to create Flow calendar
          try {
            if (tokens.access_token) {
              const calendar = await createFlowCalendar(tokens.access_token);
              await googleCalendarDb.updateGoogleCalendarId(ctx.user.id, calendar.id || "");
            }
          } catch (calendarError) {
            console.warn("Could not create Flow calendar:", calendarError);
          }

          return { success: true };
        } catch (error) {
          console.error("Error exchanging code:", error);
          throw new Error("Failed to exchange authorization code");
        }
      }),

    getCalendars: publicProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }
        try {
          const token = await googleCalendarDb.getGoogleCalendarToken(ctx.user.id);
          if (!token || !token.accessToken) {
            return [];
          }
          const calendars = await getCalendarList(token.accessToken);
          return calendars;
        } catch (error) {
          console.error("Error getting calendars:", error);
          return [];
        }
      }),

    exportTask: publicProcedure
      .input(z.object({
        taskId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }
        try {
          const token = await googleCalendarDb.getGoogleCalendarToken(ctx.user.id);
          if (!token || !token.accessToken) {
            throw new Error("Google Calendar not connected");
          }

          // Get task from database
          const tasks = await db.getUserTasks(ctx.user.id);
          const task = tasks.find(t => t.id === input.taskId);
          if (!task) {
            throw new Error("Task not found");
          }

          // Export to Google Calendar
          const event = await exportTaskToCalendar(
            token.accessToken,
            {
              id: task.id,
              title: task.title,
              description: task.description,
              totalEstimatedTime: task.totalEstimatedTime,
              createdAt: task.createdAt,
            },
            token.calendarId
          );

          return { success: true, eventId: event.id };
        } catch (error) {
          console.error("Error exporting task:", error);
          throw new Error("Failed to export task to Google Calendar");
        }
      }),

    disconnect: publicProcedure
      .mutation(async ({ ctx }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }
        try {
          await googleCalendarDb.deleteGoogleCalendarToken(ctx.user.id);
          return { success: true };
        } catch (error) {
          console.error("Error disconnecting Google Calendar:", error);
          throw new Error("Failed to disconnect Google Calendar");
        }
      }),
  }),

  practices: router({
    getAll: publicProcedure
      .query(async () => {
        const allPractices = await db.getAllPractices();
        
        // Group by category
        const grouped = {
          focus: allPractices.filter(p => p.category === "focus"),
          relief: allPractices.filter(p => p.category === "relief"),
          inspiration: allPractices.filter(p => p.category === "inspiration"),
        };

        return grouped;
      }),

    logProgress: publicProcedure
      .input(z.object({
        practiceId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }
        await db.logPracticeProgress(ctx.user.id, input.practiceId);
        return { success: true };
      }),

    getUserProgress: publicProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }
        const progress = await db.getUserPracticeProgress(ctx.user.id);
        return progress;
      }),

    logCompletion: publicProcedure
      .input(z.object({
        practiceId: z.number(),
        duration: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }
        // Log practice completion
        await db.logPracticeProgress(ctx.user.id, input.practiceId);
        return { success: true };
      }),
  }),

  notifications: router({
    getVapidPublicKey: publicProcedure
      .query(() => ENV.vapidPublicKey),

    subscribe: publicProcedure
      .input(z.object({
        endpoint: z.string(),
        keys: z.object({
          p256dh: z.string(),
          auth: z.string(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }
        await db.upsertPushSubscription(ctx.user.id, input.endpoint, input.keys.p256dh, input.keys.auth);
        return { success: true };
      }),

    unsubscribe: publicProcedure
      .input(z.object({ endpoint: z.string() }))
      .mutation(async ({ input }) => {
        await db.deletePushSubscription(input.endpoint);
        return { success: true };
      }),

    getSettings: publicProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }
        const saved = await db.getNotificationSettings(ctx.user.id);
        return mergeNotificationSettings(saved);
      }),

    saveSettings: publicProcedure
      .input(z.object({
        anchorsEnabled: z.boolean(),
        reminders: z.record(z.string(), z.object({ enabled: z.boolean(), time: z.string() })),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }
        await db.saveNotificationSettings(ctx.user.id, input);
        return { success: true };
      }),

    // Aviso geral (ex.: "nova versão disponível") — enviado sob demanda,
    // não faz parte da varredura agendada do cron. Restrito a admin.
    broadcast: publicProcedure
      .input(z.object({
        title: z.string().trim().min(1).max(80),
        body: z.string().trim().min(1).max(200),
        url: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
        }

        const userIds = await db.getAllUserIdsWithPushSubscriptions();
        const results = await Promise.allSettled(
          userIds.map(userId =>
            sendPushToUser(userId, { title: input.title, body: input.body, url: input.url || "/dashboard" })
          )
        );
        const failed = results.filter(r => r.status === "rejected").length;

        return { sent: userIds.length - failed, total: userIds.length };
      }),
  }),
});

export type AppRouter = typeof appRouter;
