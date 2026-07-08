interface LogoProps {
  size?: "sm" | "md" | "lg";
  showWaves?: boolean;
  showManifesto?: boolean;
  /** Para uso sobre fundos escuros (ex: tela de login) — clareia o texto neutro. */
  dark?: boolean;
  className?: string;
}

const SIZES = {
  sm: { wave: "w-14 h-6", wordmark: "text-lg", manifesto: "text-[9px] gap-1", gap: "mb-1" },
  md: { wave: "w-24 h-10", wordmark: "text-3xl", manifesto: "text-xs gap-1.5", gap: "mb-2" },
  lg: { wave: "w-32 h-14", wordmark: "text-4xl", manifesto: "text-sm gap-2", gap: "mb-3" },
} as const;

export default function Logo({ size = "md", showWaves = true, showManifesto = true, dark = false, className = "" }: LogoProps) {
  const s = SIZES[size];
  const neutral = dark ? "text-white" : "text-secondary";

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {showWaves && (
        <svg viewBox="0 0 120 50" className={`${s.wave} ${s.gap}`} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 24 Q 32 4, 60 19 T 115 11" className="stroke-primary" strokeWidth="5" strokeLinecap="round" />
          <path d="M10 35 Q 35 20, 63 30 T 110 23" className="stroke-accent" strokeWidth="4" strokeLinecap="round" />
        </svg>
      )}

      <div className={`font-black leading-none ${s.wordmark}`}>
        <span className={neutral}>Flow</span>
        <span className="text-primary">40+</span>
      </div>

      {showManifesto && (
        <p className={`font-semibold mt-1.5 flex flex-wrap justify-center ${s.manifesto}`}>
          <span className={neutral}>Mova.</span>
          <span className="text-accent">Nutra.</span>
          <span className="text-primary">Floresça.</span>
          <span className={neutral}>Flua.</span>
        </p>
      )}
    </div>
  );
}
