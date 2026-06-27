import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { CalendarTaskModal } from "./CalendarTaskModal";

interface CalendarTask {
  id: number;
  title: string;
  date: string;
  status: "pending" | "in_progress" | "completed";
  difficulty: "easy" | "medium" | "hard";
  estimatedTime?: number;
}

interface DayTasks {
  [key: string]: CalendarTask[];
}

// Função auxiliar para formatar data sem problemas de fuso horário
function getDateKey(dateObj: Date): string {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Função para parsear data ISO string corretamente
function parseISODate(isoString: string): Date {
  const parts = isoString.split('T')[0].split('-');
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dayTasks, setDayTasks] = useState<DayTasks>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  const { data: tasks, refetch } = trpc.tasks.list.useQuery();

  // Agrupar tarefas por data
  useEffect(() => {
    if (!tasks) return;

    const grouped: DayTasks = {};
    tasks.forEach((task: any) => {
      let date: Date;
      
      if (typeof task.created_at === 'string') {
        date = parseISODate(task.created_at);
      } else {
        date = new Date(task.created_at);
      }
      
      const dateKey = getDateKey(date);

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      grouped[dateKey].push({
        id: task.id,
        title: task.title,
        date: dateKey,
        status: task.status || 'pending',
        difficulty: task.difficulty || 'medium',
        estimatedTime: task.total_estimated_time,
      });
    });

    setDayTasks(grouped);
  }, [tasks]);

  // Obter dias do mês
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const getDateKeyForDay = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return getDateKey(date);
  };

  const getTasksForDay = (day: number) => {
    const dateKey = getDateKeyForDay(day);
    return dayTasks[dateKey] || [];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return { bg: "#E8F5EE", text: "#2E8B57", border: "#A8D5B8" };
      case "in_progress":
        return { bg: "#FEF9E7", text: "#D4AC0D", border: "#F7DC6F" };
      default:
        return { bg: "#EBF5FB", text: "#2980B9", border: "#AED6F1" };
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "🟢";
      case "medium":
        return "🟡";
      case "hard":
        return "🔴";
      default:
        return "⚪";
    }
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-[#E8DFD0] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-[#1C1C1E]">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrevMonth}
            className="w-9 h-9 rounded-lg bg-[#F5F5F5] hover:bg-[#E8E8E8] flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={18} className="text-[#8E8E93]" />
          </button>
          <button
            onClick={handleNextMonth}
            className="w-9 h-9 rounded-lg bg-[#F5F5F5] hover:bg-[#E8E8E8] flex items-center justify-center transition-colors"
          >
            <ChevronRight size={18} className="text-[#8E8E93]" />
          </button>
        </div>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-bold text-[#8E8E93] py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendário */}
      <div className="grid grid-cols-7 gap-1">
        {/* Dias vazios do mês anterior */}
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Dias do mês */}
        {days.map((day) => {
          const tasksForDay = getTasksForDay(day);
          const today = isToday(day);
          const dateKey = getDateKeyForDay(day);

          return (
            <button
              key={day}
              onClick={() => {
                setSelectedDay(dateKey);
                setShowModal(true);
              }}
              className={`aspect-square rounded-lg border-2 p-1.5 text-left flex flex-col transition-all hover:shadow-md ${
                today
                  ? "border-[#E67E22] bg-[#FEF3E2]"
                  : "border-[#E8DFD0] bg-white hover:bg-[#F9F9F9]"
              }`}
            >
              <span
                className={`text-xs font-bold ${
                  today ? "text-[#E67E22]" : "text-[#1C1C1E]"
                }`}
              >
                {day}
              </span>

              {/* Tarefas do dia */}
              <div className="flex-1 flex flex-col gap-0.5 mt-1 overflow-hidden">
                {tasksForDay.slice(0, 2).map((task) => {
                  const colors = getStatusColor(task.status);
                  return (
                    <div
                      key={task.id}
                      className="text-[9px] px-1 py-0.5 rounded truncate font-semibold"
                      style={{
                        background: colors.bg,
                        color: colors.text,
                        borderLeft: `2px solid ${colors.border}`,
                      }}
                      title={task.title}
                    >
                      {getDifficultyIcon(task.difficulty)} {task.title}
                    </div>
                  );
                })}

                {/* Indicador de mais tarefas */}
                {tasksForDay.length > 2 && (
                  <div className="text-[8px] text-[#8E8E93] font-semibold px-1">
                    +{tasksForDay.length - 2} mais
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Modal de detalhes do dia */}
      {showModal && selectedDay && (
        <DayDetailsModal
          date={selectedDay}
          tasks={dayTasks[selectedDay] || []}
          onClose={() => {
            setShowModal(false);
            setSelectedDay(null);
          }}
          onTaskClick={(task) => {
            setSelectedTask(task);
            setShowTaskModal(true);
          }}
        />
      )}

      {/* Modal de tarefa individual */}
      {showTaskModal && selectedTask && (
        <CalendarTaskModal
          task={selectedTask}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
          }}
          onStatusChange={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
}

interface DayDetailsModalProps {
  date: string;
  tasks: CalendarTask[];
  onClose: () => void;
  onTaskClick?: (task: CalendarTask) => void;
}

function DayDetailsModal({ date, tasks, onClose, onTaskClick }: DayDetailsModalProps) {
  const dateObj = parseISODate(date);
  const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const monthNames = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];

  const formattedDate = `${dayNames[dateObj.getDay()]}, ${dateObj.getDate()} de ${monthNames[dateObj.getMonth()]}`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return { bg: "#E8F5EE", text: "#2E8B57", label: "✅ Concluída" };
      case "in_progress":
        return { bg: "#FEF9E7", text: "#D4AC0D", label: "⏳ Em progresso" };
      default:
        return { bg: "#EBF5FB", text: "#2980B9", label: "⏸️ Pendente" };
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50 animate-in fade-in">
      <div className="w-full bg-white rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-black text-[#1C1C1E]">{formattedDate}</h3>
            <p className="text-sm text-[#8E8E93] mt-1">
              {tasks.length} {tasks.length === 1 ? "tarefa" : "tarefas"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#F5F5F5] hover:bg-[#E8E8E8] flex items-center justify-center transition-colors"
          >
            <X size={18} className="text-[#8E8E93]" />
          </button>
        </div>

        {/* Tarefas */}
        {tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.map((task) => {
              const colors = getStatusColor(task.status);
              return (
                <button
                  key={task.id}
                  onClick={() => onTaskClick?.(task)}
                  className="w-full text-left bg-white border-2 border-[#E8DFD0] rounded-2xl p-4 hover:shadow-md hover:border-[#E67E22] transition-all active:scale-[0.98]"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: colors.text }}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[#1C1C1E] truncate">
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span
                          className="text-[10px] font-bold px-2 py-1 rounded-full"
                          style={{
                            background: colors.bg,
                            color: colors.text,
                          }}
                        >
                          {colors.label}
                        </span>
                        {task.estimatedTime && (
                          <span className="text-[10px] text-[#8E8E93] font-semibold">
                            ⏱️ {task.estimatedTime} min
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-[#8E8E93] text-sm mb-4">Nenhuma tarefa neste dia</p>
            <button className="inline-flex items-center gap-2 bg-[#E67E22] text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-[#D35400] transition-colors">
              <Plus size={16} />
              Adicionar tarefa
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
