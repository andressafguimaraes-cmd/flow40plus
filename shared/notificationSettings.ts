/**
 * Single source of truth for every fixed-time notification (check-up,
 * pausas, resumo da manhã, recalibração da tarde) — used by the client
 * (Perfil.tsx settings UI) and the server (daily-reminders cron, which
 * needs each kind's push title/body/url). Anchor notifications are handled
 * separately since they use each task's own `scheduledTime` instead of a
 * fixed daily time.
 */

export type NotificationKind =
  | "checkin"
  | "pausa_manha"
  | "pausa_tarde"
  | "pausa_noite"
  | "task_summary"
  | "recalibrate";

export interface TimedReminderConfig {
  id: NotificationKind;
  icon: string;
  label: string;
  defaultTime: string;
  title: string;
  body: string;
  url: string;
}

export const TIMED_REMINDERS: TimedReminderConfig[] = [
  {
    id: "checkin",
    icon: "☀️",
    label: "Check-up Matinal",
    defaultTime: "08:00",
    title: "Hora do check-up ☀️",
    body: "Como você está se sentindo hoje? Leva menos de 1 minuto.",
    url: "/dashboard",
  },
  {
    id: "pausa_manha",
    icon: "🌿",
    label: "Pausa da Manhã",
    defaultTime: "10:00",
    title: "🌿 Pausa da Manhã",
    body: "Hora de uma pausa consciente. Dá uma olhada na Próxima Melhor Decisão para você agora.",
    url: "/dashboard",
  },
  {
    id: "pausa_tarde",
    icon: "💧",
    label: "Pausa da Tarde",
    defaultTime: "15:00",
    title: "💧 Pausa da Tarde",
    body: "Que tal uma pausa para se hidratar? Sua Próxima Melhor Decisão está te esperando.",
    url: "/dashboard",
  },
  {
    id: "pausa_noite",
    icon: "🌙",
    label: "Pausa Noturna",
    defaultTime: "20:00",
    title: "🌙 Pausa Noturna",
    body: "Desacelere por um instante. Veja a Próxima Melhor Decisão antes de encerrar o dia.",
    url: "/dashboard",
  },
  {
    id: "task_summary",
    icon: "📆",
    label: "Resumo da Manhã",
    defaultTime: "08:30",
    title: "📆 Seu dia em resumo",
    body: "Confira as tarefas planejadas para hoje no Planejamento.",
    url: "/planejamento",
  },
  {
    id: "recalibrate",
    icon: "🔄",
    label: "Recalibração da Tarde",
    defaultTime: "14:00",
    title: "🔄 Como está sua tarde?",
    body: "Vale a pena repensar o que ainda faz sentido pra hoje — sem culpa se os planos mudaram.",
    url: "/dashboard",
  },
];

// Pausas condicionadas a atividade: se a usuária não concluiu nenhuma
// tarefa no dia, "hora da pausa" não faz sentido (não tem do que
// descansar) — troca pela mensagem abaixo em vez de ficar muda.
// Recalibração fica de fora de propósito: não é sobre "merecer" a
// pausa, é sobre repensar o que ainda faz sentido, então dispara sempre.
export const PAUSA_IDS: readonly NotificationKind[] = ["pausa_manha", "pausa_tarde", "pausa_noite"];

export const NO_ACTIVITY_MESSAGE = {
  title: "🌱 Precisa de ajuda pra reorganizar o dia?",
  body: "Sentiu que o dia não engrenou ainda? Vamos ver juntas o que faz mais sentido agora.",
  url: "/dashboard",
};

export interface NotificationSettings {
  anchorsEnabled: boolean;
  reminders: Record<NotificationKind, { enabled: boolean; time: string }>;
}

export function defaultNotificationSettings(): NotificationSettings {
  return {
    anchorsEnabled: true,
    reminders: TIMED_REMINDERS.reduce(
      (acc, r) => ({ ...acc, [r.id]: { enabled: true, time: r.defaultTime } }),
      {} as NotificationSettings["reminders"]
    ),
  };
}

export function mergeNotificationSettings(saved: Record<string, unknown> | null | undefined): NotificationSettings {
  const defaults = defaultNotificationSettings();
  if (!saved) return defaults;
  const savedReminders = (saved.reminders ?? {}) as Partial<NotificationSettings["reminders"]>;
  return {
    anchorsEnabled: typeof saved.anchorsEnabled === "boolean" ? saved.anchorsEnabled : defaults.anchorsEnabled,
    reminders: { ...defaults.reminders, ...savedReminders },
  };
}
