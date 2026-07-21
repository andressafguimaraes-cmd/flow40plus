import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";
import { useSuggestedPractice } from "@/hooks/useSuggestedPractice";
import { useThemeColors } from "@/hooks/useThemeColors";

// Paleta específica desta tela (mockup fornecido)
const SAGE = "#5FA37A";
const SAGE_DARK = "#3F8A63";
const BLUE_SOFT = "#5C8FC7";
const CREAM = "#FBF0D6";
const SAGE_LIGHT = "#DCEEE0";
const PINK = "#FBE3E3";

const INSIGHTS = [
  "Energia não é fazer mais. É focar no que importa com presença.",
  "Pequenas pausas ao longo do dia aumentam sua produtividade e bem-estar.",
  "Você não precisa fazer tudo hoje. Escolha o que realmente importa.",
  "Cuidar de si não é egoísmo. É a base para cuidar de tudo mais.",
  "Pequenos passos consistentes geram grandes transformações.",
];

interface ScoredTask {
  id: number;
  title: string;
  priority?: string | null;
  totalEstimatedTime?: number | null;
  progress: number;
}

// "capacidade" é a média de sono+energia+clareza — não só energia. Os três
// entram no mesmo peso porque uma noite ruim ou a mente nublada afetam a
// tarefa certa pro momento tanto quanto a energia isolada.
function calcularScore(tarefa: ScoredTask, capacidade: number) {
  let score = 0;
  let motivo = "";
  const forcarTopo = tarefa.priority === "urgente";
  const duracao = tarefa.totalEstimatedTime ?? 0;
  const isMicro = duracao > 0 && duracao <= 20;

  if (forcarTopo) {
    score += 1000;
    motivo = "urgente";
  } else if (capacidade >= 4) {
    if (tarefa.priority === "alta") { score += 100; motivo = "alta_energia"; }
    score += duracao * 0.5;
  } else if (capacidade === 3) {
    if (tarefa.priority === "media") { score += 80; motivo = motivo || "energia_media"; }
    if (isMicro) { score += 60; motivo = motivo || "energia_media"; }
  } else {
    if (isMicro) { score += 100; motivo = "energia_baixa"; }
    if (duracao > 0 && duracao <= 15) { score += 80; motivo = motivo || "energia_baixa"; }
  }

  if (tarefa.progress > 0 && tarefa.progress < 100) {
    score += 50;
    if (!forcarTopo) motivo = "continuidade";
  }

  return { score, motivo, forcarTopo };
}

