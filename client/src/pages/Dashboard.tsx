import { trpc } from "@/lib/trpc";
import AppHeader from "@/components/AppHeader";
import { toast } from "sonner";
import { useSuggestedPractice } from "@/hooks/useSuggestedPractice";

const INSIGHTS = [
  "Energia não é fazer mais. É focar no que importa com presença.",
  "Pequenas pausas ao longo do dia aumentam sua produtividade e bem-estar.",
  "Você não precisa fazer tudo hoje. Escolha o que realmente importa.",
  "Cuidar de si não é egoísmo. É a base para cuidar de tudo mais.",
];

interface DashboardProps {
  onOpenCheckIn?: () => void;
}

export default function Dashboard({ onOpenCheckIn }: DashboardProps) {
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

  // Scores /100 baseados nos dados do check-in — domínio real [1, 5]: 1 → 0, 5 → 100
  const toScore = (raw: number) => Math.round(((raw - 1) / 4) * 100);
  const sleepScore = todayCheckIn ? toScore(todayCheckIn.sleepQuality) : (weeklyStats ? toScore(weeklyStats.averageSleep) : 0);
  const energyScore = todayCheckIn ? toScore(todayCheckIn.energyLevel) : (weeklyStats ? toScore(weeklyStats.averageEnergy) : 0);
  const clarityScore = todayCheckIn ? toScore(todayCheckIn.mentalClarity) : (weeklyStats ? toScore(weeklyStats.averageClarity) : 0);

  const suggestedPractice = useSuggestedPractice({ sleepScore, energyScore, clarityScore });
  const handleCompletePractice = () => toast.success("Pausa concluída! 🌿");

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Ótimo";
    if (score >= 60) return "Bom";
    if (score >= 40) return "Moderado";
    return "Baixo";
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
              { label: "Sono", score: sleepScore, icon: "🌙", tone: "secondary" as const },
              { label: "Energia", score: energyScore, icon: "⚡", tone: "accent" as const },
              { label: "Clareza", score: clarityScore, icon: "🧠", tone: "accent" as const },
            ].map(({ label, score, icon, tone }) => (
              <div key={label} className="bg-card rounded-2xl border border-border p-3 text-center">
                <div className="text-xl mb-1">{icon}</div>
                <div className={`text-2xl font-light ${tone === "secondary" ? "text-secondary" : "text-accent"}`}>{score}</div>
                <div className="text-[9px] text-muted font-semibold">/100</div>
                <div className="h-1 rounded-full bg-border overflow-hidden mt-2">
                  <div className={`h-full rounded-full transition-all ${tone === "secondary" ? "bg-secondary" : "bg-accent"}`}
                       style={{ width: `${score}%` }} />
                </div>
                <div className={`text-[10px] font-semibold mt-1.5 ${tone === "secondary" ? "text-secondary" : "text-accent"}`}>{getScoreLabel(score)}</div>
                <div className="text-[10px] text-muted mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="mx-5 mb-4 bg-card rounded-2xl border border-border p-4 text-center">
          <p className="text-sm text-muted mb-2">Faça o check-up matinal para ver seus scores</p>
          <button className="text-xs font-bold text-accent" onClick={handleOpenCheckIn}>
            Fazer check-up agora →
          </button>
        </div>
      )}

      {/* A Próxima Melhor Decisão */}
      <p className="section-title">A Próxima Melhor Decisão</p>
      <div className="mx-5 mb-4 bg-card rounded-3xl border border-border p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center text-2xl flex-shrink-0">
            {suggestedPractice.icone}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-light text-secondary mb-1.5 leading-snug">{suggestedPractice.titulo}</h3>
            <p className="text-sm text-muted leading-relaxed">{suggestedPractice.descricao}</p>
            <p className="text-xs text-muted mt-2">⏱ {suggestedPractice.duracao} min · recupera {suggestedPractice.recupera}</p>
          </div>
        </div>
        <button
          onClick={handleCompletePractice}
          className="w-full mt-5 h-11 rounded-2xl bg-accent text-white text-sm font-semibold transition-all active:scale-95"
        >
          Fazer essa pausa agora
        </button>
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
