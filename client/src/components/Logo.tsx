import logoFull from "@/assets/logo-full.png";
import logoFullDark from "@/assets/logo-full-dark.png";
import logoMark from "@/assets/logo-mark.png";
import logoMarkDark from "@/assets/logo-mark-dark.png";
import logoWordmark from "@/assets/logo-wordmark.png";
import logoWordmarkDark from "@/assets/logo-wordmark-dark.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showWaves?: boolean;
  showManifesto?: boolean;
  /** Para uso sobre fundos escuros (ex: tela de login) — troca o texto navy por branco. */
  dark?: boolean;
  className?: string;
}

const WIDTHS = {
  sm: 150,
  md: 210,
  lg: 270,
} as const;

export default function Logo({ size = "md", showWaves = true, showManifesto = true, dark = false, className = "" }: LogoProps) {
  const variant = showWaves
    ? (showManifesto ? (dark ? logoFullDark : logoFull) : (dark ? logoMarkDark : logoMark))
    : (dark ? logoWordmarkDark : logoWordmark);

  return (
    <img
      src={variant}
      alt="Flow40+"
      className={className}
      style={{ width: WIDTHS[size], height: "auto", display: "block" }}
    />
  );
}
