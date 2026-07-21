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

const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// "Não repete" | "todo dia" | "dias específicos da semana" — serializado
// como texto simples pro banco (recurrenceRule: null | "daily" |
// "weekly:0,2,4", ver drizzle/schema_postgres.ts) em vez de guardar esse
// objeto direto, pra não precisar de coluna jsonb só pra isso.
type RecurrenceValue =
  | { type: "none" }
  | { type: "daily"; endDate: string | null }
  | { type: "weekly"; weekdays: number[]; endDate: string | null };

function serializeRecurrence(r: RecurrenceValue): { rule: string | null; endDate: string | null } {
  if (r.type === "none") return { rule: null, endDate: null };
  if (r.type === "daily") return { rule: "daily", endDate: r.endDate };
  return { rule: `weekly:${[...r.weekdays].sort().join(",")}`, endDate: r.endDate };
}

function parseRecurrence(rule: string | null | undefined, endDate: string | null | undefined): RecurrenceValue {
  if (!rule) return { type: "none" };
  if (rule === "daily") return { type: "daily", endDate: endDate ?? null };
  if (rule.startsWith("weekly:")) {
    const weekdays = rule.slice("weekly:".length).split(",").map(Number).filter(n => !Number.isNaN(n));
    return { type: "weekly", weekdays, endDate: endDate ?? null };
  }
  return { type: "none" };
}

function recurrenceSummary(r: RecurrenceValue): string {
  if (r.type === "none") return "Não repete";
  if (r.type === "daily") return "Repete todo dia";
  if (r.weekdays.length === 0) return "Escolher dias da semana";
  return `Repete: ${[...r.weekdays].sort().map(d => WEEKDAYS_SHORT[d]).join(", ")}`;
}

interface EditModalState {
  id: number;
  title: string;
  totalEstimatedTime: number;
  priority: PriorityKey;
  recurrence: RecurrenceValue;
  isOccurrence: boolean;
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
  const [newStepInputs, setNewStepInputs] = useState<Record<number, string>>({});
  const [editingStep, setEditingStep] = useState<{ id: number; title: string } | null>(null);
  const [captureRecurrence, setCaptureRecurrence] = useState<RecurrenceValue>({ type: "none" });
  const [recurrenceModalFor, setRecurrenceModalFor] = useState<"capture" | "edit" | null>(null);
  // Um <select> nativo fechado sempre mostra o <option> selecionado na cor
  // de texto padrão — nenhum navegador aplica o style do option ali, só (às
  // vezes) na lista aberta. Por isso a bandeirinha/bolinha de prioridade
  // nunca ficava colorida de verdade; substituído por um dropdown próprio.
  const [priorityDropdownFor, setPriorityDropdownFor] = useState<"capture" | "edit" | null>(null);

  // O modal de repetição é compartilhado entre a captura rápida e a edição
  // de tarefa existente — lê/escreve no estado certo conforme quem o abriu.
  const currentRecurrence: RecurrenceValue =
    recurrenceModalFor === "edit" && editModalTask ? editModalTask.recurrence : captureRecurrence;

  const setCurrentRecurrence = (updater: (r: RecurrenceValue) => RecurrenceValue) => {
    if (recurrenceModalFor === "edit") {
      setEditModalTask(prev => (prev ? { ...prev, recurrence: updater(prev.recurrence) } : prev));
    } else {
      setCaptureRecurrence(updater);
    }
  };

  const { data: tasks, refetch } = trpc.tasks.list.useQuery();

  const resetCapture = () => {
    setTaskInput("");
    setTimeInput("60");
    setPriority("sem");
    setAiActive(false);
    setSubmitting(false);
    setCaptureRecurrence({ type: "none" });
  };

  const setRecurrenceMutation = trpc.tasks.setRecurrence.useMutation({
    onError: () => toast.error("Tarefa criada, mas houve erro ao salvar a repetição."),
  });

