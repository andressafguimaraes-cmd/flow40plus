import { trpc } from "@/lib/trpc";
import AppHeader from "@/components/AppHeader";

const DAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

// Converte um valor na escala 1–5 para altura proporcional dentro do domínio [1, 5]
function scaleToDomain(value: number, maxHeight: number) {
  return Math.max(((value - 1) / 4) * maxHeight, 4);
}

function BarChart({ data, color, label }: { data: number[], color: string, label: string }) {
  const max = Math.max(...data, 1);
  return (
    <div>
      <p className="text-xs font-bold text-muted mb-2">{label}</p>
      <div className="flex items-end gap-1.5 h-16">
        {data.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t-md transition-all" style={{ height: `${(v / max) * 52}px`, background: color, minHeight: 4 }} />
            <span className="text-[9px] text-muted">{DAYS[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Jornada() {
  const { data: weeklyStats } = trpc.checkIns.getWeeklyStats.useQuery();
  const { data: tasks } = trpc.tasks.list.useQuery();

  // Dados fictícios para demo (serão substituídos por dados reais) — escala 1-5
  const sleepData = [3, 4, 2, 5, 4, 3, 4];
  const energyData = [3, 4, 2, 4, 3, 4, 5];
  const tasksPerDay = [3, 5, 2, 4, 3, 6, 2];

  const completedTasks = tasks?.filter(t => t.status === "completed").length ?? 0;
  const totalTasks = tasks?.length ?? 0;

  return (
    <div className="screen-container">
      <AppHeader />
      <div className="px-5 mb-4">
        <h2 className="text-2xl font-light text-foreground">Sua Jornada</h2>
        <p className="text-sm text-muted">Resumo da semana</p>
      </div>

      {/* Resumo do check-in */}
      <p className="section-title">Check-up de hoje</p>
      <div className="grid grid-cols-3 gap-3 px-5 mb-4">
        {[
          { label: "Sono", value: weeklyStats?.averageSleep?.toFixed(1) ?? "—", icon: "🌙", className: "text-secondary" },
          { label: "Energia", value: weeklyStats?.averageEnergy?.toFixed(1) ?? "—", icon: "⚡", className: "text-accent" },
          { label: "Clareza", value: weeklyStats?.averageClarity?.toFixed(1) ?? "—", icon: "🧠", className: "text-foreground" },
        ].map(({ label, value, icon, className }) => (
          <div key={label} className="bg-card rounded-2xl border border-border p-3 text-center">
            <div className="text-xl mb-1">{icon}</div>
            <div className={`text-xl font-black ${className}`}>{value}</div>
            <div className="text-[9px] text-muted">/5 média</div>
            <div className="text-[10px] text-muted mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Gráfico Humor & Energia */}
      <p className="section-title">Energia da semana</p>
      <div className="mx-5 mb-4 bg-card rounded-2xl border border-border p-4">
        <div className="flex gap-4 mb-3">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-secondary"/><span className="text-[10px] text-muted">Sono</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-accent"/><span className="text-[10px] text-muted">Energia</span></div>
        </div>
        <div className="flex items-end gap-1 h-20">
          {DAYS.map((day, i) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex gap-0.5 items-end" style={{ height: 52 }}>
                <div className="flex-1 rounded-t-sm bg-secondary" style={{ height: `${scaleToDomain(sleepData[i], 52)}px` }} />
                <div className="flex-1 rounded-t-sm bg-accent" style={{ height: `${scaleToDomain(energyData[i], 52)}px` }} />
              </div>
              <span className="text-[9px] text-muted">{day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico Tarefas */}
      <p className="section-title">Tarefas concluídas por dia</p>
      <div className="mx-5 mb-4 bg-card rounded-2xl border border-border p-4">
        <BarChart data={tasksPerDay} color="var(--color-secondary)" label="Tarefas realizadas" />
      </div>

      {/* Resumo geral */}
      <p className="section-title">Esta semana</p>
      <div className="grid grid-cols-2 gap-3 px-5 mb-4">
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <div className="text-3xl font-black text-secondary">{completedTasks}</div>
          <div className="text-xs text-muted mt-1">Tarefas concluídas</div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <div className="text-3xl font-black text-accent">{weeklyStats?.count ?? 0}</div>
          <div className="text-xs text-muted mt-1">Check-ups feitos</div>
        </div>
      </div>
    </div>
  );
}
