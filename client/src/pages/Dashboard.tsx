import { trpc } from "@/lib/trpc";
import AppHeader from "@/components/AppHeader";
import { useLocation } from "wouter";

const INSIGHTS = [
  "Energia não é fazer mais. É focar no que importa com presença.",
  "Pequenas pausas ao longo do dia aumentam sua produtividade e bem-estar.",
  "Você não precisa fazer tudo hoje. Escolha o que realmente importa.",
  "Cuidar de si não é egoísmo. É a base para cuidar de tudo mais.",
];

const RECS = [
  { icon: "🎯", bg: "#FEF3E2", title: "Tarefa de Foco Profundo", desc: "Trabalhe em algo importante por 60–90 min.", path: "/tasks" },
  { icon: "🌿", bg: "#E8F5EE", title: "Micro-Prática de Alívio", desc: "Respire, solte e recupere sua energia.", path: "/practices" },
  { icon: "💪", bg: "#FEF3C7", title: "Fortalecimento Mental", desc: "Exercite sua mente com intenção.", path: "/practices" },
];

interface DashboardProps {
  onOpenCheckIn?: () => void;
}

export default function Dashboard({ onOpenCheckIn }: DashboardProps) {
  const [, setLocation] = useLocation();
  const { data: todayCheckIn } = trpc.checkIns.getTodayCheckIn.useQuery();
  const { data: weeklyStats } = trpc.checkIns.getWeeklyStats.useQuery();

  const handleOpenCheckIn = () => {
    localStorage.removeItem("flow40_last_checkin");
    onOpenCheckIn?.();
  };

  const today = new Date();
  const dayNames = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
  const monthNames = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const dateStr = `${dayNames[today.getDay()]}, ${today.getDate()} de ${monthNames[today.getMonth()]}`;

  const insight = INSIGHTS[today.getDate() % INSIGHTS.length];

  // Scores /100 baseados nos dados do check-in ou médias semanais
  const sleepScore = todayCheckIn ? Math.round(todayCheckIn.sleepQuality * 10) : (weeklyStats ? Math.round(weeklyStats.averageSleep * 10) : 0);
  const energyScore = todayCheckIn ? Math.round(todayCheckIn.energyLevel * 10) : (weeklyStats ? Math.round(weeklyStats.averageEnergy * 10) : 0);
  const clarityScore = todayCheckIn ? Math.round(todayCheckIn.mentalClarity * 10) : (weeklyStats ? Math.round(weeklyStats.averageClarity * 10) : 0);

  const getScoreColor = (score: number) => {
    if (score >= 70) return "#2E8B57";
    if (score >= 40) return "#E67E22";
    return "#E74C3C";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Ótimo";
    if (score >= 60) return "Bom";
    if (score >= 40) return "Moderado";
    if (score > 0) return "Baixo";
    return "—";
  };

  return (
    <div className="screen-container">
      <AppHeader rightSlot={
        <button className="w-9 h-9 rounded-full bg-white border border-[#E8DFD0] flex items-center justify-center text-[#8E8E93]">
          🔔
        </button>
      } />

      {/* Saudação */}
      <div className="px-5 mb-4">
        <h2 className="text-2xl font-black text-[#1C1C1E]">Visão Geral</h2>
        <p className="text-sm text-[#8E8E93] mt-0.5">{dateStr}</p>
      </div>

      {/* Insight do dia */}
      <div className="insight-card mx-5 mb-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">☀️</span>
          <div>
            <p className="text-xs font-bold text-[#E67E22] mb-1">Insight de Hoje</p>
            <p className="text-sm font-semibold text-[#1C1C1E] italic leading-relaxed">"{insight}"</p>
            <p className="text-xs text-[#8E8E93] mt-1">— Flow40+</p>
          </div>
        </div>
      </div>

      {/* Scores do check-in */}
      {(todayCheckIn || weeklyStats?.count) ? (
        <>
          <p className="section-title">Seu estado hoje</p>
          <div className="grid grid-cols-3 gap-3 px-5 mb-4">
            {[
              { label: "Sono", score: sleepScore, icon: "🌙" },
              { label: "Energia", score: energyScore, icon: "⚡" },
              { label: "Clareza", score: clarityScore, icon: "🧠" },
            ].map(({ label, score, icon }) => (
              <div key={label} className="bg-white rounded-2xl border border-[#E8DFD0] p-3 text-center">
                <div className="text-xl mb-1">{icon}</div>
                <div className="text-2xl font-black" style={{ color: getScoreColor(score) }}>{score}</div>
                <div className="text-[9px] text-[#8E8E93] font-semibold">/100</div>
                <div className="text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full"
                     style={{ background: getScoreColor(score) + "20", color: getScoreColor(score) }}>
                  {getScoreLabel(score)}
                </div>
                <div className="text-[10px] text-[#8E8E93] mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="mx-5 mb-4 bg-white rounded-2xl border border-[#E8DFD0] p-4 text-center">
          <p className="text-sm text-[#8E8E93] mb-2">Faça o check-up matinal para ver seus scores</p>
          <button className="text-xs font-bold text-[#E67E22]" onClick={handleOpenCheckIn}>
            Fazer check-up agora →
          </button>
        </div>
      )}

      {/* Recomendados */}
      <p className="section-title">Recomendado para você</p>
      <div className="px-5 space-y-3 mb-4">
        {RECS.map((rec) => (
          <button key={rec.title} onClick={() => setLocation(rec.path)}
            className="w-full flex items-center gap-3 bg-white rounded-2xl border border-[#E8DFD0] p-4 text-left hover:shadow-md transition-all active:scale-[0.98]">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                 style={{ background: rec.bg }}>
              {rec.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#1C1C1E]">{rec.title}</p>
              <p className="text-xs text-[#8E8E93] mt-0.5">{rec.desc}</p>
            </div>
            <span className="text-[#8E8E93] text-lg">›</span>
          </button>
        ))}
      </div>

      {/* Link discreto de refazer check-in */}
      <div className="text-center pb-4">
        <button
          onClick={handleOpenCheckIn}
          className="text-xs text-[#8E8E93] underline underline-offset-2">
          ↩ Refazer check-up matinal
        </button>
      </div>
    </div>
  );
}
