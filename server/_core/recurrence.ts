import * as db from "../db";

// Datas são strings "YYYY-MM-DD"; ancorar em meio-dia UTC evita que somar
// dias role pra data errada perto de vira-fuso/DST (mesmo cuidado que
// brazilNow() já toma em cronRoutes.ts).
function addDaysUTC(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekdayOfUTC(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay();
}

function matchesRule(rule: string, dateStr: string): boolean {
  if (rule === "daily") return true;
  if (rule.startsWith("weekly:")) {
    const days = rule.slice("weekly:".length).split(",").map(Number);
    return days.includes(weekdayOfUTC(dateStr));
  }
  return false;
}

const WINDOW_DAYS = 14;

// Mantém uma janela rolante de WINDOW_DAYS dias com ocorrências já geradas
// pra cada tarefa recorrente. Chamado a partir do mesmo cron que já varre
// notificações (server/_core/cronRoutes.ts) — sem precisar de um agendador
// separado. Idempotente: cada chamada confere as datas já geradas antes de
// criar, então rodar de novo (a cada poucos minutos) não duplica nada.
export async function generateUpcomingOccurrences(todayStr: string) {
  const roots = await db.getActiveRecurrenceRoots();
  let created = 0;

  for (const root of roots) {
    if (!root.recurrenceRule) continue;
    const existingDates = await db.getOccurrenceDatesForSeries(root.id);

    for (let offset = 0; offset < WINDOW_DAYS; offset++) {
      const date = addDaysUTC(todayStr, offset);
      if (root.recurrenceEndDate && date > root.recurrenceEndDate) break;
      if (!matchesRule(root.recurrenceRule, date)) continue;
      if (date === root.plannedDate) continue; // a própria raiz já cobre essa data
      if (existingDates.has(date)) continue;

      await db.createTaskOccurrence(
        {
          userId: root.userId,
          title: root.title,
          priority: root.priority,
          totalEstimatedTime: root.totalEstimatedTime,
          scheduledTime: root.scheduledTime,
        },
        root.id,
        date
      );
      created++;
    }
  }

  return { created };
}
