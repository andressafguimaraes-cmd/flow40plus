import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// Paleta específica desta tela (mockup fornecido)
const NAVY = "#16365A";
const SAGE = "#5FA37A";
const SAGE_DARK = "#3F8A63";
const TEXT_MUTED = "#8C948C";
const LINE = "#E7E5DE";
const BG_APP = "#EEF3EC";

const LOAD_LEVELS = {
  livre: { label: "Livre", dot: "#BEC3BA", bg: "#EDECE6", icon: "🌿" },
  leve: { label: "Leve", dot: "#5FA37A", bg: "#DCEEDF", icon: "🌤️" },
  moderado: { label: "Moderado", dot: "#D9AE45", bg: "#F5EBC9", icon: "⚖️" },
  intenso: { label: "Intenso", dot: "#E8813A", bg: "#F5E1D0", icon: "📊" },
  sobrecarregado: { label: "Sobrecarregado", dot: "#C65B5B", bg: "#F6D9D9", icon: "⚠️" },
} as const;
type LoadLevelKey = keyof typeof LOAD_LEVELS;
const LEGEND_ORDER: LoadLevelKey[] = ["leve", "moderado", "intenso", "sobrecarregado", "livre"];

const PRIORITY_STYLES: Record<string, { accent: string; tagBg: string; tagText: string; label: string }> = {
  urgente: { accent: "#E4A0A0", tagBg: "#F6D9D9", tagText: "#B85C5C", label: "Urgente" },
  alta: { accent: "#EAC77E", tagBg: "#F7EAD0", tagText: "#B08A3E", label: "Alta" },
  media: { accent: "#9BC0E0", tagBg: "#DCE7F2", tagText: "#4E7BA6", label: "Média" },
  baixa: { accent: "#A9CBB0", tagBg: "#E1EEE3", tagText: "#3F8A63", label: "Baixa" },
  sem: { accent: "#D2D2CA", tagBg: "#EDECE6", tagText: "#8C948C", label: "Sem prioridade" },
};

