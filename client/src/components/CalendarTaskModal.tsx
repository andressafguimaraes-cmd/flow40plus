import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { X, Check, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CalendarTask {
  id: number;
  title: string;
  date: string;
  status: "pending" | "in_progress" | "completed";
  difficulty: "easy" | "medium" | "hard";
  estimatedTime?: number;
}

interface CalendarTaskModalProps {
  task: CalendarTask;
  onClose: () => void;
  onStatusChange?: () => void;
}

export function CalendarTaskModal({ task, onClose, onStatusChange }: CalendarTaskModalProps) {
  const [status, setStatus] = useState<"pending" | "in_progress" | "completed">(task.status);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateStatus = trpc.tasks.updateTaskStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      onStatusChange?.();
      setTimeout(onClose, 500);
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
      setIsUpdating(false);
    },
  });

  const deleteTask = trpc.tasks.deleteTask.useMutation({
    onSuccess: () => {
      toast.success("Tarefa removida!");
      onStatusChange?.();
      setTimeout(onClose, 500);
    },
    onError: () => {
      toast.error("Erro ao remover tarefa");
    },
  });

  const handleStatusChange = (newStatus: "pending" | "in_progress" | "completed") => {
    setStatus(newStatus);
    setIsUpdating(true);
    updateStatus.mutate({ taskId: task.id, status: newStatus });
  };

  const handleDelete = () => {
    if (confirm("Tem certeza que deseja remover esta tarefa?")) {
      deleteTask.mutate({ taskId: task.id });
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "completed":
        return { bg: "#E8F5EE", text: "#2E8B57", label: "✅ Concluída" };
      case "in_progress":
        return { bg: "#FEF9E7", text: "#D4AC0D", label: "⏳ Em progresso" };
      default:
        return { bg: "#EBF5FB", text: "#2980B9", label: "⏸️ Pendente" };
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "🟢 Fácil";
      case "medium":
        return "🟡 Médio";
      case "hard":
        return "🔴 Difícil";
      default:
        return "⚪ Não definido";
    }
  };

  const colors = getStatusColor(status);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-black text-[#1C1C1E] flex-1 pr-4 break-words">
            {task.title}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F5F5] hover:bg-[#E8E8E8] flex items-center justify-center transition-colors flex-shrink-0"
          >
            <X size={18} className="text-[#8E8E93]" />
          </button>
        </div>

        {/* Informações */}
        <div className="space-y-3 mb-6">
          {/* Status Atual */}
          <div>
            <p className="text-xs font-bold text-[#8E8E93] mb-2">STATUS</p>
            <span
              className="inline-block text-[11px] font-bold px-3 py-1.5 rounded-full"
              style={{
                background: colors.bg,
                color: colors.text,
              }}
            >
              {colors.label}
            </span>
          </div>

          {/* Dificuldade */}
          <div>
            <p className="text-xs font-bold text-[#8E8E93] mb-2">DIFICULDADE</p>
            <p className="text-sm text-[#1C1C1E]">{getDifficultyLabel(task.difficulty)}</p>
          </div>

          {/* Tempo Estimado */}
          {task.estimatedTime && (
            <div>
              <p className="text-xs font-bold text-[#8E8E93] mb-2">TEMPO ESTIMADO</p>
              <p className="text-sm text-[#1C1C1E]">⏱️ {task.estimatedTime} minutos</p>
            </div>
          )}

          {/* Data */}
          <div>
            <p className="text-xs font-bold text-[#8E8E93] mb-2">DATA</p>
            <p className="text-sm text-[#1C1C1E]">📅 {task.date}</p>
          </div>
        </div>

        {/* Botões de Status */}
        <div className="space-y-2 mb-6">
          <p className="text-xs font-bold text-[#8E8E93] mb-3">ATUALIZAR STATUS</p>

          <button
            onClick={() => handleStatusChange("pending")}
            disabled={isUpdating}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              status === "pending"
                ? "bg-[#EBF5FB] border-2 border-[#2980B9] text-[#2980B9]"
                : "bg-white border-2 border-[#E8DFD0] text-[#8E8E93] hover:border-[#2980B9]"
            }`}
          >
            <Clock size={16} />
            Pendente
          </button>

          <button
            onClick={() => handleStatusChange("in_progress")}
            disabled={isUpdating}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              status === "in_progress"
                ? "bg-[#FEF9E7] border-2 border-[#D4AC0D] text-[#D4AC0D]"
                : "bg-white border-2 border-[#E8DFD0] text-[#8E8E93] hover:border-[#D4AC0D]"
            }`}
          >
            <Clock size={16} />
            Em Progresso
          </button>

          <button
            onClick={() => handleStatusChange("completed")}
            disabled={isUpdating}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              status === "completed"
                ? "bg-[#E8F5EE] border-2 border-[#2E8B57] text-[#2E8B57]"
                : "bg-white border-2 border-[#E8DFD0] text-[#8E8E93] hover:border-[#2E8B57]"
            }`}
          >
            <Check size={16} />
            Concluída
          </button>
        </div>

        {/* Botão de Deletar */}
        <button
          onClick={handleDelete}
          disabled={deleteTask.isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm bg-[#FDECEA] border-2 border-[#FBBDBA] text-[#E74C3C] hover:bg-[#FCE4E1] transition-all"
        >
          <Trash2 size={16} />
          Remover Tarefa
        </button>
      </div>
    </div>
  );
}
