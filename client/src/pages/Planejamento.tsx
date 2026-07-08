import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import { trpc } from "@/lib/trpc";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAY_FULL = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const MONTH_NAMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekDays(base: Date): Date[] {
  const day = base.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setDate(base.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function Planejamento() {
  const { data: tasks, refetch } = trpc.tasks.list.useQuery();
  const updateStatus = trpc.tasks.updateTaskStatus.useMutation({ onSuccess: () => refetch() });
  const setScheduledTime = trpc.tasks.setScheduledTime.useMutation({ onSuccess: () => refetch() });

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [timeModalTaskId, setTimeModalTaskId] = useState<number | null>(null);
  const [timeInput, setTimeInput] = useState("09:00");

  const weekDays = getWeekDays(new Date());
  const selectedKey = dateKey(selectedDate);
  const todayKey = dateKey(new Date());

  const dayTasks = (tasks ?? []).filter(t => dateKey(new Date(t.createdAt)) === selectedKey);
  const anchors = [...dayTasks]
    .filter(t => t.scheduledTime)
    .sort((a, b) => (a.scheduledTime! < b.scheduledTime! ? -1 : a.scheduledTime! > b.scheduledTime! ? 1 : 0));
  const flexible = dayTasks.filter(t => !t.scheduledTime);

  const anchorMinutes = anchors.reduce((sum, t) => sum + (t.totalEstimatedTime ?? 0), 0);
  const isOverloaded = anchorMinutes > 240;

  const timeModalTask = dayTasks.find(t => t.id === timeModalTaskId) ?? null;

  const openTimeModal = (taskId: number, currentTime: string | null | undefined) => {
    setTimeInput(currentTime ?? "09:00");
    setTimeModalTaskId(taskId);
  };

  const handleSaveTime = () => {
    if (timeModalTaskId == null) return;
    setScheduledTime.mutate({ taskId: timeModalTaskId, scheduledTime: timeInput });
    setTimeModalTaskId(null);
  };

  const handleRemoveTime = (taskId: number) => {
    setScheduledTime.mutate({ taskId, scheduledTime: null });
  };

  return (
    <div className="screen-container">
      <AppHeader />

      <div className="px-5 mb-4">
        <h2 className="text-2xl font-black text-foreground">Planejamento</h2>
        <p className="text-sm text-muted mt-0.5">
          {WEEKDAY_FULL[selectedDate.getDay()]}, {selectedDate.getDate()} de {MONTH_NAMES[selectedDate.getMonth()]}
        </p>
      </div>

      {/* Carrossel semanal */}
      <div className="flex gap-2 px-5 mb-5 overflow-x-auto scrollbar-hide" style={{ scrollBehavior: "smooth" }}>
        {weekDays.map(d => {
          const key = dateKey(d);
          const isSelected = key === selectedKey;
          return (
            <button
              key={key}
              onClick={() => setSelectedDate(d)}
              className={`flex-shrink-0 w-14 flex flex-col items-center gap-1 rounded-2xl py-2.5 transition-all ${
                isSelected ? "bg-accent text-white" : "bg-card border border-border text-foreground"
              }`}
            >
              <span className={`text-[10px] font-bold uppercase ${isSelected ? "text-white/80" : "text-muted"}`}>
                {WEEKDAY_LABELS[d.getDay()]}
              </span>
              <span className="text-base font-black">{String(d.getDate()).padStart(2, "0")}</span>
              {key === todayKey && (
                <span className={`w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-accent"}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Alerta de sobrecarga */}
      {isOverloaded && (
        <div className="mx-5 mb-5 bg-secondary/5 border border-secondary/30 rounded-2xl p-4">
          <p className="text-sm font-semibold text-secondary leading-relaxed">
            ⚠️ Andressa, seu dia já está denso de compromissos fixos (Âncoras). Proteja suas brechas e evite adicionar muitas tarefas flexíveis hoje.
          </p>
        </div>
      )}

      {/* Âncoras do dia */}
      <p className="section-title">⚓ Âncoras do Dia</p>
      <div className="mx-5 mb-5 space-y-2">
        {anchors.length === 0 && (
          <p className="text-xs text-muted px-1 py-2">Nenhum compromisso fixo neste dia.</p>
        )}
        {anchors.map(task => (
          <div key={task.id} className="bg-secondary/5 border border-secondary/20 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="text-sm font-black text-secondary w-12 flex-shrink-0 text-center">{task.scheduledTime}</div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold text-foreground truncate ${task.status === "completed" ? "line-through opacity-50" : ""}`}>
                {task.title}
              </p>
              {task.totalEstimatedTime != null && (
                <p className="text-[10px] text-muted mt-0.5">⏱️ {task.totalEstimatedTime} min</p>
              )}
            </div>
            <button onClick={() => handleRemoveTime(task.id)} className="text-[10px] text-muted underline flex-shrink-0">
              Remover horário
            </button>
          </div>
        ))}
      </div>

      {/* Tarefas flexíveis */}
      <p className="section-title">📋 Tarefas Flexíveis</p>
      <div className="mx-5 mb-6 space-y-2">
        {flexible.length === 0 && (
          <p className="text-xs text-muted px-1 py-2">Nenhuma tarefa flexível neste dia.</p>
        )}
        {flexible.map(task => (
          <div key={task.id} className="bg-card border border-border rounded-2xl p-3.5 flex items-center gap-3">
            <input
              type="checkbox"
              checked={task.status === "completed"}
              onChange={e => updateStatus.mutate({ taskId: task.id, status: e.target.checked ? "completed" : "pending" })}
              className="w-5 h-5 rounded accent-accent flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold text-foreground truncate ${task.status === "completed" ? "line-through opacity-50" : ""}`}>
                {task.title}
              </p>
              {task.totalEstimatedTime != null && (
                <p className="text-[10px] text-muted mt-0.5">⏱️ {task.totalEstimatedTime} min</p>
              )}
            </div>
            <button onClick={() => openTimeModal(task.id, task.scheduledTime)} className="text-[10px] font-bold text-accent flex-shrink-0">
              🕐 Definir horário
            </button>
          </div>
        ))}
      </div>

      {/* Modal: definir horário */}
      {timeModalTask && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-md bg-background rounded-t-3xl p-5">
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
            <h3 className="text-base font-black text-foreground mb-1">Definir horário</h3>
            <p className="text-xs text-muted mb-4 truncate">{timeModalTask.title}</p>
            <input
              type="time"
              value={timeInput}
              onChange={e => setTimeInput(e.target.value)}
              className="w-full text-lg font-bold text-center border border-border rounded-xl px-3 py-3 bg-card outline-none focus:border-accent mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setTimeModalTaskId(null)} className="flex-1 h-11 rounded-2xl border border-border text-sm font-bold text-muted">
                Cancelar
              </button>
              <button onClick={handleSaveTime} className="flex-1 h-11 rounded-2xl bg-accent text-white text-sm font-bold">
                Tornar Âncora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
