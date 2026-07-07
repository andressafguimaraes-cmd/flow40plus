import { trpc } from "@/lib/trpc";
import AppHeader from "@/components/AppHeader";

const DAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function BarChart({ data, color, label }: { data: number[], color: string, label: string }) {
  const max = Math.max(...data, 1);
  return (
    <div>
      <p className="text-xs font-bold text-[#8E8E93] mb-2">{label}</p>
      <div className="flex items-end gap-1.5 h-16">
        {data.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t-md transition-all" style={{ height: `${(v / max) * 52}px`, background: color, minHeight: 4 }} />
            <span className="text-[9px] text-[#8E8E93]">{DAYS[i]}</span>
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
        <h2 className="text-2xl font-black text-[#1C1C1E]">Sua Jornada</h2>
        <p className="text-sm text-[#8E8E93]">Resumo da semana</p>
      </div>

      {/* Resumo do check-in */}
      <p className="section-title">Check-up de hoje</p>
      <div className="grid grid-cols-3 gap-3 px-5 mb-4">
        {[
          { label: "Sono", value: weeklyStats?.averageSleep?.toFixed(1) ?? "—", icon: "🌙", color: "#7B6FA0" },
          { label: "Energia", value: weeklyStats?.averageEnergy?.toFixed(1) ?? "—", icon: "⚡", color: "#E67E22" },
          { label: "Clareza", value: weeklyStats?.averageClarity?.toFixed(1) ?? "—", icon: "🧠", color: "#2E8B57" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#E8DFD0] p-3 text-center">
            <div className="text-xl mb-1">{icon}</div>
            <div className="text-xl font-black" style={{ color }}>{value}</div>
            <div className="text-[9px] text-[#8E8E93]">/5 média</div>
            <div className="text-[10px] text-[#8E8E93] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Gráfico Humor & Energia */}
      <p className="section-title">Energia da semana</p>
      <div className="mx-5 mb-4 bg-white rounded-2xl border border-[#E8DFD0] p-4">
        <div className="flex gap-4 mb-3">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#7B6FA0]"/><span className="text-[10px] text-[#8E8E93]">Sono</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#E67E22]"/><span className="text-[10px] text-[#8E8E93]">Energia</span></div>
        </div>
        <div className="flex items-end gap-1 h-20">
          {DAYS.map((day, i) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex gap-0.5 items-end" style={{ height: 52 }}>
                <div className="flex-1 rounded-t-sm" style={{ height: `${(sleepData[i] / 5) * 52}px`, background: "#7B6FA0" }} />
                <div className="flex-1 rounded-t-sm" style={{ height: `${(energyData[i] / 5) * 52}px`, background: "#E67E22" }} />
              </div>
              <span className="text-[9px] text-[#8E8E93]">{day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico Tarefas */}
      <p className="section-title">Tarefas concluídas por dia</p>
      <div className="mx-5 mb-4 bg-white rounded-2xl border border-[#E8DFD0] p-4">
        <BarChart data={tasksPerDay} color="#2E8B57" label="Tarefas realizadas" />
      </div>

      {/* Resumo geral */}
      <p className="section-title">Esta semana</p>
      <div className="grid grid-cols-2 gap-3 px-5 mb-4">
        <div className="bg-white rounded-2xl border border-[#E8DFD0] p-4 text-center">
          <div className="text-3xl font-black text-[#E67E22]">{completedTasks}</div>
          <div className="text-xs text-[#8E8E93] mt-1">Tarefas concluídas</div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E8DFD0] p-4 text-center">
          <div className="text-3xl font-black text-[#2E8B57]">{weeklyStats?.count ?? 0}</div>
          <div className="text-xs text-[#8E8E93] mt-1">Check-ups feitos</div>
        </div>
      </div>
    </div>
  );
}
