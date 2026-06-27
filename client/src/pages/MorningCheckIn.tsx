import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface MetricSliderProps {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  minLabel: string;
  maxLabel: string;
  value: number;
  onChange: (v: number) => void;
  badges: string[];
}

function MetricSlider({ label, icon, color, bgColor, minLabel, maxLabel, value, onChange, badges }: MetricSliderProps) {
  const pct = ((value - 1) / 9) * 100;
  return (
    <div className="bg-white rounded-2xl border border-[#E8DFD0] p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: bgColor }}>
            {icon}
          </div>
          <span className="font-bold text-[#1C1C1E] text-sm">{label}</span>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: bgColor, color }}>
          {value}/10 · {badges[Math.floor((value - 1) / 2)]}
        </span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] text-[#8E8E93] w-16 text-left">{minLabel}</span>
        <div className="flex-1 relative">
          <input
            type="range" min={1} max={10} value={value}
            onChange={e => onChange(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer outline-none"
            style={{ background: `linear-gradient(to right, ${color} ${pct}%, #E8DFD0 ${pct}%)` }}
          />
        </div>
        <span className="text-[10px] text-[#8E8E93] w-16 text-right">{maxLabel}</span>
      </div>
      <div className="flex justify-center gap-1 mt-2">
        {[1,2,3,4,5,6,7,8,9,10].map(i => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all"
               style={{ background: i <= value ? color : "#E8DFD0" }} />
        ))}
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
  const [sleep, setSleep] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [clarity, setClarity] = useState(5);
  const [notes, setNotes] = useState("");
  const [alertTime, setAlertTime] = useState("07:30");
  const [showTimeEdit, setShowTimeEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const createCheckIn = trpc.checkIns.create.useMutation({
    onSuccess: () => {
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
      <div className="w-full max-w-md bg-[#FDF5E6] rounded-t-3xl overflow-hidden"
           style={{ maxHeight: "92vh", display: "flex", flexDirection: "column" }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#E8DFD0]" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-2xl font-black text-[#1C1C1E]">Check-up Matinal</h2>
            <div className="flex items-center gap-2">
              {showTimeEdit ? (
                <div className="flex items-center gap-1">
                  <input type="time" value={alertTime}
                    onChange={e => setAlertTime(e.target.value)}
                    className="text-xs border border-[#E8DFD0] rounded-lg px-2 py-1 bg-white outline-none focus:border-[#E67E22]"
                  />
                  <button onClick={() => setShowTimeEdit(false)}
                    className="text-xs font-bold text-[#E67E22]">OK</button>
                </div>
              ) : (
                <button onClick={() => setShowTimeEdit(true)}
                  className="flex items-center gap-1 text-xs text-[#8E8E93] bg-white border border-[#E8DFD0] rounded-lg px-2 py-1">
                  🔔 {alertTime}
                  <span className="text-[#E67E22] font-bold ml-1">Editar</span>
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-[#8E8E93]">Como você está se sentindo hoje?</p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ scrollbarWidth: "none" }}>
          <MetricSlider
            label="Sono" icon="🌙" color="#7B6FA0" bgColor="#EDE9F7"
            minLabel="Muito ruim" maxLabel="Excelente"
            value={sleep} onChange={setSleep}
            badges={["Péssimo","Ruim","Razoável","Bom","Excelente"]}
          />
          <MetricSlider
            label="Energia" icon="⚡" color="#E67E22" bgColor="#FEF3E2"
            minLabel="Muito baixa" maxLabel="Muito alta"
            value={energy} onChange={setEnergy}
            badges={["Esgotada","Baixa","Razoável","Boa","Ótima"]}
          />
          <MetricSlider
            label="Clareza Mental" icon="🧠" color="#2E8B57" bgColor="#E8F5EE"
            minLabel="Confusa" maxLabel="Cristalina"
            value={clarity} onChange={setClarity}
            badges={["Confusa","Nebulosa","Razoável","Clara","Cristalina"]}
          />

          {/* Gratidão */}
          <div className="bg-white rounded-2xl border border-[#E8DFD0] p-4 mb-2">
            <p className="text-sm font-bold text-[#1C1C1E] mb-1">
              Pelo que você é grata hoje? <span className="text-[#8E8E93] font-normal">(opcional)</span>
            </p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Pela saúde, pela família, pelo café quentinho..."
              rows={3}
              className="w-full text-sm text-[#1C1C1E] bg-[#FDF5E6] rounded-xl border border-[#E8DFD0] p-3 resize-none outline-none focus:border-[#E67E22] placeholder:text-[#C0B8A8]"
            />
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-5 pb-8 pt-3 flex-shrink-0 bg-[#FDF5E6] border-t border-[#E8DFD0]">
          <button
            onClick={handleSubmit}
            disabled={submitting || createCheckIn.isPending}
            className="w-full h-14 rounded-2xl bg-[#E67E22] text-white font-bold text-base
                       shadow-[0_4px_14px_rgba(230,126,34,0.38)] hover:shadow-[0_6px_18px_rgba(230,126,34,0.48)]
                       hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-60"
          >
            {submitting || createCheckIn.isPending ? "Salvando..." : "Concluir Check-up →"}
          </button>
          {onClose && (
            <button onClick={onClose}
              className="w-full mt-2 text-xs text-[#8E8E93] py-2">
              Pular por hoje
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