  // Awaited (não fire-and-forget): se refetch() rodasse antes dessa gravação
  // terminar, a lista recarregada mostraria a tarefa como "não repete" por
  // uma fração de segundo — race condition real, não só cosmética.
  const applyRecurrence = async (taskId: number, recurrence: RecurrenceValue) => {
    if (recurrence.type === "none") return;
    const { rule, endDate } = serializeRecurrence(recurrence);
    await setRecurrenceMutation.mutateAsync({ taskId, rule, endDate });
  };

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: async data => {
      toast.success("Tarefa adicionada!");
      await applyRecurrence(data.taskId, captureRecurrence);
      refetch();
      resetCapture();
    },
    onError: () => { toast.error("Erro ao adicionar tarefa."); setSubmitting(false); },
  });
  const decomposeMutation = trpc.tasks.decompose.useMutation({
    onSuccess: async data => {
      toast.success("Tarefa dividida em microtarefas! ✨");
      await applyRecurrence(data.taskId, captureRecurrence);
      refetch();
      resetCapture();
    },
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
  const addMicroStep = trpc.tasks.addMicroStep.useMutation({ onSuccess: () => refetch() });
  const updateMicroStep = trpc.tasks.updateMicroStep.useMutation({ onSuccess: () => refetch() });
  const deleteMicroStep = trpc.tasks.deleteMicroStep.useMutation({ onSuccess: () => refetch() });
  const updatePriority = trpc.tasks.updatePriority.useMutation({ onSuccess: () => refetch() });
  const updateTask = trpc.tasks.update.useMutation({
    onError: () => toast.error("Erro ao salvar alterações."),
  });

  const handleSaveEdit = async () => {
    if (!editModalTask || !editModalTask.title.trim()) return;
    await updateTask.mutateAsync({
      taskId: editModalTask.id,
      title: editModalTask.title.trim(),
      totalEstimatedTime: editModalTask.totalEstimatedTime,
      priority: editModalTask.priority,
    });
    if (!editModalTask.isOccurrence) {
      await applyRecurrence(editModalTask.id, editModalTask.recurrence);
      // applyRecurrence só grava quando type !== "none" — cobre o caso de
      // "desligar" a repetição explicitamente, que também precisa persistir.
      if (editModalTask.recurrence.type === "none") {
        await setRecurrenceMutation.mutateAsync({ taskId: editModalTask.id, rule: null, endDate: null });
      }
    }
    toast.success("Tarefa atualizada!");
    refetch();
    setEditModalTask(null);
  };

  const openEditModal = (task: NonNullable<typeof tasks>[number]) => {
    setEditModalTask({
      id: task.id,
      title: task.title,
      totalEstimatedTime: nearestTimeOption(task.totalEstimatedTime),
      priority: (task.priority ?? "sem") as PriorityKey,
      recurrence: parseRecurrence(task.recurrenceRule, task.recurrenceEndDate),
      isOccurrence: task.seriesId != null,
    });
    setMenuOpenId(null);
  };

  const handleAddStep = (taskId: number) => {
    const title = (newStepInputs[taskId] ?? "").trim();
    if (!title) return;
    addMicroStep.mutate({ taskId, title });
    setNewStepInputs(prev => ({ ...prev, [taskId]: "" }));
  };

  const saveStepEdit = () => {
    if (!editingStep) return;
    const title = editingStep.title.trim();
    if (title) updateMicroStep.mutate({ microStepId: editingStep.id, title });
    setEditingStep(null);
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
            <span style={{ color: "#D4D4CC" }}>•</span>
            <button onClick={() => setExpandedTasks(prev => ({ ...prev, [task.id]: !prev[task.id] }))} className="underline" style={{ color: TEXT_MUTED }}>
              {hasSteps ? `${task.steps.length} micro-passo${task.steps.length !== 1 ? "s" : ""}` : "micro-passos"}
            </button>
          </div>

          <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "#EDECE6" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${done ? 100 : task.progress}%`, background: SAGE }} />
          </div>

          {isExpanded && (
            <div className="flex flex-col gap-1.5 mt-3">
              {task.steps.map(step => (
                <div key={step.id} className="flex items-center gap-2">
                  <input
                    type="checkbox" checked={step.completed ?? false}
                    onChange={e => updateStep.mutate({ microStepId: step.id, completed: e.target.checked })}
                    className="w-3.5 h-3.5 rounded flex-shrink-0" style={{ accentColor: SAGE }}
                  />
                  {editingStep?.id === step.id ? (
                    <input
                      autoFocus
                      value={editingStep.title}
                      onChange={e => setEditingStep({ id: step.id, title: e.target.value })}
                      onBlur={saveStepEdit}
                      onKeyDown={e => {
                        if (e.key === "Enter") saveStepEdit();
                        if (e.key === "Escape") setEditingStep(null);
                      }}
                      className="flex-1 min-w-0 text-xs bg-transparent outline-none border-b"
                      style={{ color: NAVY, borderColor: SAGE }}
                    />
                  ) : (
                    <button
                      onClick={() => setEditingStep({ id: step.id, title: step.title })}
                      className="flex-1 min-w-0 text-left text-xs truncate"
                      style={{ color: step.completed ? TEXT_MUTED : NAVY, textDecoration: step.completed ? "line-through" : "none" }}
                    >
                      {step.title}
                    </button>
                  )}
                  {step.estimatedTime != null && <span className="text-[9px] flex-shrink-0" style={{ color: TEXT_MUTED }}>~{step.estimatedTime}min</span>}
                  <button
                    onClick={() => deleteMicroStep.mutate({ microStepId: step.id })}
                    className="text-xs flex-shrink-0"
                    style={{ color: "#C0392B" }}
                    aria-label="Excluir micro-passo"
                  >
                    ×
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-0.5">
                <input
                  value={newStepInputs[task.id] ?? ""}
                  onChange={e => setNewStepInputs(prev => ({ ...prev, [task.id]: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") handleAddStep(task.id); }}
                  placeholder="Novo micro-passo..."
                  className="flex-1 min-w-0 text-xs bg-transparent outline-none border-b py-0.5"
                  style={{ color: NAVY, borderColor: LINE }}
                />
                <button onClick={() => handleAddStep(task.id)} className="text-[11px] font-semibold flex-shrink-0" style={{ color: SAGE_DARK }}>
                  + Adicionar
                </button>
              </div>
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
    <div className="min-h-screen pb-24" style={{ background: BG_APP }} onClick={() => { setMenuOpenId(null); setPriorityDropdownFor(null); }}>
      <div className="px-5 pt-6">
        <h1 className="text-[22px] font-bold mb-4" style={{ color: NAVY }}>Tarefas</h1>

        {/* Captura rápida */}
        <div className="flex flex-col gap-2 mb-6">
          <div className="relative rounded-[14px] flex items-center px-3.5" style={{ background: BG_APP, border: `1px solid ${LINE}`, height: 44 }}>
            <input
              value={taskInput} onChange={e => setTaskInput(e.target.value)}
              placeholder="Tire da sua mente"
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
            <div className="relative flex-1">
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setPriorityDropdownFor(v => (v === "capture" ? null : "capture")); }}
                className="w-full flex items-center gap-2 rounded-[14px] px-3 text-[13px] font-medium"
                style={{ background: BG_APP, border: `1px solid ${LINE}`, height: 44, color: NAVY }}
              >
                <span className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, background: priorityInfo(priority).accent }} />
                {priorityInfo(priority).label}
              </button>
              {priorityDropdownFor === "capture" && (
                <div
                  className="absolute left-0 right-0 z-20 mt-1 rounded-xl overflow-hidden"
                  style={{ background: CARD, boxShadow: "0 8px 24px rgba(22,54,90,0.18)" }}
                  onClick={e => e.stopPropagation()}
                >
                  {PRIORITIES.map(p => (
                    <button
                      key={p.key}
                      onClick={() => { setPriority(p.key); setPriorityDropdownFor(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[13px] font-medium"
                      style={{ color: NAVY }}
                    >
                      <span className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, background: p.accent }} />
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setAiActive(v => !v)}
            className="flex items-center gap-2.5 rounded-[14px] px-3.5 text-[12.5px]"
            style={{ height: 44, color: SAGE_DARK, border: `1px solid ${SAGE}`, background: "#E4EFE6", fontWeight: 600 }}
          >
            <span
              className="flex items-center justify-center rounded-[5px] flex-shrink-0"
              style={{
                width: 18,
                height: 18,
                border: `1.5px solid ${SAGE_DARK}`,
                background: aiActive ? SAGE_DARK : "transparent",
                color: "#fff",
                fontSize: 11,
              }}
            >
              {aiActive && "✓"}
            </span>
            <span style={{ color: SAGE_DARK, fontSize: 14 }}>✨</span> Dividir em microtarefas com IA
          </button>

          <button
            onClick={() => setRecurrenceModalFor("capture")}
            className="flex items-center gap-2.5 rounded-[14px] px-3.5 text-[12.5px] font-medium"
            style={{ height: 44, border: `1px solid ${LINE}`, color: NAVY, background: BG_APP }}
          >
            <span>🔁</span> {recurrenceSummary(captureRecurrence)}
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
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setPriorityDropdownFor(v => (v === "edit" ? null : "edit")); }}
                  className="w-full flex items-center gap-2 rounded-xl px-3 text-[13px] font-medium"
                  style={{ background: BG_APP, border: `1px solid ${LINE}`, height: 44, color: NAVY }}
                >
                  <span className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, background: priorityInfo(editModalTask.priority).accent }} />
                  {priorityInfo(editModalTask.priority).label}
                </button>
                {priorityDropdownFor === "edit" && (
                  <div
                    className="absolute left-0 right-0 z-20 mt-1 rounded-xl overflow-hidden"
                    style={{ background: CARD, boxShadow: "0 8px 24px rgba(22,54,90,0.18)" }}
                    onClick={e => e.stopPropagation()}
                  >
                    {PRIORITIES.map(p => (
                      <button
                        key={p.key}
                        onClick={() => {
                          setEditModalTask(prev => (prev ? { ...prev, priority: p.key } : prev));
                          setPriorityDropdownFor(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[13px] font-medium"
                        style={{ color: NAVY }}
                      >
                        <span className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, background: p.accent }} />
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {editModalTask.isOccurrence ? (
              <p className="text-xs font-medium mb-5" style={{ color: TEXT_MUTED }}>
                🔁 Parte de uma tarefa recorrente — mudar a repetição só é possível na tarefa original.
              </p>
            ) : (
              <button
                onClick={() => setRecurrenceModalFor("edit")}
                className="w-full flex items-center gap-2.5 rounded-xl px-3.5 mb-5 text-left text-[13px] font-medium"
                style={{ height: 44, border: `1px solid ${LINE}`, color: NAVY, background: BG_APP }}
              >
                <span>🔁</span> {recurrenceSummary(editModalTask.recurrence)}
              </button>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setEditModalTask(null)}
                className="flex-1 h-11 rounded-2xl text-sm font-bold"
                style={{ border: `1px solid ${LINE}`, color: TEXT_MUTED }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
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

      {/* Modal: Essa tarefa se repete? (compartilhado entre captura e edição) */}
      {recurrenceModalFor && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(22,54,90,0.4)" }}
          onClick={() => setRecurrenceModalFor(null)}
        >
          <div className="w-full max-w-md rounded-t-3xl p-5" style={{ background: CARD }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: LINE }} />
            <h3 className="text-base font-bold mb-4" style={{ color: NAVY }}>🔁 Essa tarefa se repete?</h3>

            <div className="flex flex-col gap-2 mb-4">
              <button
                onClick={() => setCurrentRecurrence(() => ({ type: "none" }))}
                className="w-full text-left rounded-xl px-3.5 py-3 text-[13.5px] font-medium"
                style={{ border: `1.5px solid ${currentRecurrence.type === "none" ? SAGE : LINE}`, color: NAVY, background: BG_APP }}
              >
                Não repete
              </button>
              <button
                onClick={() => setCurrentRecurrence(prev => ({ type: "daily", endDate: prev.type === "none" ? null : prev.endDate }))}
                className="w-full text-left rounded-xl px-3.5 py-3 text-[13.5px] font-medium"
                style={{ border: `1.5px solid ${currentRecurrence.type === "daily" ? SAGE : LINE}`, color: NAVY, background: BG_APP }}
              >
                Todo dia
              </button>
              <button
                onClick={() => setCurrentRecurrence(prev => ({
                  type: "weekly",
                  weekdays: prev.type === "weekly" ? prev.weekdays : [],
                  endDate: prev.type === "none" ? null : prev.endDate,
                }))}
                className="w-full text-left rounded-xl px-3.5 py-3 text-[13.5px] font-medium"
                style={{ border: `1.5px solid ${currentRecurrence.type === "weekly" ? SAGE : LINE}`, color: NAVY, background: BG_APP }}
              >
                Escolher dias da semana
              </button>
            </div>

            {currentRecurrence.type === "weekly" && (
              <div className="grid grid-cols-7 gap-1.5 mb-4">
                {WEEKDAYS_SHORT.map((label, i) => {
                  const active = currentRecurrence.weekdays.includes(i);
                  return (
                    <button
                      key={label}
                      onClick={() => setCurrentRecurrence(prev => {
                        if (prev.type !== "weekly") return prev;
                        const weekdays = active ? prev.weekdays.filter(d => d !== i) : [...prev.weekdays, i];
                        return { ...prev, weekdays };
                      })}
                      className="rounded-xl py-2.5 text-[11px] font-bold"
                      style={{
                        border: `1.5px solid ${active ? SAGE : LINE}`,
                        color: active ? SAGE_DARK : TEXT_MUTED,
                        background: active ? "#E4EFE6" : BG_APP,
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {currentRecurrence.type !== "none" && (
              <div className="mb-5">
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: TEXT_MUTED }}>Repetir até (opcional)</label>
                <input
                  type="date"
                  value={currentRecurrence.endDate ?? ""}
                  onChange={e => setCurrentRecurrence(prev => (prev.type === "none" ? prev : { ...prev, endDate: e.target.value || null }))}
                  className="w-full text-sm rounded-xl px-3.5 py-2.5 outline-none"
                  style={{ border: `1px solid ${LINE}`, color: NAVY, background: BG_APP }}
                />
              </div>
            )}

            <button
              onClick={() => setRecurrenceModalFor(null)}
              className="w-full h-11 rounded-2xl text-white text-sm font-bold"
              style={{ background: SAGE }}
            >
              Confirmar
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
