import { useState } from "react";
import { createPortal } from "react-dom";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useThemeColors } from "@/hooks/useThemeColors";

// Paleta específica desta tela (mockup fornecido)
const SAGE = "#5FA37A";
const SAGE_DARK = "#3F8A63";
const DONE_MUTED = "#A9AFA5";

const PRIORITIES = [
  { key: "urgente", label: "Urgente", tagBg: "#FBE1DE", tagText: "#C0392B", accent: "#E0685A" },
  { key: "alta", label: "Alta", tagBg: "#FCEAD3", tagText: "#C97A1A", accent: "#EDA23F" },
  { key: "media", label: "Média", tagBg: "#DCE9F6", tagText: "#2E6DA4", accent: "#6FA3D6" },
  { key: "baixa", label: "Baixa", tagBg: "#DEEEE1", tagText: SAGE_DARK, accent: SAGE },
  { key: "sem", label: "Sem prioridade", tagBg: "#EBEBE6", tagText: "#8E8E93", accent: "#C4C4C4" },
] as const;

type PriorityKey = typeof PRIORITIES[number]["key"];

const TIME_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1h" },
  { value: 90, label: "1h 30min" },
  { value: 120, label: "2h" },
];
const TIME_VALUES = TIME_OPTIONS.map(t => t.value);

function priorityInfo(key: PriorityKey | null | undefined) {
  return PRIORITIES.find(p => p.key === (key ?? "sem")) ?? PRIORITIES[4];
}

function nearestTimeOption(minutes: number | null | undefined): number {
  const target = minutes ?? 15;
  return TIME_VALUES.reduce((prev, curr) => (Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev));
}

interface EditModalState {
  id: number;
  title: string;
  totalEstimatedTime: number;
  priority: PriorityKey;
}

