import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useThemeColors } from "@/hooks/useThemeColors";

// Paleta específica deste modal (mockup fornecido), com uma cor distinta por métrica.
const ORANGE = "#F2994A";
const BLUE = "#3A7BD5";
const GREEN = "#3FA66A";

interface MetricSliderProps {
  label: string;
  icon: string;
  color: string;
  value: number;
  onChange: (v: number) => void;
  badges: string[];
  minLabel: string;
  maxLabel: string;
}

function MetricSlider({ label, icon, color, value, onChange, badges, minLabel, maxLabel }: MetricSliderProps) {
  const { NAVY, TEXT_MUTED } = useThemeColors();
  const trackRef = useRef<HTMLDivElement>(null);
  const pct = ((value - 1) / 4) * 100;

  const updateFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onChange(Math.round(p * 4) + 1);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) updateFromClientX(e.clientX);
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">{icon}</span>
          <span className="font-semibold text-base" style={{ color: NAVY }}>{label}</span>
        </div>
        <div className="text-xs font-medium" style={{ color: TEXT_MUTED }}>
          <span className="font-semibold" style={{ color }}>{value}</span>/5 · {badges[value - 1]}
        </div>
      </div>

      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        className="relative h-6 flex items-center cursor-pointer touch-none"
      >
        <div className="relative w-full h-1 rounded-full bg-border">
          <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
          <div className="absolute inset-0 flex items-center justify-between">
            {[1, 2, 3, 4, 5].map(i => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={i <= value ? { background: color } : { background: "#fff", boxShadow: "0 0 0 1.5px var(--color-border)" }}
              />
            ))}
          </div>
          <div
            className="absolute top-1/2 w-[22px] h-[22px] -translate-y-1/2 -translate-x-1/2 bg-white rounded-full shadow-md transition-[left]"
            style={{ left: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between text-[11px] mt-2" style={{ color: TEXT_MUTED }}>
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

interface MorningCheckInProps {
  onClose?: () => void;
  onComplete?: () => void;
}

export default function MorningCheckIn({ onClose, onComplete }: MorningCheckInProps) {
  const [, setLocation] = useLocation();
  const { NAVY, CARD, TEXT_MUTED } = useThemeColors();
  const utils = trpc.useUtils();
  const [sleep, setSleep] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [clarity, setClarity] = useState(3);
  const [notes, setNotes] = useState("");
  const [alertTime, setAlertTime] = useState("07:30");
  const [showTimeEdit, setShowTimeEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [listeningGratitude, setListeningGratitude] = useState(false);

  const createCheckIn = trpc.checkIns.create.useMutation({
    onSuccess: () => {
      utils.checkIns.getTodayCheckIn.invalidate();
      utils.checkIns.getWeeklyStats.invalidate();
      toast.success("Check-up registrado! Bom dia 🌅");
      setJustCompleted(true);
      setTimeout(() => {
        if (onComplete) onComplete();
        else setLocation("/dashboard");
      }, 1000);
    },
    onError: () => {
      toast.error("Erro ao salvar. Tente novamente.");
      setSubmitting(false);
    }
  });

  const handleSubmit = () => {
    setSubmitting(true);
    createCheckIn.mutate({ sleepQuality: sleep, energyLevel: energy, mentalClarity: clarity, notes: notes || undefined });
  };

  const handleVoiceGratitude = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("Reconhecimento de voz não suportado neste navegador.");
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    setListeningGratitude(true);
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setNotes(prev => (prev.trim() ? `${prev.trim()} ${text}` : text));
    };
    recognition.onerror = () => toast.error("Erro no reconhecimento de voz.");
    recognition.onend = () => setListeningGratitude(false);
    recognition.start();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-t-[28px] overflow-hidden"
           style={{ background: CARD, maxHeight: "92vh", display: "flex", flexDirection: "column" }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="px-6 pb-3 pt-2 flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="text-2xl font-bold" style={{ color: NAVY }}>Check-up Matinal</h2>
            <div className="flex items-center gap-2">
              {showTimeEdit ? (
                <div className="flex items-center gap-1">
                  <input type="time" value={alertTime}
                    onChange={e => setAlertTime(e.target.value)}
                    className="text-xs border border-border rounded-lg px-2 py-1 outline-none"
                    style={{ borderColor: "var(--color-border)", background: CARD, color: NAVY }}
                  />
                  <button onClick={() => setShowTimeEdit(false)}
                    className="text-xs font-bold" style={{ color: NAVY }}>OK</button>
                </div>
              ) : (
                <button onClick={() => setShowTimeEdit(true)}
                  className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap" style={{ color: TEXT_MUTED }}>
                  🔔 {alertTime}
                  <span className="font-semibold underline underline-offset-2" style={{ color: NAVY }}>Editar</span>
                </button>
              )}
            </div>
          </div>
          <p className="text-sm" style={{ color: TEXT_MUTED }}>Como você está se sentindo hoje?</p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-4" style={{ scrollbarWidth: "none" }}>
          <MetricSlider
            label="Sono" icon="🌙" color={BLUE}
            value={sleep} onChange={setSleep}
            badges={["Exausta", "Cansada", "Regular", "Descansada", "Totalmente revigorada"]}
            minLabel="Exausta" maxLabel="Totalmente revigorada"
          />
          <MetricSlider
            label="Energia" icon="⚡" color={ORANGE}
            value={energy} onChange={setEnergy}
            badges={["Arrastando-se", "Baixa", "Regular", "Disposta", "Pronta para ação"]}
            minLabel="Arrastando-se" maxLabel="Pronta para ação"
          />
          <MetricSlider
            label="Clareza mental" icon="🧠" color={GREEN}
            value={clarity} onChange={setClarity}
            badges={["Nublada", "Dispersa", "Regular", "Focada", "Cristalina e focada"]}
            minLabel="Nublada" maxLabel="Cristalina e focada"
          />

          {/* Gratidão */}
          <div>
            <p className="font-semibold text-[15px] mb-1" style={{ color: NAVY }}>
              Pelo que você é grata hoje? <span className="font-medium text-[13px]" style={{ color: TEXT_MUTED }}>(opcional)</span>
            </p>
            <div className="relative">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ex: Pela saúde, pela família, pelo café quentinho..."
                rows={3}
                className="w-full text-sm rounded-[18px] border border-border p-3.5 pr-11 resize-none outline-none placeholder:text-muted"
                style={{ color: NAVY, background: CARD }}
              />
              <button
                type="button"
                onClick={handleVoiceGratitude}
                className="absolute right-3 top-3 text-[15px]"
                style={{ color: listeningGratitude ? "#C06060" : TEXT_MUTED }}
                aria-label="Ditar gratidão por voz"
              >
                {listeningGratitude ? "🛑" : "🎙️"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-6 pb-8 pt-4 flex-shrink-0" style={{ background: CARD }}>
          <button
            onClick={handleSubmit}
            disabled={submitting || createCheckIn.isPending || justCompleted}
            className="w-full h-14 rounded-2xl text-white font-semibold text-base transition-all active:scale-95 disabled:cursor-default"
            style={{
              background: justCompleted ? GREEN : ORANGE,
              boxShadow: justCompleted ? `0 4px 14px ${GREEN}59` : `0 4px 14px ${ORANGE}59`,
              opacity: submitting || createCheckIn.isPending ? 0.7 : 1,
            }}
          >
            {justCompleted
              ? "Check-up concluído ✓"
              : submitting || createCheckIn.isPending
                ? "Salvando..."
                : "Concluir check-up →"}
          </button>
          {onClose && !justCompleted && (
            <button onClick={onClose}
              className="w-full mt-2 text-xs py-2" style={{ color: TEXT_MUTED }}>
              Pular por hoje
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
