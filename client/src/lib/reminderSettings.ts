export type ReminderId = "manha" | "tarde" | "noite";

export interface ReminderConfig {
  id: ReminderId;
  icon: string;
  label: string;
  defaultTime: string;
  message: string;
}

export const REMINDERS: ReminderConfig[] = [
  {
    id: "manha",
    icon: "🌿",
    label: "Pausa da Manhã",
    defaultTime: "10:00",
    message: "Hora de uma pausa consciente. Dá uma olhada na Próxima Melhor Decisão para você agora.",
  },
  {
    id: "tarde",
    icon: "💧",
    label: "Pausa da Tarde",
    defaultTime: "15:00",
    message: "Que tal uma pausa para se hidratar? Sua Próxima Melhor Decisão está te esperando.",
  },
  {
    id: "noite",
    icon: "🌙",
    label: "Pausa Noturna",
    defaultTime: "20:00",
    message: "Desacelere por um instante. Veja a Próxima Melhor Decisão antes de encerrar o dia.",
  },
];

export type ReminderState = Record<ReminderId, { enabled: boolean; time: string }>;

const STORAGE_KEY = "flow40_reminder_settings";

function defaultReminderState(): ReminderState {
  return REMINDERS.reduce(
    (acc, r) => ({ ...acc, [r.id]: { enabled: true, time: r.defaultTime } }),
    {} as ReminderState
  );
}

export function getReminderSettings(): ReminderState {
  const defaults = defaultReminderState();
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

export function saveReminderSettings(settings: ReminderState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