function escolherRecomendacao(lista: ScoredTask[], capacidade: number) {
  let melhor: { tarefa: ScoredTask; r: ReturnType<typeof calcularScore> } | null = null;
  for (const t of lista) {
    const r = calcularScore(t, capacidade);
    if (!melhor || r.score > melhor.r.score) melhor = { tarefa: t, r };
  }
  return melhor;
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function minutesSinceMidnight(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

function parseHM(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

// Âncora só vira "a próxima melhor decisão" a partir de 60min antes do
// horário marcado — antes disso ela fica só visível no Planejamento, sem
// sequestrar a recomendação do Dashboard.
const ANCHOR_LEAD_MINUTES = 60;

// Depois que a pausa sugerida é aceita, não insiste em "descanse" de novo
// por um tempo — no próximo carregamento, tenta sugerir uma tarefa leve.
const REST_COOLDOWN_MS = 25 * 60 * 1000;
const REST_KEY = "flow40_rest_suggested_at";

function frasePrioridade(tarefa: ScoredTask, forcarTopo: boolean) {
  if (forcarTopo) return "Prioridade #1 do dia";
  if (tarefa.priority === "alta") return "Prioridade alta do dia";
  if (tarefa.priority === "media") return "Prioridade média do dia";
  return "Prioridade leve do dia";
}

function tagSono(v: number) { return v <= 2 ? "Baixo" : v === 3 ? "Moderado" : "Excelente"; }
function tagEnergia(v: number) { return v <= 2 ? "Baixo" : v === 3 ? "Moderado" : "Alto"; }
function tagClareza(v: number) { return v <= 2 ? "Nublado" : v === 3 ? "Regular" : "Cristalino"; }

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: "bom dia", icon: "☀️" };
  if (h < 18) return { text: "boa tarde", icon: "🌤️" };
  return { text: "boa noite", icon: "🌙" };
}

interface DashboardProps {
  onOpenCheckIn?: () => void;
}

export default function Dashboard({ onOpenCheckIn }: DashboardProps) {
  const [, setLocation] = useLocation();
  const { NAVY, BG_APP, CARD, TEXT_MUTED, LINE } = useThemeColors();
  const { user } = useAuth();
  const { data: todayCheckIn } = trpc.checkIns.getTodayCheckIn.useQuery();
  const { data: weeklyStats } = trpc.checkIns.getWeeklyStats.useQuery();
  const { data: userTasks } = trpc.tasks.list.useQuery();
  const [modoMenor, setModoMenor] = useState(false);

  const handleOpenCheckIn = () => {
    localStorage.removeItem("flow40_last_checkin");
    onOpenCheckIn?.();
  };

  const greeting = getGreeting();
  const firstName = user?.name?.split(" ")[0] ?? "";
  const insight = INSIGHTS[new Date().getDate() % INSIGHTS.length];

  const hasCheckInData = Boolean(todayCheckIn || weeklyStats?.count);
  const sono = todayCheckIn?.sleepQuality ?? (weeklyStats?.averageSleep ? Math.round(weeklyStats.averageSleep) : 3);
  const energia = todayCheckIn?.energyLevel ?? (weeklyStats?.averageEnergy ? Math.round(weeklyStats.averageEnergy) : 3);
  const clareza = todayCheckIn?.mentalClarity ?? (weeklyStats?.averageClarity ? Math.round(weeklyStats.averageClarity) : 3);

  const suggestedPractice = useSuggestedPractice({ sleepScore: sono, energyScore: energia, clarityScore: clareza });
  const capacidade = Math.round((sono + energia + clareza) / 3);

  const allTasks = userTasks ?? [];
  const todosPendentes = allTasks.filter(t => t.status !== "completed");

  // Só concorrem tarefas de hoje (ou sem data — backlog livre). Tarefas
  // planejadas para outro dia não entram na disputa, senão a recomendação
  // ignora completamente o que a usuária já organizou no Planejamento.
  const hoje = dateKey(new Date());
  const pendentesHoje = todosPendentes.filter(t => t.plannedDate === hoje || !t.plannedDate);

  // Âncoras (horário fixo) só disputam a recomendação dentro da janela de
  // antecedência — fora dela ficam só visíveis no Planejamento, sem
  // aparecer fora de hora no Dashboard.
  const nowMinutes = minutesSinceMidnight(new Date());
  const ancorasHoje = pendentesHoje.filter(t => !!t.scheduledTime);
  const ancoraDevida = ancorasHoje
    .filter(t => parseHM(t.scheduledTime!) - ANCHOR_LEAD_MINUTES <= nowMinutes)
    .sort((a, b) => parseHM(a.scheduledTime!) - parseHM(b.scheduledTime!))[0] ?? null;

  const flexiveisHoje = pendentesHoje.filter(t => !t.scheduledTime);

  const [restSuggestedAt, setRestSuggestedAt] = useState(() => Number(localStorage.getItem(REST_KEY)) || 0);
  const descansoRecente = Date.now() - restSuggestedAt < REST_COOLDOWN_MS;

  const cenario: "ancora" | "fluxo" | "sobrecarga" | "cansaco" = ancoraDevida
    ? "ancora"
    : modoMenor
      ? "sobrecarga"
      : capacidade >= 4
        ? "fluxo"
        : capacidade <= 2 && !descansoRecente
          ? (flexiveisHoje.length >= 4 ? "sobrecarga" : "cansaco")
          : "fluxo";

  const poolBase = modoMenor ? flexiveisHoje.filter(t => (t.totalEstimatedTime ?? 999) <= 20) : flexiveisHoje;
  const pool = poolBase.length > 0 ? poolBase : flexiveisHoje;
  const melhor = pool.length > 0 ? escolherRecomendacao(pool, capacidade) : null;

  interface CardContent {
    eyebrow: string;
    title: string;
    attrPrio: string;
    attrEnergia: string;
    attrTime: string;
    justif: string;
    btnLabel: string;
    btnColor: string;
    onClick: () => void;
  }

  let card: CardContent | null = null;

  if (cenario === "ancora" && ancoraDevida) {
    const tarefa = ancoraDevida;
    card = {
      eyebrow: "Hora do seu compromisso marcado:",
      title: tarefa.title,
      attrPrio: `Agendada para ${tarefa.scheduledTime}`,
      attrEnergia: "Compromisso fixo do seu dia",
      attrTime: tarefa.totalEstimatedTime != null ? `Aproximadamente ${tarefa.totalEstimatedTime} minutos` : "Duração não estimada",
      justif: "Você marcou um horário fixo para esta tarefa — hora de começar.",
      btnLabel: "▶ Começar agora",
      btnColor: SAGE,
      onClick: () => setLocation("/tasks"),
    };
  } else if (cenario === "cansaco" || !melhor) {
    card = {
      eyebrow: "Notamos que você está mais devagar hoje...",
      title: "Sua mente pediu uma pausa.",
      attrPrio: "Poucas tarefas restantes hoje",
      attrEnergia: "Sua energia está baixa neste momento",
      attrTime: "5 minutos já fazem diferença",
      justif: "Você já rendeu bastante hoje. Descansar também é produtivo — não é preciso justificar a pausa.",
      btnLabel: "🌿 Fazer pausa de 5 min",
      btnColor: SAGE,
      onClick: () => {
        localStorage.setItem(REST_KEY, String(Date.now()));
        setRestSuggestedAt(Date.now());
        toast.success(`${suggestedPractice.icone} ${suggestedPractice.titulo} — ${suggestedPractice.descricao}`);
      },
    };
  } else if (cenario === "sobrecarga") {
    const { tarefa } = melhor;
    card = {
      eyebrow: modoMenor ? "Combinado — algo mais leve para agora:" : "Sentimos que hoje está pesando um pouco mais...",
      title: tarefa.title,
      attrPrio: "Faz parte da sua lista de hoje",
      attrEnergia: "Sua energia está mais baixa agora",
      attrTime: `Cerca de ${tarefa.totalEstimatedTime ?? 0} minutos no total`,
      justif: modoMenor
        ? "Reduzimos o tamanho da sugestão. Um passo pequeno já é um passo real."
        : "Você tem bastante coisa pela frente e pouca energia agora. Que tal quebrar essa tarefa em passos menores? Você não precisa dar conta de tudo de uma vez.",
      btnLabel: "✂️ Dividir em pequenos passos",
      btnColor: BLUE_SOFT,
      onClick: () => setLocation("/tasks"),
    };
  } else {
    const { tarefa, r } = melhor;
    let justif = "Boa tarefa para este momento.";
    if (r.motivo === "urgente") {
      justif = tarefa.progress > 0
        ? "Você marcou como prioridade máxima e já começou — hora de concluir."
        : "Você marcou esta tarefa como prioridade máxima para hoje.";
    } else if (r.motivo === "continuidade") {
      justif = "Você já começou esta tarefa. Vamos concluí-la antes de abrir algo novo.";
    } else if (r.motivo === "alta_energia") {
      justif = "Seu foco está afiado agora — ótimo momento para aproveitar esse embalo.";
    } else if (r.motivo === "energia_media") {
      justif = "Um bom equilíbrio para o seu momento atual.";
    }

    card = {
      eyebrow: "Agora faz sentido...",
      title: tarefa.title,
      attrPrio: frasePrioridade(tarefa, r.forcarTopo),
      attrEnergia: "Compatível com sua energia atual",
      attrTime: `Aproximadamente ${tarefa.totalEstimatedTime ?? 0} minutos`,
      justif,
      btnLabel: "▶ Começar tarefa",
      btnColor: SAGE,
      onClick: () => setLocation("/tasks"),
    };
  }

  const handleRecalibrar = () => {
    toast.info("Recalibrando seu momento atual...");
    handleOpenCheckIn();
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: BG_APP }}>
      {/* Cabeçalho com logo completa */}
      <div className="relative flex flex-col items-center pt-5 pb-1 px-5">
        <button
          onClick={() => setLocation("/planejamento")}
          className="absolute right-5 top-5 w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-base"
          style={{ color: NAVY, background: CARD, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          aria-label="Ir para Planejamento"
        >
          📅
        </button>
        <Logo size="md" />
      </div>

      <div className="px-5">
        <p className="text-[15px] mb-3.5" style={{ color: "#2c2c2c" }}>
          {firstName ? `${firstName}, ${greeting.text}!` : `Que bom te ver, ${greeting.text}!`} {greeting.icon}
        </p>

        {/* Próxima melhor decisão */}
        <p className="text-[15px] font-bold uppercase tracking-wide mb-3" style={{ color: NAVY }}>Sua próxima melhor decisão</p>

        {card && (
          <>
            <div className="rounded-[20px] p-4 pb-3.5 mb-3 text-white" style={{ background: "rgba(22,54,90,0.94)", boxShadow: "0 12px 28px rgba(22,54,90,0.28)" }}>
              <p className="text-[11.5px] mb-1 leading-snug" style={{ color: "#B9C7D6" }}>{card.eyebrow}</p>
              <h3 className="text-[17px] font-bold leading-snug mb-2.5">{card.title}</h3>
              <div className="flex flex-col gap-1.5 mb-2.5">
                <div className="flex items-center gap-2 text-[12.5px]" style={{ color: "#E7EEF3" }}>
                  <span className="w-4 text-center text-xs" style={{ color: "#7FD9A4" }}>✓</span>{card.attrPrio}
                </div>
                <div className="flex items-center gap-2 text-[12.5px]" style={{ color: "#E7EEF3" }}>
                  <span className="w-4 text-center text-xs" style={{ color: "#F2C464" }}>⚡</span>{card.attrEnergia}
                </div>
                <div className="flex items-center gap-2 text-[12.5px]" style={{ color: "#E7EEF3" }}>
                  <span className="w-4 text-center text-xs" style={{ color: "#9FC3E0" }}>🕐</span>{card.attrTime}
                </div>
              </div>
              <div className="h-px mb-2.5" style={{ background: "rgba(255,255,255,0.14)" }} />
              <div className="flex items-start gap-2 text-[12.5px] leading-snug mb-3" style={{ color: "#CFE0D6" }}>
                <span className="text-[13px] flex-shrink-0" style={{ color: "#F2C464" }}>💡</span>
                <span>{card.justif}</span>
              </div>
              <button
                onClick={card.onClick}
                className="w-full rounded-xl py-2.5 text-[13.5px] font-semibold text-white transition-all active:scale-[0.97]"
                style={{ background: card.btnColor }}
              >
                {card.btnLabel}
              </button>
              <button
                onClick={() => setModoMenor(v => !v)}
                className="w-full text-center text-[11px] font-medium mt-2.5"
                style={{ color: "#AEC0CE" }}
              >
                ⏳ Meu tempo mudou · Sugerir algo menor
              </button>
            </div>
            <button onClick={() => setLocation("/tasks")} className="w-full text-center text-[13px] font-medium mb-5" style={{ color: SAGE_DARK }}>
              Ou veja todas as suas tarefas ›
            </button>
          </>
        )}

        {/* Seu estado hoje */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-[15px] font-bold uppercase tracking-wide" style={{ color: NAVY }}>Seu estado hoje</p>
          <button
            onClick={() => toast.info("Registrado no seu check-up matinal, numa escala de 1 (mais baixo) a 5 (mais alto).")}
            className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0"
            style={{ border: `1px solid ${LINE}`, color: "#8C948C" }}
            aria-label="Sobre esta seção"
          >
            i
          </button>
        </div>

        {hasCheckInData ? (
          <div className="flex gap-2.5 mb-5">
            <div className="flex-1 rounded-2xl py-3.5 px-2.5 text-center" style={{ background: CREAM }}>
              <div className="text-[17px] mb-1.5">🌙</div>
              <div className="text-2xl font-bold" style={{ color: NAVY }}>{sono}<span className="text-[13px] font-semibold" style={{ color: "#9AA39C" }}>/5</span></div>
              <div className="text-[11.5px] font-medium mt-0.5" style={{ color: "#5A5A54" }}>{tagSono(sono)}</div>
            </div>
            <div className="flex-[1.16] rounded-2xl py-3.5 px-2.5 text-center" style={{ background: SAGE_LIGHT }}>
              <div className="text-[17px] mb-1.5">⚡</div>
              <div className="text-2xl font-bold" style={{ color: NAVY }}>{energia}<span className="text-[13px] font-semibold" style={{ color: "#9AA39C" }}>/5</span></div>
              <div className="text-[11.5px] font-medium mt-0.5" style={{ color: "#5A5A54" }}>{tagEnergia(energia)}</div>
            </div>
            <div className="flex-1 rounded-2xl py-3.5 px-2.5 text-center" style={{ background: PINK }}>
              <div className="text-[17px] mb-1.5">🧠</div>
              <div className="text-2xl font-bold" style={{ color: NAVY }}>{clareza}<span className="text-[13px] font-semibold" style={{ color: "#9AA39C" }}>/5</span></div>
              <div className="text-[11.5px] font-medium mt-0.5" style={{ color: "#5A5A54" }}>{tagClareza(clareza)}</div>
            </div>
          </div>
        ) : (
          <div className="mb-5 rounded-2xl p-4 text-center" style={{ background: CARD }}>
            <p className="text-sm mb-2" style={{ color: TEXT_MUTED }}>Faça o check-up matinal para ver seu estado hoje</p>
            <button className="text-xs font-bold" style={{ color: SAGE_DARK }} onClick={handleOpenCheckIn}>
              Fazer check-up agora →
            </button>
          </div>
        )}

        {/* Insight do dia */}
        <div className="flex items-start gap-3 rounded-[18px] p-4 mb-4" style={{ background: CARD, boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
          <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[15px] flex-shrink-0" style={{ background: SAGE_LIGHT, color: SAGE_DARK }}>
            💡
          </div>
          <div>
            <p className="font-semibold text-[14.5px] mb-1" style={{ color: NAVY }}>Insight de hoje</p>
            <p className="text-[13px] leading-relaxed" style={{ color: TEXT_MUTED }}>{insight}</p>
          </div>
        </div>

        <button
          onClick={handleRecalibrar}
          className="w-full flex items-center justify-center gap-1.5 text-[13px] font-medium py-2"
          style={{ color: "#7C8C7F" }}
        >
          🔄 Recalibrar momento atual
        </button>
      </div>
    </div>
  );
}
