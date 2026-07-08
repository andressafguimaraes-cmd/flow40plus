import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AppHeader from "@/components/AppHeader";
import { toast } from "sonner";

const CATEGORIES = [
  { key: "todas", label: "Todas" },
  { key: "focus", label: "🎯 Foco" },
  { key: "relief", label: "🌿 Alívio" },
  { key: "strength", label: "💪 Força" },
  { key: "inspiration", label: "💡 Inspiração" },
];

const PRACTICE_SLIDES: Record<string, { title: string; steps: { title: string; desc: string; duration?: number; tip?: string }[] }> = {
  "Foco Profundo": {
    title: "Foco Profundo",
    steps: [
      { title: "Prepare seu espaço", desc: "Feche abas desnecessárias. Coloque o celular no silencioso. Tenha água por perto.", tip: "Um ambiente limpo reduz a carga cognitiva em até 30%." },
      { title: "Defina sua intenção", desc: "Escreva em uma frase o que você vai realizar nesta sessão.", tip: "Intenção clara ativa o córtex pré-frontal e melhora o foco." },
      { title: "Sessão de foco", desc: "Trabalhe sem interrupções por 25 minutos.", duration: 25 * 60, tip: "A técnica Pomodoro foi validada por décadas de pesquisa em produtividade." },
      { title: "Pausa ativa", desc: "Levante, alongue o pescoço e os ombros. Respire fundo 3 vezes.", duration: 5 * 60, tip: "Pausas curtas restauram a atenção e previnem fadiga mental." },
      { title: "Reflexão", desc: "O que você concluiu? Anote uma conquista, por menor que seja.", tip: "Registrar progresso libera dopamina e reforça o hábito." },
    ]
  },
  "Respiração 4-7-8": {
    title: "Respiração 4-7-8",
    steps: [
      { title: "Posição confortável", desc: "Sente-se com a coluna ereta. Relaxe os ombros. Feche os olhos.", tip: "Esta técnica ativa o sistema nervoso parassimpático em segundos." },
      { title: "Inspire", desc: "Inspire pelo nariz contando mentalmente até 4.", duration: 4, tip: "Respire pelo nariz para filtrar e aquecer o ar." },
      { title: "Segure", desc: "Segure o ar nos pulmões contando até 7.", duration: 7, tip: "Segurar o ar aumenta a oxigenação do sangue." },
      { title: "Expire", desc: "Expire lentamente pela boca contando até 8.", duration: 8, tip: "A expiração longa ativa o nervo vago e reduz o cortisol." },
      { title: "Repita 4 vezes", desc: "Faça mais 3 ciclos completos. Sinta a calma se instalar.", tip: "4 ciclos são suficientes para reduzir a ansiedade significativamente." },
    ]
  },
  "Fortalecimento Mental": {
    title: "Fortalecimento Mental",
    steps: [
      { title: "Journaling de 5 minutos", desc: "Escreva livremente sobre como está se sentindo agora. Sem julgamentos.", duration: 5 * 60, tip: "Escrever organiza pensamentos e reduz a ruminação mental." },
      { title: "3 gratidões", desc: "Liste 3 coisas pelas quais você é grata hoje, por menores que sejam.", tip: "Gratidão diária remodela o cérebro em direção ao otimismo." },
      { title: "Visualização positiva", desc: "Feche os olhos e visualize um momento em que você se sentiu forte e capaz.", duration: 3 * 60, tip: "Visualização ativa os mesmos circuitos neurais da experiência real." },
      { title: "Afirmação do dia", desc: "Escolha uma frase que te fortaleça e repita 3 vezes em voz alta.", tip: "Afirmações ditas em voz alta têm maior impacto neurológico." },
    ]
  },
  "Inspiração & Criatividade": {
    title: "Inspiração & Criatividade",
    steps: [
      { title: "Desconecte por 5 minutos", desc: "Afaste-se das telas. Olhe pela janela ou saia para o ar livre.", duration: 5 * 60, tip: "O modo padrão do cérebro (devaneio) é onde nascem as melhores ideias." },
      { title: "Palavra geradora", desc: "Escolha uma palavra aleatória e liste 5 conexões com seu projeto ou desafio atual.", tip: "Associações aleatórias ativam o pensamento lateral e criativo." },
      { title: "Movimento livre", desc: "Dance, agite os braços, faça movimentos espontâneos por 2 minutos.", duration: 2 * 60, tip: "Movimento libera BDNF, proteína que estimula o crescimento neuronal." },
      { title: "Capture sua ideia", desc: "Anote qualquer insight que surgiu. Não filtre, apenas registre.", tip: "Ideias não capturadas em 30 segundos tendem a ser esquecidas." },
    ]
  },
};

