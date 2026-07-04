import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import AppHeader from "@/components/AppHeader";
import { toast } from "sonner";

const PRIORITIES = [
  { key: "urgente", label: "🔴 Urgente", color: "#E74C3C", bg: "#FDECEA", border: "#FBBDBA" },
  { key: "alta",    label: "🟢 Alta",    color: "#2E8B57", bg: "#E8F5EE", border: "#A8D5B8" },
  { key: "media",   label: "🟡 Média",   color: "#D4AC0D", bg: "#FEF9E7", border: "#F7DC6F" },
  { key: "baixa",   label: "🔵 Baixa",   color: "#2980B9", bg: "#EBF5FB", border: "#AED6F1" },
  { key: "sem",     label: "⚪ Sem prioridade", color: "#8E8E93", bg: "#F5F5F5", border: "#E0E0E0" },
];

type TaskPriority = "urgente" | "alta" | "media" | "baixa" | "sem";

interface MicroStep { title: string; description: string; estimatedTime: number; difficulty: string; }
interface TaskItem {
  id: number; title: string; priority?: TaskPriority | null; totalEstimatedTime?: number | null;
  status: string; steps: { id: number; title: string; completed: boolean; estimatedTime?: number }[];
  progress: number;
}

export default function Tasks() {
  const [taskInput, setTaskInput] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("sem");
  const [filter, setFilter] = useState("todas");
  const [decomposing, setDecomposing] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({ urgente: true, alta: true, media: true, baixa: true, sem: true });
  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({});
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const recognizing = useRef(false);

  const { data: tasks, refetch } = trpc.tasks.list.useQuery();
  const decomposeMutation = trpc.tasks.decompose.useMutation({
    onSuccess: () => { toast.success("Tarefa decomposta com IA! ✨"); refetch(); setDecomposing(false); setTaskInput(""); setTimeInput(""); },
    onError: () => { toast.error("Erro ao decompor. Tente novamente."); setDecomposing(false); }
  });
  const updateStatus = trpc.tasks.updateTaskStatus.useMutation({ onSuccess: () => refetch() });
  const updateStep = trpc.tasks.updateMicroStepStatus.useMutation({ onSuccess: () => refetch() });

  const handleDecompose = () => {
    if (!taskInput.trim()) return;
    setDecomposing(true);
    decomposeMutation.mutate({
      taskDescription: taskInput.trim(),
      context: timeInput ? `Tempo estimado: ${timeInput}` : "",
      priority,
    });
  };

  const handleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Reconhecimento de voz não suportado neste navegador.");
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = "pt-BR";
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setTaskInput(text);
      toast.success("Voz capturada! Decompondo com IA...");
      setTimeout(() => {
        setDecomposing(true);
        decomposeMutation.mutate({ taskDescription: text, priority });
      }, 500);
    };
    recognition.onerror = () => toast.error("Erro no reconhecimento de voz.");
    recognition.start();
    toast.info("🎙️ Ouvindo... fale sua tarefa");
  };

  const grouped = PRIORITIES.reduce((acc, p) => {
    acc[p.key] = (tasks ?? []).filter(t => t.priority === p.key || (!t.priority && p.key === "sem"));
    return acc;
  }, {} as Record<string, TaskItem[]>);

  const totalMinutes = (tasks ?? []).filter(t => t.status !== "completed").reduce((s, t) => s + (t.totalEstimatedTime ?? 0), 0);
  const totalH = Math.floor(totalMinutes / 60);
  const totalM = totalMinutes % 60;

  return (
    <div className="screen-container">
      <AppHeader />
      <div className="px-5 mb-2">
        <h2 className="text-2xl font-black text-[#1C1C1E]">Tarefas</h2>
        {totalMinutes > 0 && <p className="text-xs text-[#8E8E93]">~{totalH > 0 ? `${totalH}h ` : ""}{totalM > 0 ? `${totalM}min` : ""} pendentes hoje</p>}
      </div>

      {/* Input de tarefa */}
      <div className="mx-5 mb-3 bg-white rounded-2xl border border-[#E8DFD0] p-4">
        <div className="flex gap-2 mb-2">
          <input
            value={taskInput} onChange={e => setTaskInput(e.target.value)}
            placeholder="Qual tarefa você quer capturar?"
            className="flex-1 text-sm bg-[#FDF5E6] rounded-xl border border-[#E8DFD0] px-3 py-2.5 outline-none focus:border-[#E67E22] placeholder:text-[#C0B8A8]"
          />
          <button onClick={handleVoice}
            className="w-10 h-10 rounded-xl bg-[#FEF3E2] flex items-center justify-center text-lg flex-shrink-0">
            🎙️
          </button>
        </div>
        <div className="flex gap-2 mb-2">
          <input
            value={timeInput} onChange={e => setTimeInput(e.target.value)}
            placeholder="Tempo (ex: 30 min, 1h)"
            className="flex-1 text-sm bg-[#FDF5E6] rounded-xl border border-[#E8DFD0] px-3 py-2 outline-none focus:border-[#E67E22] placeholder:text-[#C0B8A8]"
          />
          <button onClick={() => setShowPriorityModal(true)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-[#E8DFD0] bg-[#FDF5E6] text-xs font-bold"
            style={{ color: PRIORITIES.find(p => p.key === priority)?.color }}>
            {PRIORITIES.find(p => p.key === priority)?.label.split(" ")[0]} {priority !== "sem" ? priority.charAt(0).toUpperCase() + priority.slice(1) : "Prioridade"}
          </button>
        </div>
        <button onClick={handleDecompose} disabled={decomposing || !taskInput.trim()}
          className="w-full h-10 rounded-xl bg-[#E67E22] text-white text-sm font-bold disabled:opacity-50 transition-all active:scale-95">
          {decomposing ? "✨ Decompondo com IA..." : "✨ Deixar a IA decompor em micro-passos"}
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 px-5 mb-3 overflow-x-auto scrollbar-hide">
        {[{ key: "todas", label: "Todas" }, ...PRIORITIES].map(p => (
          <button key={p.key} onClick={() => setFilter(p.key)}
            className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all"
            style={filter === p.key
              ? { background: PRIORITIES.find(x => x.key === p.key)?.color ?? "#E67E22", color: "white", borderColor: "transparent" }
              : { background: "white", color: "#8E8E93", borderColor: "#E8DFD0" }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Blocos de prioridade */}
      {PRIORITIES.filter(p => filter === "todas" || filter === p.key).map(p => {
        const blockTasks = grouped[p.key] ?? [];
        if (blockTasks.length === 0 && filter !== "todas") return null;
        const blockMinutes = blockTasks.reduce((s, t) => s + (t.totalEstimatedTime ?? 0), 0);
        const bH = Math.floor(blockMinutes / 60), bM = blockMinutes % 60;
        const isExpanded = expandedBlocks[p.key] !== false;
        return (
          <div key={p.key} className="task-block mb-3" style={{ borderColor: p.border }}>
            <div className="task-block-header" style={{ background: p.bg }}
                 onClick={() => setExpandedBlocks(prev => ({ ...prev, [p.key]: !isExpanded }))}>
              <span className="text-sm">{p.label.split(" ")[0]}</span>
              <span className="text-xs font-bold flex-1" style={{ color: p.color }}>{p.label.split(" ").slice(1).join(" ")}</span>
              <span className="text-[10px] text-[#8E8E93]">{blockTasks.length} tarefa{blockTasks.length !== 1 ? "s" : ""}{blockMinutes > 0 ? ` · ~${bH > 0 ? bH + "h " : ""}${bM > 0 ? bM + "min" : ""}` : ""}</span>
              <span className="text-[#8E8E93] text-xs ml-1">{isExpanded ? "▲" : "▼"}</span>
            </div>
            {isExpanded && blockTasks.map(task => (
              <div key={task.id} className="task-item flex-col">
                <div className="flex items-center gap-2 w-full">
                  <input type="checkbox" checked={task.status === "completed"}
                    onChange={e => updateStatus.mutate({ taskId: task.id, status: e.target.checked ? "completed" : "pending" })}
                    className="w-4 h-4 rounded accent-[#E67E22] flex-shrink-0" />
                  {editingTask === task.id ? (
                    <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
                      onBlur={() => setEditingTask(null)} onKeyDown={e => { if (e.key === "Enter") setEditingTask(null); if (e.key === "Escape") setEditingTask(null); }}
                      className="flex-1 text-sm bg-[#FDF5E6] border border-[#E67E22] rounded-lg px-2 py-1 outline-none" />
                  ) : (
                    <span className={`flex-1 text-sm font-semibold ${task.status === "completed" ? "line-through text-[#8E8E93]" : "text-[#1C1C1E]"}`}
                          onDoubleClick={() => { setEditingTask(task.id); setEditValue(task.title); }}>
                      {task.title}
                    </span>
                  )}
                  {!!task.totalEstimatedTime && task.totalEstimatedTime > 0 && (
                    <span className="text-[10px] text-[#8E8E93] flex-shrink-0">⏱ {task.totalEstimatedTime}min</span>
                  )}
                  <button onClick={() => setExpandedTasks(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                    className="text-xs text-[#8E8E93] flex-shrink-0">
                    {task.steps?.length > 0 ? (expandedTasks[task.id] ? "▲" : `▼ ${task.steps.length}`) : ""}
                  </button>
                </div>
                {expandedTasks[task.id] && task.steps?.map(step => (
                  <div key={step.id} className="flex items-center gap-2 mt-2 ml-6">
                    <input type="checkbox" checked={step.completed}
                      onChange={e => updateStep.mutate({ microStepId: step.id, completed: e.target.checked })}
                      className="w-3.5 h-3.5 rounded accent-[#E67E22]" />
                    <span className={`text-xs ${step.completed ? "line-through text-[#8E8E93]" : "text-[#3C3C43]"}`}>{step.title}</span>
                    {step.estimatedTime && <span className="text-[9px] text-[#8E8E93]">~{step.estimatedTime}min</span>}
                  </div>
                ))}
                {task.steps?.length > 0 && (
                  <div className="mt-2 ml-6 w-full">
                    <div className="h-1 rounded-full bg-[#E8DFD0] overflow-hidden">
                      <div className="h-full rounded-full bg-[#2E8B57] transition-all" style={{ width: `${task.progress}%` }} />
                    </div>
                    <span className="text-[9px] text-[#8E8E93]">{task.progress}% concluído</span>
                  </div>
                )}
              </div>
            ))}
            {isExpanded && blockTasks.length === 0 && (
              <div className="px-4 py-3 text-xs text-[#8E8E93] text-center bg-white">Nenhuma tarefa nesta prioridade</div>
            )}
          </div>
        );
      })}

      {/* Modal de prioridade */}
      {showPriorityModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setShowPriorityModal(false)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl p-5" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-[#E8DFD0] mx-auto mb-4" />
            <h3 className="text-base font-black text-[#1C1C1E] mb-3">Definir prioridade</h3>
            {PRIORITIES.map(p => (
              <button key={p.key} onClick={() => { setPriority(p.key as TaskPriority); setShowPriorityModal(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl mb-2 text-left transition-all"
                style={{ background: priority === p.key ? p.bg : "transparent", border: `1.5px solid ${priority === p.key ? p.border : "#E8DFD0"}` }}>
                <span className="text-lg">{p.label.split(" ")[0]}</span>
                <span className="text-sm font-bold" style={{ color: p.color }}>{p.label.split(" ").slice(1).join(" ")}</span>
                {priority === p.key && <span className="ml-auto text-xs font-bold" style={{ color: p.color }}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