export default function Tasks() {
  const { NAVY, BG_APP, CARD, TEXT_MUTED, LINE } = useThemeColors();
  const [taskInput, setTaskInput] = useState("");
  const [timeInput, setTimeInput] = useState("60");
  const [priority, setPriority] = useState<PriorityKey>("sem");
  const [aiActive, setAiActive] = useState(false);
  const [filter, setFilter] = useState("todas");
  const [submitting, setSubmitting] = useState(false);
  const [listening, setListening] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({});
  const [editModalTask, setEditModalTask] = useState<EditModalState | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);

  const { data: tasks, refetch } = trpc.tasks.list.useQuery();

  const resetCapture = () => {
    setTaskInput("");
    setTimeInput("60");
    setPriority("sem");
    setAiActive(false);
    setSubmitting(false);
  };

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => { toast.success("Tarefa adicionada!"); refetch(); resetCapture(); },
    onError: () => { toast.error("Erro ao adicionar tarefa."); setSubmitting(false); },
  });
  const decomposeMutation = trpc.tasks.decompose.useMutation({
    onSuccess: () => { toast.success("Tarefa dividida em microtarefas! ✨"); refetch(); resetCapture(); },
    onError: () => { toast.error("Erro ao dividir em microtarefas. Tente novamente."); setSubmitting(false); },
  });
  const decomposeExistingMutation = trpc.tasks.decomposeExisting.useMutation({
    onSuccess: () => { toast.success("Tarefa dividida em microtarefas! ✨"); refetch(); },
    onError: () => toast.error("Erro ao dividir em microtarefas. Tente novamente."),
  });
  const deleteTask = trpc.tasks.deleteTask.useMutation({
    onSuccess: () => { toast.success("Tarefa excluída."); refetch(); },
    onError: () => toast.error("Erro ao excluir tarefa."),
  });
  const updateStatus = trpc.tasks.updateTaskStatus.useMutation({ onSuccess: () => refetch() });
  const updateStep = trpc.tasks.updateMicroStepStatus.useMutation({ onSuccess: () => refetch() });
  const updatePriority = trpc.tasks.updatePriority.useMutation({ onSuccess: () => refetch() });
  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => { toast.success("Tarefa atualizada!"); refetch(); setEditModalTask(null); },
    onError: () => toast.error("Erro ao salvar alterações."),
  });

  const openEditModal = (task: NonNullable<typeof tasks>[number]) => {
    setEditModalTask({
      id: task.id,
      title: task.title,
      totalEstimatedTime: nearestTimeOption(task.totalEstimatedTime),
      priority: (task.priority ?? "sem") as PriorityKey,
    });
    setMenuOpenId(null);
  };

  const handleAdd = () => {
    const title = taskInput.trim();
    if (!title) return;
    setSubmitting(true);
    const duracao = parseInt(timeInput, 10) || 15;
    if (aiActive) {
      decomposeMutation.mutate({ taskDescription: title, context: `Tempo estimado: ${duracao} min`, priority });
    } else {
      createTask.mutate({ title, priority, totalEstimatedTime: duracao });
    }
  };

  const handleVoice = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("Reconhecimento de voz não suportado neste navegador.");
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    setListening(true);
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setTaskInput(text);
      const minMatch = text.match(/(\d+)\s*minuto/i);
      const hourMatch = text.match(/(\d+)\s*hora/i);
      let minutes: number | null = null;
      if (minMatch) minutes = parseInt(minMatch[1], 10);
      else if (hourMatch) minutes = parseInt(hourMatch[1], 10) * 60;
      if (minutes != null) {
        const closest = TIME_VALUES.reduce((prev, curr) => (Math.abs(curr - minutes!) < Math.abs(prev - minutes!) ? curr : prev));
        setTimeInput(String(closest));
      }
    };
    recognition.onerror = () => toast.error("Erro no reconhecimento de voz.");
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  const allTasks = tasks ?? [];
  const pending = allTasks.filter(t => t.status !== "completed");
  const completed = allTasks.filter(t => t.status === "completed");

  const groups = PRIORITIES
    .filter(p => filter === "todas" || filter === p.key)
    .map(p => ({ ...p, items: pending.filter(t => (t.priority ?? "sem") === p.key) }))
    .filter(g => g.items.length > 0);

  const nothingPending = groups.length === 0;

  const renderTaskCard = (task: NonNullable<typeof tasks>[number]) => {
    const p = priorityInfo(task.priority);
    const done = task.status === "completed";
    const isMenuOpen = menuOpenId === task.id;
    const hasSteps = task.steps?.length > 0;
    const isExpanded = expandedTasks[task.id];

    return (
      <div
        key={task.id}
        className="relative rounded-2xl pl-[18px] pr-10 py-3.5 flex gap-3 items-start transition-opacity"
        style={{ background: CARD, boxShadow: "0 2px 10px rgba(22,54,90,0.05)", opacity: done ? 0.5 : 1 }}
      >
        <span className="absolute left-0 top-3.5 bottom-3.5 w-[3px] rounded-[3px]" style={{ background: p.accent }} />
        <button
          onClick={() => updateStatus.mutate({ taskId: task.id, status: done ? "pending" : "completed" })}
          className="rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center text-[10px] text-white"
          style={{ width: 19, height: 19, ...(done ? { background: SAGE } : { border: "1.5px solid #C9CFC7" }) }}
        >
          {done && "✓"}
        </button>

        <div className="flex-1 min-w-0">
          <p
            className="text-[14.5px] font-semibold mb-1.5 leading-snug"
            style={{ color: done ? DONE_MUTED : NAVY, textDecoration: done ? "line-through" : "none" }}
          >
            {task.title}
          </p>

          <div className="flex items-center gap-2 flex-wrap text-[11.5px] font-medium mb-2.5" style={{ color: TEXT_MUTED }}>
            <span className="px-2 py-0.5 rounded-[6px] text-[10.5px] font-semibold" style={{ background: p.tagBg, color: p.tagText }}>{p.label}</span>
            <span style={{ color: "#D4D4CC" }}>•</span>
            <span>⏱ {task.totalEstimatedTime ? `${task.totalEstimatedTime}min` : "—"}</span>
            {hasSteps && (
              <>
                <span style={{ color: "#D4D4CC" }}>•</span>
                <button onClick={() => setExpandedTasks(prev => ({ ...prev, [task.id]: !prev[task.id] }))} className="underline" style={{ color: TEXT_MUTED }}>
                  {task.steps.length} micro-passo{task.steps.length !== 1 ? "s" : ""}
                </button>
              </>
            )}
          </div>

          <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "#EDECE6" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${done ? 100 : task.progress}%`, background: SAGE }} />
          </div>

          {isExpanded && hasSteps && (
            <div className="flex flex-col gap-1.5 mt-3">
              {task.steps.map(step => (
                <div key={step.id} className="flex items-center gap-2">
                  <input
                    type="checkbox" checked={step.completed ?? false}
                    onChange={e => updateStep.mutate({ microStepId: step.id, completed: e.target.checked })}
                    className="w-3.5 h-3.5 rounded" style={{ accentColor: SAGE }}
                  />
                  <span className="text-xs" style={{ color: step.completed ? TEXT_MUTED : NAVY, textDecoration: step.completed ? "line-through" : "none" }}>
                    {step.title}
                  </span>
                  {step.estimatedTime && <span className="text-[9px]" style={{ color: TEXT_MUTED }}>~{step.estimatedTime}min</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={e => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : task.id); }}
          className="absolute rounded-full flex items-center justify-center text-xs"
          style={{ top: 12, right: 12, width: 24, height: 24, color: "#B7BDB3" }}
        >
          •••
        </button>
        {isMenuOpen && (
          <div
            className="absolute rounded-2xl p-1.5 flex flex-col gap-0.5 z-10"
            style={{ top: 36, right: 10, width: 170, background: CARD, boxShadow: "0 8px 24px rgba(22,54,90,0.18)" }}
          >
            <button
              onClick={e => { e.stopPropagation(); openEditModal(task); }}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[12.5px] font-medium"
              style={{ color: NAVY }}
            >
              ✏️ Editar tarefa
            </button>
            {!hasSteps && (
              <button
                onClick={e => { e.stopPropagation(); decomposeExistingMutation.mutate({ taskId: task.id }); setMenuOpenId(null); }}
                disabled={decomposeExistingMutation.isPending}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[12.5px] font-medium disabled:opacity-50"
                style={{ color: NAVY }}
              >
                ✨ Dividir em microtarefas
              </button>
            )}
            <div style={{ height: 1, background: LINE, margin: "2px 4px" }} />
            {PRIORITIES.map(pr => (
              <button
                key={pr.key}
                onClick={e => { e.stopPropagation(); updatePriority.mutate({ taskId: task.id, priority: pr.key }); setMenuOpenId(null); }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[12.5px] font-medium"
                style={{ color: NAVY }}
              >
                <span className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, background: pr.accent }} />
                {pr.label}
              </button>
            ))}
            <div style={{ height: 1, background: LINE, margin: "2px 4px" }} />
            <button
              onClick={e => {
                e.stopPropagation();
                setMenuOpenId(null);
                if (window.confirm("Excluir esta tarefa? Essa ação não pode ser desfeita.")) {
                  deleteTask.mutate({ taskId: task.id });
                }
              }}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[12.5px] font-medium"
              style={{ color: "#B85C5C" }}
            >
              🗑️ Excluir tarefa
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: BG_APP }} onClick={() => setMenuOpenId(null)}>
      <div className="px-5 pt-6">
        <h1 className="text-[22px] font-bold mb-4" style={{ color: NAVY }}>Tarefas</h1>

        {/* Captura rápida */}
        <div className="flex flex-col gap-2 mb-6">
          <div className="relative rounded-[14px] flex items-center px-3.5" style={{ background: BG_APP, border: `1px solid ${LINE}`, height: 44 }}>
            <input
              value={taskInput} onChange={e => setTaskInput(e.target.value)}
              placeholder="Qual tarefa você quer capturar?"
              className="flex-1 bg-transparent outline-none text-[13.5px] pr-7"
              style={{ color: NAVY }}
            />
            <button onClick={handleVoice} className="absolute right-3 text-[15px]" style={{ color: listening ? "#C06060" : TEXT_MUTED }}>
              {listening ? "🛑" : "🎙️"}
            </button>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 rounded-[14px] flex items-center px-3" style={{ background: BG_APP, border: `1px solid ${LINE}`, height: 44 }}>
              <select
                value={timeInput} onChange={e => setTimeInput(e.target.value)}
                className="w-full bg-transparent outline-none text-[13px] font-medium appearance-none cursor-pointer"
                style={{ color: NAVY }}
              >
                {TIME_OPTIONS.map(t => (
                  <option key={t.value} value={t.value}>⏱️ {t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 rounded-[14px] flex items-center px-3" style={{ background: BG_APP, border: `1px solid ${LINE}`, height: 44 }}>
              <select
                value={priority} onChange={e => setPriority(e.target.value as PriorityKey)}
                className="w-full bg-transparent outline-none text-[13px] font-medium appearance-none cursor-pointer"
                style={{ color: NAVY }}
              >
                {PRIORITIES.map(p => (
                  <option key={p.key} value={p.key}>🏳️ {p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={() => setAiActive(v => !v)}
            className="flex items-center gap-2 rounded-[14px] px-3.5 text-[12.5px]"
            style={aiActive
              ? { height: 44, color: TEXT_MUTED, border: `1px solid ${LINE}`, background: BG_APP, fontWeight: 500 }
              : { height: 44, color: SAGE_DARK, border: `1px solid ${SAGE}`, background: "#E4EFE6", fontWeight: 600 }}
          >
            <span style={{ color: aiActive ? TEXT_MUTED : SAGE_DARK, fontSize: 14 }}>✨</span> Dividir em microtarefas com IA
          </button>

          <button
            onClick={handleAdd} disabled={submitting || !taskInput.trim()}
            className="w-full rounded-[14px] text-white text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ height: 46, background: NAVY }}
          >
            + Adicionar
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-5 overflow-x-auto mb-6" style={{ borderBottom: `1px solid ${LINE}` }}>
          {[{ key: "todas", label: "Todas" }, ...PRIORITIES.map(p => ({ key: p.key, label: p.label }))].map(t => {
            const active = filter === t.key;
            return (
              <button
                key={t.key} onClick={() => setFilter(t.key)}
                className="pb-2.5 text-[13.5px] whitespace-nowrap flex-shrink-0 relative"
                style={{ color: active ? NAVY : TEXT_MUTED, fontWeight: active ? 700 : 500 }}
              >
                {t.label}
                {active && <span className="absolute left-0 right-0" style={{ bottom: -1, height: 2, background: NAVY, borderRadius: 2 }} />}
              </button>
            );
          })}
        </div>

        {/* Grupos por prioridade */}
        {groups.map(g => (
          <div key={g.key} className="mb-7">
            <p className="text-[13px] font-bold uppercase mb-3" style={{ color: NAVY, letterSpacing: "0.3px" }}>{g.label}</p>
            <div className="flex flex-col gap-3">{g.items.map(renderTaskCard)}</div>
          </div>
        ))}

        {nothingPending && (
          <p className="text-center text-[12.5px] py-4" style={{ color: TEXT_MUTED }}>Nenhuma tarefa pendente por aqui. 🌿</p>
        )}

        {completed.length > 0 && (
          <div className="mb-4">
            <p className="text-[13px] font-bold uppercase mb-3" style={{ color: DONE_MUTED, letterSpacing: "0.3px" }}>Concluídas hoje</p>
            <div className="flex flex-col gap-3">{completed.map(renderTaskCard)}</div>
          </div>
        )}
      </div>

      {/* Modal: Editar tarefa */}
      {editModalTask && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(22,54,90,0.4)" }}
          onClick={e => { e.stopPropagation(); setEditModalTask(null); }}
        >
          <div className="w-full max-w-md rounded-t-3xl p-5" style={{ background: CARD }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: LINE }} />
            <h3 className="text-base font-bold mb-4" style={{ color: NAVY }}>Editar tarefa</h3>

            <label className="text-xs font-semibold mb-1.5 block" style={{ color: TEXT_MUTED }}>Nome da tarefa</label>
            <input
              value={editModalTask.title}
              onChange={e => setEditModalTask(prev => (prev ? { ...prev, title: e.target.value } : prev))}
              className="w-full text-sm rounded-xl px-3.5 py-2.5 outline-none mb-4"
              style={{ border: `1px solid ${LINE}`, color: NAVY, background: BG_APP }}
            />

            <div className="flex gap-2 mb-5">
              <div className="flex-1 rounded-xl flex items-center px-3" style={{ background: BG_APP, border: `1px solid ${LINE}`, height: 44 }}>
                <select
                  value={editModalTask.totalEstimatedTime}
                  onChange={e => setEditModalTask(prev => (prev ? { ...prev, totalEstimatedTime: Number(e.target.value) } : prev))}
                  className="w-full bg-transparent outline-none text-[13px] font-medium appearance-none cursor-pointer"
                  style={{ color: NAVY }}
                >
                  {TIME_OPTIONS.map(t => (
                    <option key={t.value} value={t.value}>⏱️ {t.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 rounded-xl flex items-center px-3" style={{ background: BG_APP, border: `1px solid ${LINE}`, height: 44 }}>
                <select
                  value={editModalTask.priority}
                  onChange={e => setEditModalTask(prev => (prev ? { ...prev, priority: e.target.value as PriorityKey } : prev))}
                  className="w-full bg-transparent outline-none text-[13px] font-medium appearance-none cursor-pointer"
                  style={{ color: NAVY }}
                >
                  {PRIORITIES.map(p => (
                    <option key={p.key} value={p.key}>🏳️ {p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditModalTask(null)}
                className="flex-1 h-11 rounded-2xl text-sm font-bold"
                style={{ border: `1px solid ${LINE}`, color: TEXT_MUTED }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!editModalTask.title.trim()) return;
                  updateTask.mutate({
                    taskId: editModalTask.id,
                    title: editModalTask.title.trim(),
                    totalEstimatedTime: editModalTask.totalEstimatedTime,
                    priority: editModalTask.priority,
                  });
                }}
                disabled={!editModalTask.title.trim() || updateTask.isPending}
                className="flex-1 h-11 rounded-2xl text-white text-sm font-bold disabled:opacity-50"
                style={{ background: SAGE }}
              >
                {updateTask.isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