const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const WEEKDAYS_FULL = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getWeekDates(base: Date, offset: number): Date[] {
  const sunday = new Date(base);
  sunday.setDate(base.getDate() - base.getDay() + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

function formatMinutes(min: number): string {
  if (min === 0) return "0min";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function getLoadLevel(totalMinutes: number): LoadLevelKey {
  if (totalMinutes === 0) return "livre";
  if (totalMinutes <= 60) return "leve";
  if (totalMinutes <= 180) return "moderado";
  if (totalMinutes <= 300) return "intenso";
  return "sobrecarregado";
}

export default function Planejamento() {
  const [, setLocation] = useLocation();
  const { data: tasks, refetch } = trpc.tasks.list.useQuery();
  const updateStatus = trpc.tasks.updateTaskStatus.useMutation({ onSuccess: () => refetch() });
  const setScheduledTime = trpc.tasks.setScheduledTime.useMutation({ onSuccess: () => refetch() });
  const setPlannedDate = trpc.tasks.setPlannedDate.useMutation({ onSuccess: () => refetch() });

  const today = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => dateKey(today));
  const [unplannedOpen, setUnplannedOpen] = useState(true);
  const [timeModalTaskId, setTimeModalTaskId] = useState<number | null>(null);
  const [timeInput, setTimeInput] = useState("09:00");

  const weekDates = getWeekDates(today, weekOffset);
  const monthLabel = `${MONTH_NAMES[weekDates[0].getMonth()]} ${weekDates[0].getFullYear()}`;

  const allTasks = tasks ?? [];
  const tasksByDate = (date: string) => allTasks.filter(t => t.plannedDate === date);
  const unplannedTasks = allTasks.filter(t => !t.plannedDate);

  const getDayLoadMinutes = (date: string) =>
    tasksByDate(date).reduce((sum, t) => sum + (t.totalEstimatedTime ?? 0), 0);

  const dayTasksAll = tasksByDate(selectedDate);
  const anchors = [...dayTasksAll]
    .filter(t => t.scheduledTime)
    .sort((a, b) => (a.scheduledTime! < b.scheduledTime! ? -1 : 1));
  const flexible = dayTasksAll.filter(t => !t.scheduledTime);

  const selectedLoadMinutes = getDayLoadMinutes(selectedDate);
  const loadLevelKey = getLoadLevel(selectedLoadMinutes);
  const loadLevel = LOAD_LEVELS[loadLevelKey];

  const selectedDateObj = new Date(`${selectedDate}T00:00:00`);
  const selectedLabel = `${WEEKDAYS_FULL[selectedDateObj.getDay()]}, ${selectedDateObj.getDate()} de ${MONTH_NAMES[selectedDateObj.getMonth()].toLowerCase()}`;
  const selectedShort = `${selectedDateObj.getDate()}/${String(selectedDateObj.getMonth() + 1).padStart(2, "0")}`;

  const openTimeModal = (taskId: number, currentTime: string | null | undefined) => {
    setTimeInput(currentTime ?? "09:00");
    setTimeModalTaskId(taskId);
  };

  const handleSaveTime = () => {
    if (timeModalTaskId == null) return;
    setScheduledTime.mutate({ taskId: timeModalTaskId, scheduledTime: timeInput });
    setTimeModalTaskId(null);
  };

  const handleAssignToSelected = (taskId: number) => {
    setPlannedDate.mutate({ taskId, plannedDate: selectedDate });
    toast.success(`Tarefa planejada para ${selectedShort}`);
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: BG_APP }}>
      <div className="px-5 pt-6 pb-1">
        <svg width="70" height="20" viewBox="0 0 70 20" fill="none">
          <path d="M2 10C11 2 17 2 24 8C31 14 37 14 44 8" stroke={SAGE} strokeWidth="2" strokeLinecap="round" />
          <path d="M2 15C11 9 18 9 24 13C30 17 37 15 44 11" stroke="#E8813A" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <h1 className="text-[26px] font-bold mt-1.5" style={{ color: NAVY }}>Planejamento</h1>
        <p className="text-[13px] font-medium mt-0.5 mb-5" style={{ color: TEXT_MUTED }}>Veja o equilíbrio da sua semana.</p>
      </div>

      {/* Mês + navegação de semana */}
      <div className="flex items-center justify-between px-5 mb-3.5">
        <span className="text-[15px] font-bold" style={{ color: SAGE_DARK }}>{monthLabel}</span>
        <div className="flex gap-2">
          <button
            onClick={() => setWeekOffset(o => Math.max(0, o - 1))}
            className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-sm"
            style={{ border: `1px solid ${LINE}`, color: NAVY }}
          >
            ‹
          </button>
          <button
            onClick={() => setWeekOffset(o => o + 1)}
            className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-sm"
            style={{ border: `1px solid ${LINE}`, color: NAVY }}
          >
            ›
          </button>
        </div>
      </div>

      {/* Carrossel semanal */}
      <div className="flex gap-2 px-5 mb-3.5 overflow-x-auto scrollbar-hide">
        {weekDates.map((d, i) => {
          const key = dateKey(d);
          const isSelected = key === selectedDate;
          const level = LOAD_LEVELS[getLoadLevel(getDayLoadMinutes(key))];
          return (
            <button
              key={key}
              onClick={() => setSelectedDate(key)}
              className="flex-shrink-0 w-[50px] py-2.5 rounded-2xl bg-white flex flex-col items-center gap-1"
              style={{ boxShadow: "0 2px 8px rgba(22,54,90,0.05)", border: isSelected ? `1.5px solid ${NAVY}` : "1.5px solid transparent" }}
            >
              <span className="text-[10px] font-semibold uppercase" style={{ color: TEXT_MUTED }}>{WEEKDAYS[i]}</span>
              <span className="text-base font-bold" style={{ color: NAVY }}>{d.getDate()}</span>
              <span className="w-2 h-2 rounded-full" style={{ background: level.dot }} />
              <span className="text-[8.5px] font-semibold" style={{ color: level.dot }}>{level.label}</span>
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 px-5 mb-6">
        {LEGEND_ORDER.map(key => (
          <div key={key} className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: TEXT_MUTED }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: LOAD_LEVELS[key].dot }} />
            {LOAD_LEVELS[key].label}
          </div>
        ))}
      </div>

      <p className="text-[15px] font-bold px-5 mb-3.5" style={{ color: NAVY }}>{selectedLabel}</p>

      {/* Banner de carga do dia */}
      <div className="flex items-center gap-3 mx-5 mb-6 rounded-2xl p-3.5" style={{ background: loadLevel.bg }}>
        <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-base flex-shrink-0" style={{ background: "rgba(255,255,255,0.55)" }}>
          {loadLevel.icon}
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: NAVY }}>Carga do dia: {loadLevel.label}</p>
          <p className="text-xs font-medium" style={{ color: TEXT_MUTED }}>
            {selectedLoadMinutes > 0
              ? `${formatMinutes(selectedLoadMinutes)} de compromissos e tarefas planejadas`
              : "Nenhum compromisso ou tarefa planejada — dia livre."}
          </p>
          {loadLevelKey === "sobrecarregado" && (
            <p className="text-[11.5px] font-semibold mt-1" style={{ color: LOAD_LEVELS.sobrecarregado.dot }}>
              Considere remanejar algumas tarefas para outro dia.
            </p>
          )}
        </div>
      </div>

      {/* Âncoras do dia */}
      <p className="text-[13px] font-bold uppercase tracking-wide px-5 mb-3" style={{ color: NAVY }}>Âncoras do dia</p>
      <div className="px-5 mb-6">
        {anchors.length === 0 ? (
          <p className="text-center text-[12.5px] font-medium py-2" style={{ color: TEXT_MUTED }}>Nenhuma âncora fixa para este dia.</p>
        ) : (
          anchors.map(task => (
            <div key={task.id} className="flex items-center gap-3.5 bg-white rounded-2xl px-4 py-3 mb-2.5" style={{ boxShadow: "0 2px 8px rgba(22,54,90,0.04)" }}>
              <span className="text-[13.5px] font-bold flex-shrink-0" style={{ color: NAVY, minWidth: 48 }}>{task.scheduledTime}</span>
              <span className={`text-[13.5px] font-semibold flex-1 truncate ${task.status === "completed" ? "line-through opacity-50" : ""}`} style={{ color: NAVY }}>
                {task.title}
              </span>
              {task.totalEstimatedTime != null && (
                <span className="text-[11px] font-medium flex-shrink-0" style={{ color: TEXT_MUTED }}>{formatMinutes(task.totalEstimatedTime)}</span>
              )}
              <button
                onClick={() => setScheduledTime.mutate({ taskId: task.id, scheduledTime: null })}
                className="text-[10px] font-semibold underline flex-shrink-0"
                style={{ color: TEXT_MUTED }}
              >
                remover
              </button>
            </div>
          ))
        )}
      </div>

      {/* Tarefas do dia */}
      <div className="flex items-center justify-between px-5 mb-3">
        <span className="text-[13px] font-bold uppercase tracking-wide" style={{ color: NAVY }}>Tarefas do dia</span>
        <button onClick={() => setLocation("/tasks")} className="text-[12.5px] font-semibold" style={{ color: SAGE_DARK }}>
          + Adicionar tarefa
        </button>
      </div>
      <div className="px-5 flex flex-col gap-3 mb-6">
        {flexible.length === 0 ? (
          <p className="text-center text-[12.5px] font-medium py-5" style={{ color: TEXT_MUTED }}>Nenhuma tarefa planejada para este dia. 🌿</p>
        ) : (
          flexible.map(task => {
            const style = PRIORITY_STYLES[task.priority ?? "sem"] ?? PRIORITY_STYLES.sem;
            const done = task.status === "completed";
            return (
              <div key={task.id} className="relative bg-white rounded-2xl pl-[18px] pr-4 py-3.5 flex gap-3 items-start" style={{ boxShadow: "0 2px 10px rgba(22,54,90,0.05)" }}>
                <span className="absolute left-0 top-3.5 bottom-3.5 w-[3px] rounded-[3px]" style={{ background: style.accent }} />
                <button
                  onClick={() => updateStatus.mutate({ taskId: task.id, status: done ? "pending" : "completed" })}
                  className="w-[19px] h-[19px] rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center text-[10px] text-white"
                  style={done ? { background: SAGE } : { border: "1.5px solid #C9CFC7" }}
                >
                  {done && "✓"}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-[14.5px] font-semibold mb-1.5 leading-snug ${done ? "line-through opacity-50" : ""}`} style={{ color: NAVY }}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap text-[11.5px] font-medium" style={{ color: TEXT_MUTED }}>
                    <span className="px-2 py-0.5 rounded-[6px] text-[10.5px] font-semibold" style={{ background: style.tagBg, color: style.tagText }}>
                      {style.label}
                    </span>
                    <span style={{ color: "#D4D4CC" }}>•</span>
                    {task.totalEstimatedTime != null && <span>⏱ {formatMinutes(task.totalEstimatedTime)}</span>}
                    <button onClick={() => openTimeModal(task.id, task.scheduledTime)} className="ml-auto text-[10.5px] font-semibold" style={{ color: SAGE_DARK }}>
                      🕐 âncora
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dica de planejamento */}
      <div className="mx-5 mb-6 rounded-2xl p-4 flex items-center gap-3" style={{ border: `1.5px dashed ${LINE}` }}>
        <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[15px] flex-shrink-0" style={{ background: "#DCEEDF", color: SAGE_DARK }}>
          📅
        </div>
        <div className="text-xs font-medium" style={{ color: TEXT_MUTED }}>
          <strong className="block text-[12.5px] mb-0.5" style={{ color: NAVY }}>Toque em uma tarefa sem data</strong>
          para planejá-la para {selectedShort}
        </div>
      </div>

      {/* Tarefas sem data */}
      <div className="mx-5 mb-4 rounded-[18px] p-3.5" style={{ background: "rgba(95,163,122,0.07)" }}>
        <button onClick={() => setUnplannedOpen(o => !o)} className="w-full flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: NAVY }}>Tarefas sem data</span>
            <span className="text-[11px] font-bold px-2 rounded-full bg-white" style={{ color: SAGE_DARK }}>{unplannedTasks.length}</span>
          </div>
          <span className="text-xs transition-transform" style={{ color: TEXT_MUTED, transform: unplannedOpen ? "rotate(180deg)" : "none" }}>▾</span>
        </button>
        {unplannedOpen && (
          <div className="flex flex-col gap-2 pb-1">
            {unplannedTasks.length === 0 ? (
              <p className="text-center text-[12px] font-medium py-2" style={{ color: TEXT_MUTED }}>Nenhuma tarefa pendente de data. 🌿</p>
            ) : (
              unplannedTasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => handleAssignToSelected(task.id)}
                  className="flex items-center gap-2.5 bg-white rounded-xl px-3.5 py-2.5 text-left active:scale-[0.98] transition-all"
                >
                  <span className="text-xs tracking-tighter" style={{ color: "#C4C9BF" }}>⠿⠿</span>
                  <span className="flex-1 text-[13px] font-semibold truncate" style={{ color: NAVY }}>{task.title}</span>
                  {task.totalEstimatedTime != null && (
                    <span className="text-[11px] font-medium flex-shrink-0" style={{ color: TEXT_MUTED }}>⏱ {formatMinutes(task.totalEstimatedTime)}</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal: definir horário fixo (promover a âncora) */}
      {timeModalTaskId != null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-md bg-white rounded-t-3xl p-5">
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: LINE }} />
            <h3 className="text-base font-bold mb-4" style={{ color: NAVY }}>Definir horário fixo</h3>
            <input
              type="time"
              value={timeInput}
              onChange={e => setTimeInput(e.target.value)}
              className="w-full text-lg font-bold text-center rounded-xl px-3 py-3 mb-4 outline-none"
              style={{ border: `1px solid ${LINE}`, color: NAVY }}
            />
            <div className="flex gap-3">
              <button onClick={() => setTimeModalTaskId(null)} className="flex-1 h-11 rounded-2xl text-sm font-bold" style={{ border: `1px solid ${LINE}`, color: TEXT_MUTED }}>
                Cancelar
              </button>
              <button onClick={handleSaveTime} className="flex-1 h-11 rounded-2xl text-white text-sm font-bold" style={{ background: SAGE }}>
                Tornar Âncora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
