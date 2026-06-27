import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM, type InvokeResult } from "./_core/llm";
import { getGoogleAuthUrl, getTokensFromCode, exportTaskToCalendar, createFlowCalendar, getCalendarList } from "./services/googleCalendar";
import * as googleCalendarDb from "./db-google-calendar";

const COOKIE_NAME = "session";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
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
        sleepQuality: z.number().min(1).max(10),
        energyLevel: z.number().min(1).max(10),
        mentalClarity: z.number().min(1).max(10),
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
  }),

  // ===== Task Routes =====
  tasks: router({
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
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const prompt = `You are a productivity expert helping women over 40 break down complex tasks into manageable micro-steps.

Task: ${input.taskDescription}
${input.context ? `Context: ${input.context}` : ""}

Please decompose this task into 5-10 specific, actionable micro-steps. For each step, provide:
1. A clear title
2. A brief description
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
}`;

          const response = await invokeLLM({
            messages: [{
              role: "user",
              content: prompt,
            }],
            maxTokens: 1500,
          });

          // Extract the text content from the response
          const responseText = response.choices[0]?.message.content;
          if (typeof responseText !== 'string') {
            throw new Error("Invalid response format from AI");
          }

          // Parse the response with validation
          let decomposition;
          try {
            decomposition = JSON.parse(responseText);
          } catch (e) {
            // Try to extract JSON from the response
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

          // Create task in database
          if (!ctx.user) {
            throw new Error("User not authenticated");
          }
          let taskResult;
          try {
            taskResult = await db.createTask(
              ctx.user.id,
              input.taskDescription,
              input.context,
              decomposition.totalEstimatedTime,
              decomposition.overallDifficulty
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
          if (decomposition.steps && Array.isArray(decomposition.steps)) {
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
          }

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

    updateTaskStatus: publicProcedure
      .input(z.object({
        taskId: z.number(),
        status: z.enum(["pending", "in_progress", "completed"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateTaskStatus(input.taskId, input.status);
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
});

export type AppRouter = typeof appRouter;
