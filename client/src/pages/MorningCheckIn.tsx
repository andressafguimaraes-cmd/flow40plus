import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface MetricSelectorProps {
  question: string;
  icon: string;
  tone: "accent" | "secondary";
  value: number;
  onChange: (v: number) => void;
  badges: string[];
}

function MetricSelector({ question, icon, tone, value, onChange, badges }: MetricSelectorProps) {
  const isAccent = tone === "accent";
  return (
    <div className="bg-background rounded-2xl p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <p className="text-sm font-light text-foreground flex-1 leading-snug">{question}</p>
      </div>
      <div className="flex items-center justify-between gap-2 mb-2">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-all ${
              n === value
                ? isAccent
                  ? "bg-accent text-white"
                  : "bg-secondary text-white"
                : "bg-card border border-border text-muted"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <p className={`text-xs font-semibold text-center ${isAccent ? "text-accent" : "text-secondary"}`}>
        {badges[value - 1]}
      </p>
    </div>
  );
}

interface MorningCheckInProps {
  onClose?: () => void;
  onComplete?: () => void;
}

export default function MorningCheckIn({ onClose, onComplete }: MorningCheckInProps) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [sleep, setSleep] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [clarity, setClarity] = useState(3);
  const [notes, setNotes] = useState("");
  const [alertTime, setAlertTime] = useState("07:30");
  const [showTimeEdit, setShowTimeEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const createCheckIn = trpc.checkIns.create.useMutation({
    onSuccess: () => {
      utils.checkIns.getTodayCheckIn.invalidate();
      utils.checkIns.getWeeklyStats.invalidate();
      toast.success("Check-up registrado! Bom dia 🌅");
      if (onComplete) onComplete();
      else setLocation("/dashboard");
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card rounded-t-3xl overflow-hidden"
           style={{ maxHeight: "92vh", display: "flex", flexDirection: "column" }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-2xl font-light text-foreground">Check-up Matinal</h2>
            <div className="flex items-center gap-2">
              {showTimeEdit ? (
                <div className="flex items-center gap-1">
                  <input type="time" value={alertTime}
                    onChange={e => setAlertTime(e.target.value)}
                    className="text-xs border border-border rounded-lg px-2 py-1 bg-background outline-none focus:border-accent"
                  />
                  <button onClick={() => setShowTimeEdit(false)}
                    className="text-xs font-bold text-accent">OK</button>
                </div>
              ) : (
                <button onClick={() => setShowTimeEdit(true)}
                  className="flex items-center gap-1 text-xs text-muted bg-background border border-border rounded-lg px-2 py-1">
                  🔔 {alertTime}
                  <span className="text-accent font-bold ml-1">Editar</span>
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-muted">Antes de começar, um instante para se ouvir.</p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ scrollbarWidth: "none" }}>
          <MetricSelector
            question="Como foi o seu descanso esta noite?" icon="🌙" tone="secondary"
            value={sleep} onChange={setSleep}
            badges={["Péssimo", "Ruim", "Razoável", "Bom", "Excelente"]}
          />
          <MetricSelector
            question="Como está o seu nível de energia agora?" icon="⚡" tone="accent"
            value={energy} onChange={setEnergy}
            badges={["Esgotada", "Baixa", "Razoável", "Boa", "Ótima"]}
          />
          <MetricSelector
            question="Como está sua mente, clara ou nublada?" icon="🧠" tone="accent"
            value={clarity} onChange={setClarity}
            badges={["Confusa", "Nebulosa", "Razoável", "Clara", "Cristalina"]}
          />

          {/* Gratidão */}
          <div className="bg-background rounded-2xl p-4 mb-2">
            <p className="text-sm font-light text-foreground mb-1">
              Pelo que você é grata hoje? <span className="text-muted">(opcional)</span>
            </p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Pela saúde, pela família, pelo café quentinho..."
              rows={3}
              className="w-full text-sm text-foreground bg-card rounded-xl border border-border p-3 resize-none outline-none focus:border-accent placeholder:text-muted"
            />
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-5 pb-8 pt-3 flex-shrink-0 bg-card border-t border-border">
          <button
            onClick={handleSubmit}
            disabled={submitting || createCheckIn.isPending}
            className="w-full h-14 rounded-2xl bg-secondary text-white font-semibold text-base
                       transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
          >
            {submitting || createCheckIn.isPending ? "Salvando..." : "Concluir Check-up →"}
          </button>
          {onClose && (
            <button onClick={onClose}
              className="w-full mt-2 text-xs text-muted py-2">
              Pular por hoje
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
