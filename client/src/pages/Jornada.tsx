import { trpc } from "@/lib/trpc";
import { useThemeColors } from "@/hooks/useThemeColors";

// Paleta específica desta tela (mockup fornecido)
const SAGE = "#5FA37A";
const ORANGE = "#E8813A";

const WEEKDAYS_SHORT = ["S", "T", "Q", "Q", "S"]; // Seg a Sex
const WEEKDAYS_FULL = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const MONTH_NAMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getWeekdaysMonToFri(base: Date): Date[] {
  const day = base.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setDate(base.getDate() + mondayOffset);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function relativeDayLabel(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);
  const weekday = WEEKDAYS_FULL[d.getDay()];
  if (diffDays === 0) return `Hoje, ${weekday}`;
  if (diffDays === 1) return `Ontem, ${weekday}`;
  return `${weekday}, ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`;
}

export default function Jornada() {
  const { NAVY, BG_APP, CARD, TEXT_MUTED, LINE, isDark } = useThemeColors();
  const NOTE_BG = isDark ? "#22332B" : "#FAFBF9";
  const { data: history } = trpc.checkIns.getHistory.useQuery();
  const { data: tasks } = trpc.tasks.list.useQuery();

  const today = new Date();
  const weekDates = getWeekdaysMonToFri(today);
  const allTasks = tasks ?? [];
  const allHistory = history ?? [];

  const completedCountForDay = (day: Date) => {
    const key = dateKey(day);
    return allTasks.filter(t => t.status === "completed" && t.updatedAt && dateKey(new Date(t.updatedAt)) === key).length;
  };

  const energyForDay = (day: Date): number | null => {
    const key = dateKey(day);
    const entry = allHistory.find(h => dateKey(new Date(h.createdAt)) === key);
    return entry?.energyLevel ?? null;
  };

  const dayCounts = weekDates.map(completedCountForDay);
  const maxCount = Math.max(...dayCounts, 1);

  const sortedHistory = [...allHistory].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const todayKey = dateKey(today);

  return (
    <div className="min-h-screen pb-24" style={{ background: BG_APP }}>
      <div className="px-5 pt-6">
        <h1 className="text-[22px] font-bold" style={{ color: NAVY }}>Sua Jornada</h1>
        <p className="text-[13px] font-medium mt-1 mb-6" style={{ color: TEXT_MUTED }}>O registro visual da sua constância e equilíbrio.</p>

        {/* Gráfico semanal */}
        <div className="rounded-[20px] p-5 mb-6" style={{ background: CARD, boxShadow: "0 2px 12px rgba(22,54,90,0.04)" }}>
          <div className="flex items-center justify-between mb-5">
            <span className="text-sm font-bold" style={{ color: NAVY }}>Visão Semanal</span>
            <div className="flex gap-3 text-[11px] font-semibold" style={{ color: NAVY }}>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SAGE }} />Decisões</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ORANGE }} />Energia</div>
            </div>
          </div>

          <div className="relative flex items-end justify-between px-2" style={{ height: 120, borderBottom: `1px solid ${LINE}` }}>
            {weekDates.map((d, i) => {
              const count = dayCounts[i];
              const barHeight = count > 0 ? Math.max((count / maxCount) * 95, 10) : 3;
              const energia = energyForDay(d);
              const dotBottom = energia != null ? 18 + ((energia - 1) / 4) * 90 : null;
              const isToday = dateKey(d) === todayKey;
              return (
                <div key={i} className="flex-1 flex items-end justify-center" style={{ height: "100%" }}>
                  <div className="relative w-3.5 rounded-t transition-all" style={{ height: barHeight, background: isToday ? SAGE : "rgba(95,163,122,0.2)" }}>
                    {dotBottom != null && (
                      <div
                        className="absolute rounded-full"
                        style={{ width: 6, height: 6, background: ORANGE, left: "50%", bottom: dotBottom, transform: "translateX(-50%)", boxShadow: "0 0 0 3px rgba(232,129,58,0.2)", zIndex: 1 }}
                      />
                    )}
                  </div>
                </div>
              );
            })}

            {/* Linha conectando os pontos de energia */}
            {(() => {
              const points = weekDates
                .map((d, i) => {
                  const energia = energyForDay(d);
                  if (energia == null) return null;
                  const dotBottom = 18 + ((energia - 1) / 4) * 90;
                  const x = (i + 0.5) * (100 / 5);
                  const y = 120 - (dotBottom + 3);
                  return { x, y };
                })
                .filter((p): p is { x: number; y: number } => p != null);
              if (points.length < 2) return null;
              return (
                <svg
                  className="absolute inset-0 pointer-events-none"
                  width="100%"
                  height="100%"
                  viewBox="0 0 100 120"
                  preserveAspectRatio="none"
                >
                  <polyline
                    points={points.map(p => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke={ORANGE}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              );
            })()}
          </div>
          <div className="flex justify-between px-2 pt-2">
            {WEEKDAYS_SHORT.map((w, i) => (
              <span key={i} className="flex-1 text-center text-[11px] font-semibold" style={{ color: TEXT_MUTED }}>{w}</span>
            ))}
          </div>
        </div>

        {/* Histórico de Impacto */}
        <p className="text-[13px] font-bold uppercase mb-4" style={{ color: NAVY, letterSpacing: "0.3px" }}>Histórico de Impacto</p>

        {sortedHistory.length === 0 ? (
          <p className="text-center text-[12.5px] font-medium py-6" style={{ color: TEXT_MUTED }}>
            Faça seu check-up matinal para começar a registrar sua jornada. 🌿
          </p>
        ) : (
          <div className="relative flex flex-col gap-4 pl-3">
            <div className="absolute w-px" style={{ left: 4, top: 10, bottom: 10, background: LINE }} />
            {sortedHistory.map(entry => {
              const entryDate = new Date(entry.createdAt);
              const isToday = dateKey(entryDate) === todayKey;
              const completed = completedCountForDay(entryDate);
              return (
                <div key={entry.id} className="relative pl-4">
                  <div className="absolute rounded-full" style={{ left: 0, top: 6, width: 9, height: 9, background: isToday ? SAGE : LINE, border: `2px solid ${BG_APP}` }} />
                  <div className="rounded-2xl p-3.5" style={{ background: CARD, boxShadow: "0 2px 10px rgba(22,54,90,0.03)" }}>
                    <p className="text-xs font-bold mb-1.5" style={{ color: NAVY }}>{relativeDayLabel(entryDate)}</p>
                    <div className="flex gap-3 text-[11px] font-medium mb-2" style={{ color: TEXT_MUTED }}>
                      <span>✅ <strong style={{ color: NAVY }}>{completed}</strong> concluídas</span>
                      <span>⚡ Energia média: <strong style={{ color: NAVY }}>{entry.energyLevel}/5</strong></span>
                    </div>
                    {entry.notes && (
                      <p className="text-xs italic leading-relaxed rounded-[10px] p-2.5 m-0" style={{ color: NAVY, background: NOTE_BG }}>
                        "{entry.notes}"
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
