import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// Paleta específica desta tela (mockup fornecido)
const NAVY = "#16365A";
const SAGE = "#5FA37A";
const SAGE_DARK = "#3F8A63";
const BG_APP = "#EEF3EC";
const TEXT_MUTED = "#8C948C";
const LINE = "#E7E5DE";
const DONE_MUTED = "#A9AFA5";

const PRIORITIES = [
  { key: "urgente", label: "Urgente", tagBg: "#F6DEDE", tagText: "#C08787", accent: "#E8C1C1" },
  { key: "alta", label: "Alta", tagBg: "#F8EEDA", tagText: "#BFA271", accent: "#EFD9AE" },
  { key: "media", label: "Média", tagBg: "#E1EAF2", tagText: "#7C97B2", accent: "#C5D6E5" },
  { key: "baixa", label: "Baixa", tagBg: "#E4EFE6", tagText: SAGE_DARK, accent: "#C3DCC7" },
  { key: "sem", label: "Sem prioridade", tagBg: "#EBEBE6", tagText: "#9B9B93", accent: "#DCDCD5" },
] as const;

type PriorityKey = typeof PRIORITIES[number]["key"];

function priorityInfo(key: PriorityKey | null | undefined) {
  return PRIORITIES.find(p => p.key === (key ?? "sem")) ?? PRIORITIES[4];
}

export default function Tasks() {
  const [taskInput, setTaskInput] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const [priority, setPriority] = useState<PriorityKey>("sem");
  const [aiActive, setAiActive] = useState(false);
  const [filter, setFilter] = useState("todas");
  const [submitting, setSubmitting] = useState(false);
  const [listening, setListening] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({});
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);

  const { data: tasks, refetch } = trpc.tasks.list.useQuery();

  const resetCapture = () => {
    setTaskInput("");
    setTimeInput("");
    setPriority("sem");
    setAiActive(false);
    setSubmitting(false);
  };

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => { toast.success("Tarefa adicionada!"); refetch(); resetCapture(); },
    onError: () => { toast.error("Erro ao adicionar tarefa."); setSubmitting(false); },
  });
  const decomposeMutation = trpc.tasks.decompose.useMutation({
    onSuccess: () => { toast.success("Tarefa decomposta com IA! ✨"); refetch(); resetCapture(); },
    onError: () => { toast.error("Erro ao decompor. Tente novamente."); setSubmitting(false); },
  });
  const updateStatus = trpc.tasks.updateTaskStatus.useMutation({ onSuccess: () => refetch() });
  const updateStep = trpc.tasks.updateMicroStepStatus.useMutation({ onSuccess: () => refetch() });
  const updatePriority = trpc.tasks.updatePriority.useMutation({ onSuccess: () => refetch() });

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
      if (minMatch) setTimeInput(minMatch[1]);
      else if (hourMatch) setTimeInput(String(parseInt(hourMatch[1], 10) * 60));
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
    const isEditing = editingTask === task.id;
    const isMenuOpen = menuOpenId === task.id;
    const hasSteps = task.steps?.length > 0;
    const isExpanded = expandedTasks[task.id];

    return (
      <div
        key={task.id}
        className="relative bg-white rounded-2xl pl-[18px] pr-10 py-3.5 flex gap-3 items-start transition-opacity"
        style={{ boxShadow: "0 2px 10px rgba(22,54,90,0.05)", opacity: done ? 0.5 : 1 }}
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
          {isEditing ? (
            <input
              autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
              onBlur={() => setEditingTask(null)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") setEditingTask(null); }}
              className="w-full text-sm rounded-lg px-2 py-1 outline-none mb-1.5"
              style={{ border: `1px solid ${SAGE}`, color: NAVY }}
            />
          ) : (
            <p
              className="text-[14.5px] font-semibold mb-1.5 leading-snug"
              style={{ color: done ? DONE_MUTED : NAVY, textDecoration: done ? "line-through" : "none" }}
              onDoubleClick={() => { setEditingTask(task.id); setEditValue(task.title); }}
            >
              {task.title}
            </p>
          )}

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
            className="absolute rounded-2xl p-1.5 flex flex-col gap-0.5 z-10 bg-white"
            style={{ top: 36, right: 10, width: 150, boxShadow: "0 8px 24px rgba(22,54,90,0.18)" }}
          >
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
        <div className="flex flex-col gap-2 mb-2.5">
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
            <div className="rounded-[14px] flex items-center px-3.5 flex-shrink-0" style={{ background: BG_APP, border: `1px solid ${LINE}`, height: 44, width: 88 }}>
              <input
                value={timeInput} onChange={e => setTimeInput(e.target.value)}
                placeholder="Tempo"
                className="w-full bg-transparent outline-none text-[13.5px]"
                style={{ color: NAVY }}
              />
            </div>
            <button
              onClick={handleAdd} disabled={submitting || !taskInput.trim()}
              className="rounded-[14px] flex items-center justify-center text-lg font-semibold text-white flex-shrink-0 transition-all active:scale-95 disabled:opacity-50"
              style={{ width: 44, height: 44, background: NAVY }}
            >
              +
            </button>
          </div>
        </div>

        {/* Seletor de prioridade */}
        <div className="flex flex-wrap gap-1.5 mb-1">
          {PRIORITIES.map(p => {
            const selected = priority === p.key;
            return (
              <button
                key={p.key} onClick={() => setPriority(p.key)}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                style={{ background: p.tagBg, color: p.tagText, border: selected ? `1.3px solid ${p.tagText}` : "1.3px solid transparent" }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Toggle IA */}
        <button
          onClick={() => setAiActive(v => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs mb-5 w-fit"
          style={aiActive
            ? { color: SAGE_DARK, border: `1.3px solid ${SAGE}`, background: "#E4EFE6", fontWeight: 600 }
            : { color: TEXT_MUTED, border: "1.3px solid transparent", fontWeight: 500 }}
        >
          <span style={{ color: SAGE_DARK }}>✨</span> Deixar a IA decompor em micro-passos
        </button>

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
    </div>
  );
}
