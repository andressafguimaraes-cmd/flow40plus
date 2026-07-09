import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";
import { toast } from "sonner";

// Paleta específica desta tela (mais escura/saturada que os tokens do app claro),
// conforme mockup fornecido para a tela de login.
const NAVY = "#0F2A48";
const ORANGE = "#E8813A";
const SAGE = "#5FA37A";
const TEXT_FAINT = "#8FA0B5";
const TEXT_MUTED = "#7C8AA0";
const FIELD_BG = "rgba(255,255,255,0.04)";
const FIELD_BORDER = "rgba(255,255,255,0.16)";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result =
      mode === "signup"
        ? await signup({ name, email, password })
        : await login({ email, password });

    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-dvh flex items-center justify-center px-5 py-10 relative overflow-hidden" style={{ background: NAVY }}>
      {/* Ondas decorativas de fundo — a verde é a onda laranja espelhada (rotação de 180°),
          para as duas lerem como um par simétrico, não elementos soltos. */}
      <svg className="absolute top-0 left-0 w-28 h-52 opacity-50 pointer-events-none" viewBox="0 0 100 200" fill="none">
        <path d="M65 0 C30 35, 80 70, 40 105 C0 135, 45 170, 30 200" stroke={ORANGE} strokeWidth="1.4" fill="none" />
        <path d="M14 22 l6 -6 M20 16 l6 6 M20 28 l-6 -6" stroke={ORANGE} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </svg>
      <svg className="absolute bottom-0 right-0 w-28 h-52 opacity-50 pointer-events-none" viewBox="0 0 100 200" fill="none">
        <g transform="rotate(180 50 100)">
          <path d="M65 0 C30 35, 80 70, 40 105 C0 135, 45 170, 30 200" stroke={SAGE} strokeWidth="1.4" fill="none" />
          <path d="M14 22 l6 -6 M20 16 l6 6 M20 28 l-6 -6" stroke={SAGE} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </g>
      </svg>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo e marca */}
        <div className="flex flex-col items-center mb-10">
          <Logo size="md" dark />
        </div>

        {/* Título */}
        <div className="text-center mb-10">
          <h1 className="text-xl font-bold text-white leading-relaxed">
            Seu ritmo. Sua jornada.
            <br />
            <span style={{ color: ORANGE }}>Nossa orientação.</span>
          </h1>
          <p className="text-sm mt-3.5 leading-relaxed" style={{ color: TEXT_FAINT }}>
            Organize sua rotina com mais
            <br />
            clareza, foco e equilíbrio.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === "signup" && (
            <div className="flex items-center gap-3 rounded-2xl px-5 h-14" style={{ background: FIELD_BG, border: `1px solid ${FIELD_BORDER}` }}>
              <span style={{ color: "#B8C4D2" }}>👤</span>
              <input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Seu nome"
                className="flex-1 bg-transparent outline-none text-white text-sm placeholder:text-[#8FA0B5]"
              />
            </div>
          )}

          <div className="flex items-center gap-3 rounded-2xl px-5 h-14" style={{ background: FIELD_BG, border: `1px solid ${FIELD_BORDER}` }}>
            <span style={{ color: "#B8C4D2" }}>✉</span>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="E-mail"
              className="flex-1 bg-transparent outline-none text-white text-sm placeholder:text-[#8FA0B5]"
            />
          </div>

          <div className="flex items-center gap-3 rounded-2xl px-5 h-14" style={{ background: FIELD_BG, border: `1px solid ${FIELD_BORDER}` }}>
            <span style={{ color: "#B8C4D2" }}>🔒</span>
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Senha"
              className="flex-1 bg-transparent outline-none text-white text-sm placeholder:text-[#8FA0B5]"
            />
            <button type="button" onClick={() => setShowPassword(v => !v)} style={{ color: "#B8C4D2" }} aria-label="Mostrar senha">
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>

          {mode === "login" && (
            <button
              type="button"
              onClick={() => toast.info("Em breve! Por enquanto, fale com o suporte para redefinir sua senha.")}
              className="w-full text-right text-xs font-medium"
              style={{ color: ORANGE }}
            >
              Esqueci minha senha
            </button>
          )}

          {error && (
            <div className="px-5 py-3.5 rounded-xl text-sm" style={{ background: "rgba(231,76,60,0.12)", border: "1px solid rgba(231,76,60,0.3)", color: "#F5B7B1" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-semibold py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: ORANGE }}
          >
            {loading ? "Aguarde..." : mode === "signup" ? "Criar conta" : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm mt-7" style={{ color: "#C7D0DA" }}>
          {mode === "signup" ? "Já tem conta? " : "Ainda não possui conta? "}
          <button
            type="button"
            onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(null); }}
            className="font-semibold"
            style={{ color: ORANGE }}
          >
            {mode === "signup" ? "Entrar" : "Criar conta"}
          </button>
        </p>

        {/* Rodapé legal */}
        <div className="mt-12 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
          <p className="text-center text-[11.5px] leading-relaxed" style={{ color: TEXT_MUTED }}>
            Ao continuar, você concorda com nossos
            <br />
            <button type="button" onClick={() => setLocation("/termos")} className="font-medium" style={{ color: SAGE }}>
              Termos de Uso
            </button>{" "}
            e{" "}
            <button type="button" onClick={() => setLocation("/termos")} className="font-medium" style={{ color: ORANGE }}>
              Política de Privacidade
            </button>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
