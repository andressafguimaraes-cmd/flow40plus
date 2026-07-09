import { useTheme } from "@/contexts/ThemeContext";

/**
 * Tokens de superfície (fundo, texto, cartão, borda) que precisam se
 * inverter no tema escuro. Cores de destaque saturadas (sage, orange, tags
 * de prioridade etc.) já leem bem nos dois temas e não entram aqui —
 * cada tela mantém as suas.
 */
export function useThemeColors() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return {
    isDark,
    NAVY: isDark ? "#EDEFEA" : "#16365A",
    BG_APP: isDark ? "#0F1A15" : "#EEF3EC",
    CARD: isDark ? "#1B2A23" : "#FFFFFF",
    TEXT_MUTED: isDark ? "#93A69B" : "#8C948C",
    LINE: isDark ? "#2A3B33" : "#E7E5DE",
  };
}
