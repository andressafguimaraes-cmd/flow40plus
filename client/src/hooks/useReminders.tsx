import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { REMINDERS, getReminderSettings } from "@/lib/reminderSettings";

const FIRED_KEY_PREFIX = "flow40_reminder_fired_";
const CHECK_INTERVAL_MS = 60_000;

function todayKey() {
  return new Date().toDateString();
}

function currentHM() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/**
 * Verifica a cada minuto se algum lembrete de pausa configurado (ver reminderSettings.ts)
 * bate com o horário atual, disparando no máximo uma vez por dia por lembrete.
 */
export function useReminders(enabled: boolean) {
  const [, setLocation] = useLocation();
  const navigateRef = useRef(setLocation);
  navigateRef.current = setLocation;

  useEffect(() => {
    if (!enabled) return;

    const checkReminders = () => {
      const settings = getReminderSettings();
      const nowHM = currentHM();

      for (const reminder of REMINDERS) {
        const state = settings[reminder.id];
        if (!state?.enabled || state.time !== nowHM) continue;

        const firedKey = `${FIRED_KEY_PREFIX}${reminder.id}`;
        if (window.localStorage.getItem(firedKey) === todayKey()) continue;
        window.localStorage.setItem(firedKey, todayKey());

        toast.custom(t => (
          <button
            onClick={() => { navigateRef.current("/dashboard"); toast.dismiss(t); }}
            className="w-full flex items-start gap-3 bg-card border border-accent/30 rounded-2xl shadow-lg p-4 text-left"
          >
            <span className="text-xl flex-shrink-0">{reminder.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-light text-foreground leading-snug">{reminder.message}</p>
              <p className="text-xs text-accent font-semibold mt-1.5">Ver Próxima Melhor Decisão →</p>
            </div>
          </button>
        ), { duration: 10000 });
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled]);
}
