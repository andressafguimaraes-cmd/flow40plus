import { useMemo } from "react";
import practicas from "@/data/practicas.json";

export type RecuperaTarget = "energia" | "clareza" | "sono";

export interface Practica {
  id: number;
  pilar: "corpo" | "mente" | "respiracao";
  titulo: string;
  descricao: string;
  duracao: number;
  recupera: RecuperaTarget;
  icone: string;
}

interface CheckInScores {
  sleepScore?: number;
  energyScore?: number;
  clarityScore?: number;
}

const ALL_PRACTICAS = practicas as Practica[];

/**
 * Sugere uma micro-prática: prioriza a métrica mais baixa do check-up de hoje
 * (sono/energia/clareza), com fallback para rotação ao longo do dia quando
 * ainda não há check-up. A rotação muda a cada ~4h para manter a sugestão fresca.
 */
export function useSuggestedPractice(scores?: CheckInScores): Practica {
  return useMemo(() => {
    let target: RecuperaTarget | null = null;

    if (scores && (scores.sleepScore || scores.energyScore || scores.clarityScore)) {
      const ranked: [RecuperaTarget, number][] = [
        ["sono", scores.sleepScore ?? 100],
        ["energia", scores.energyScore ?? 100],
        ["clareza", scores.clarityScore ?? 100],
      ];
      ranked.sort((a, b) => a[1] - b[1]);
      target = ranked[0][0];
    }

    const pool = target ? ALL_PRACTICAS.filter(p => p.recupera === target) : ALL_PRACTICAS;
    const source = pool.length > 0 ? pool : ALL_PRACTICAS;

    const now = new Date();
    const slot = Math.floor(now.getHours() / 4) + now.getDate();
    const index = slot % source.length;

    return source[index];
  }, [scores?.sleepScore, scores?.energyScore, scores?.clarityScore]);
}
