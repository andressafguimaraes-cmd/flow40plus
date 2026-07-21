import type { Express } from "express";
import * as db from "../db";
import { ENV } from "./env";
import { sendPushToUser } from "./push";
import { generateUpcomingOccurrences } from "./recurrence";
import { TIMED_REMINDERS, mergeNotificationSettings } from "@shared/notificationSettings";

function brazilNow(): { date: string; time: string } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

// This project runs Vercel Hobby, whose native Cron Jobs only fire once a
// day (and even then, "sometime within the target hour" — no minute-level
// guarantee). A per-task anchor time or a user-customized reminder time can
// land in any minute of any hour, so precision has to come from an external
// scheduler (cron-job.org or similar) hitting this endpoint every few
// minutes, not from Vercel's own Cron. To make that polling interval
// forgiving (it won't always land exactly on the target minute), each
// reminder fires the first time "now >= configured time" — not on an exact
// match — so a 5-15min poll gap just means it's a few minutes late, never
// missed or duplicated (guarded by notification_log).
export function registerCronRoutes(app: Express) {
  app.get("/api/cron/notifications", async (req, res) => {
    // Aceita o segredo tanto no header (Authorization: Bearer ...) quanto
    // via ?secret=... na URL — alguns serviços de cron gratuitos (ex.
    // cron-job.org) não deixam configurar headers customizados com
    // facilidade, então um link com o segredo embutido é mais prático.
    const authHeader = req.headers.authorization;
    const querySecret = req.query.secret;
    const authorized =
      (!!ENV.cronSecret && authHeader === `Bearer ${ENV.cronSecret}`) ||
      (!!ENV.cronSecret && querySecret === ENV.cronSecret);
    if (!authorized) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { date: today, time: nowHM } = brazilNow();
    const results = { dailySent: 0, anchorsSent: 0, errors: 0, occurrencesCreated: 0 };

    try {
      try {
        const { created } = await generateUpcomingOccurrences(today);
        results.occurrencesCreated = created;
      } catch (error) {
        console.error("[Cron] Recurrence generation failed:", error);
        results.errors++;
      }

      const allSettings = await db.getAllNotificationSettings();
      for (const { userId, settings } of allSettings) {
        const merged = mergeNotificationSettings(settings);
        for (const reminder of TIMED_REMINDERS) {
          const state = merged.reminders[reminder.id];
          if (!state?.enabled || nowHM < state.time) continue;

          const alreadySent = await db.wasNotificationSent(userId, reminder.id, 0, today);
          if (alreadySent) continue;

          try {
            await sendPushToUser(userId, { title: reminder.title, body: reminder.body, url: reminder.url });
            await db.markNotificationSent(userId, reminder.id, 0, today);
            results.dailySent++;
          } catch (error) {
            console.error(`[Cron] Failed to send "${reminder.id}" to user ${userId}:`, error);
            results.errors++;
          }
        }
      }

      const anchorTasks = await db.getAnchorTasksForDate(today);
      for (const task of anchorTasks) {
        if (!task.scheduledTime || nowHM < task.scheduledTime) continue;

        const alreadySent = await db.wasNotificationSent(task.userId, "anchor", task.id, today);
        if (alreadySent) continue;

        const settings = await db.getNotificationSettings(task.userId);
        if (!mergeNotificationSettings(settings).anchorsEnabled) continue;

        try {
          await sendPushToUser(task.userId, {
            title: `⏰ ${task.title}`,
            body: `Hora do seu compromisso marcado para ${task.scheduledTime}.`,
            url: "/tasks",
          });
          await db.markNotificationSent(task.userId, "anchor", task.id, today);
          results.anchorsSent++;
        } catch (error) {
          console.error(`[Cron] Failed to send anchor for task ${task.id}:`, error);
          results.errors++;
        }
      }

      res.status(200).json({ ok: true, ...results });
    } catch (error) {
      console.error("[Cron] Notification sweep failed:", error);
      res.status(500).json({ ok: false, error: String(error) });
    }
  });
}