const STATIC_PRACTICES = [
  { id: 1, name: "Foco Profundo", category: "focus", duration: 30, description: "Práticas para aumentar sua concentração e presença.", icon: "🎯", bg: "#FEF3E2" },
  { id: 2, name: "Respiração 4-7-8", category: "relief", duration: 5, description: "Respire, solte e recupere sua energia.", icon: "🌿", bg: "#E8F5EE" },
  { id: 3, name: "Fortalecimento Mental", category: "strength", duration: 15, description: "Exercite sua mente com intenção.", icon: "💪", bg: "#FEF9E7" },
  { id: 4, name: "Inspiração & Criatividade", category: "inspiration", duration: 12, description: "Desperte criatividade e motivação.", icon: "💡", bg: "#EDE9F7" },
];

function PracticeSlides({ practice, onClose }: { practice: typeof STATIC_PRACTICES[0]; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [timer, setTimer] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const logProgress = trpc.practices.logProgress.useMutation({ onSuccess: () => toast.success("Prática concluída! 🌟") });

  const slides = PRACTICE_SLIDES[practice.name];
  if (!slides) return null;
  const current = slides.steps[step];
  const isLast = step === slides.steps.length - 1;
  const progress = ((step) / slides.steps.length) * 100;

  const handleComplete = () => {
    logProgress.mutate({ practiceId: practice.id });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-[#E8DFD0]">
        <div className="h-full bg-[#E67E22] transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={onClose} className="text-[#8E8E93] text-sm">← Voltar</button>
        <span className="text-xs font-bold text-[#8E8E93]">{step + 1} / {slides.steps.length}</span>
        <div className="w-12" />
      </div>

      {/* Content */}
      <div className="flex-1 px-5 flex flex-col justify-center">
        <div className="text-4xl mb-4 text-center">{practice.icon}</div>
        <h2 className="text-xl font-black text-[#1C1C1E] text-center mb-2">{current.title}</h2>
        <p className="text-sm text-[#3C3C43] text-center leading-relaxed mb-6">{current.desc}</p>

        {current.duration && (
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-full border-4 border-[#E67E22] flex items-center justify-center mb-3"
                 style={{ background: "#FEF3E2" }}>
              <span className="text-2xl font-black text-[#E67E22]">
                {current.duration > 60
                  ? `${Math.floor((current.duration - elapsed) / 60)}:${String((current.duration - elapsed) % 60).padStart(2, "0")}`
                  : current.duration - elapsed}
              </span>
            </div>
            <span className="text-xs text-[#8E8E93]">{current.duration > 60 ? "minutos" : "segundos"}</span>
          </div>
        )}

        {current.tip && (
          <div className="bg-white rounded-2xl border border-[#E8DFD0] p-3 mb-4">
            <p className="text-[10px] font-bold text-[#E67E22] mb-1">💡 Por que isso funciona</p>
            <p className="text-xs text-[#8E8E93] leading-relaxed">{current.tip}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-8 pt-3 border-t border-[#E8DFD0]">
        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex-1 h-12 rounded-2xl border border-[#E8DFD0] bg-white text-sm font-bold text-[#1C1C1E]">
              ← Anterior
            </button>
          )}
          <button
            onClick={isLast ? handleComplete : () => setStep(s => s + 1)}
            className="flex-1 h-12 rounded-2xl bg-[#E67E22] text-white text-sm font-bold shadow-[0_4px_14px_rgba(230,126,34,0.38)]">
            {isLast ? "Concluir prática ✓" : "Próximo →"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Practices() {
  const [filter, setFilter] = useState("todas");
  const [activePractice, setActivePractice] = useState<typeof STATIC_PRACTICES[0] | null>(null);

  const filtered = filter === "todas" ? STATIC_PRACTICES : STATIC_PRACTICES.filter(p => p.category === filter);

  if (activePractice) {
    return <PracticeSlides practice={activePractice} onClose={() => setActivePractice(null)} />;
  }

  return (
    <div className="screen-container">
      <AppHeader />
      <div className="px-5 mb-4">
        <h2 className="text-2xl font-black text-[#1C1C1E]">Micro-Práticas</h2>
        <p className="text-sm text-[#8E8E93]">Pequenas ações. Grandes transformações.</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 px-5 mb-4 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map(c => (
          <button key={c.key} onClick={() => setFilter(c.key)}
            className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all"
            style={filter === c.key
              ? { background: "#E67E22", color: "white", borderColor: "transparent" }
              : { background: "white", color: "#8E8E93", borderColor: "#E8DFD0" }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Cards de práticas */}
      <div className="px-5 space-y-3">
        {filtered.map(p => (
          <button key={p.id} onClick={() => setActivePractice(p)}
            className="w-full flex items-center gap-3 bg-white rounded-2xl border border-[#E8DFD0] p-4 text-left hover:shadow-md transition-all active:scale-[0.98]">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                 style={{ background: p.bg }}>
              {p.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#1C1C1E]">{p.name}</p>
              <p className="text-xs text-[#8E8E93] mt-0.5">{p.description}</p>
              <p className="text-[10px] font-bold text-[#E67E22] mt-1">⏱ {p.duration} min</p>
            </div>
            <span className="text-[#8E8E93] text-lg">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
