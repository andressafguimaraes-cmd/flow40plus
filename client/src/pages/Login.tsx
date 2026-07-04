import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
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
    <div className="min-h-screen bg-gradient-to-br from-[#003366] via-[#003366] to-[#2E8B57] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Brand */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <svg
              className="w-20 h-20 mx-auto"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 50 Q 50 20, 80 50"
                stroke="#E67E22"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M30 60 Q 50 40, 70 60"
                stroke="#2E8B57"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Flow 40+</h1>
          <p className="text-[#FDF5E6] text-lg">
            Mova. Nutra. Floresça. Flua.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#FDF5E6] rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-[#003366] mb-2">
            {mode === "signup" ? "Crie sua conta" : "Bem-vinda de volta"}
          </h2>
          <p className="text-gray-600 mb-8">
            Organize seu dia com clareza e foco. Comece seu check-up matinal agora.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 mb-4">
            {mode === "signup" && (
              <div>
                <label className="block text-sm font-semibold text-[#003366] mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                  placeholder="Seu nome"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-[#003366] mb-1">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#003366] mb-1">Senha</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#E67E22] to-[#D65A0F] text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="w-full text-center text-sm text-[#003366] font-semibold hover:underline"
          >
            {mode === "signup"
              ? "Já tem conta? Entrar"
              : "Ainda não tem conta? Cadastre-se"}
          </button>

          {/* Footer */}
          <p className="text-center text-xs text-gray-500 mt-6">
            Ao continuar, você concorda com nossos Termos de Serviço
          </p>
        </div>

        {/* Quote */}
        <div className="mt-12 text-center">
          <p className="text-[#FDF5E6] italic text-sm">
            "Pequenas pausas ao longo do dia podem aumentar sua produtividade e bem-estar."
          </p>
        </div>
      </div>
    </div>
  );
}
