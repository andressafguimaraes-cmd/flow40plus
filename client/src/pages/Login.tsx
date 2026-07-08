import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo e marca */}
        <div className="mb-14">
          <Logo size="lg" />
        </div>

        {/* Cartão de autenticação */}
        <div className="bg-card rounded-3xl border border-border shadow-sm p-10">
          <h2 className="text-2xl font-light text-secondary mb-2 leading-snug">
            {mode === "signup" ? "Vamos começar com calma" : "Bom ter você aqui"}
          </h2>
          <p className="text-muted text-sm mb-8 leading-relaxed">
            {mode === "signup"
              ? "Este é um espaço seguro, sem cobranças, para você organizar sua rotina no seu próprio ritmo."
              : "Vamos pausar e planejar com calma?"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 mb-5">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1.5">Nome</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none transition-colors focus:border-accent"
                  placeholder="Seu nome"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none transition-colors focus:border-accent"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">Senha</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none transition-colors focus:border-accent"
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-secondary text-white font-semibold py-3.5 rounded-xl transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Aguarde..."
                : mode === "signup"
                  ? "Criar conta"
                  : "Entrar"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setError(null);
            }}
            className="w-full text-center text-sm text-accent font-semibold hover:underline"
          >
            {mode === "signup"
              ? "Já tem conta? Entrar"
              : "Ainda não tem conta? Cadastre-se"}
          </button>

          {/* Rodapé */}
          <p className="text-center text-xs text-muted mt-7">
            Ao continuar, você concorda com nossos{" "}
            <button type="button" onClick={() => setLocation("/termos")} className="text-accent font-semibold hover:underline">
              Termos de Uso e Privacidade
            </button>
          </p>
        </div>

        {/* Frase */}
        <div className="mt-10 text-center">
          <p className="text-muted italic text-sm">
            "Pequenas pausas ao longo do dia podem aumentar sua produtividade e bem-estar."
          </p>
        </div>
      </div>
    </div>
  );
}
