import { useEffect, useState } from "react";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // Encode the redirect URI to return to dashboard after login
      const redirectUri = `${window.location.origin}/`;
      const encodedRedirectUri = btoa(redirectUri);

      // Redirect to Manus OAuth login
      const oauthUrl = `/api/oauth/login?redirect_uri=${encodedRedirectUri}`;
      window.location.href = oauthUrl;
    } catch (err) {
      setError("Erro ao iniciar login. Tente novamente.");
      setLoading(false);
    }
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
            Bem-vinda ao Flow 40+
          </h2>
          <p className="text-gray-600 mb-8">
            Organize seu dia com clareza e foco. Comece seu check-up matinal agora.
          </p>

          {/* Benefits */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="text-[#E67E22] text-xl mt-1">✓</div>
              <div>
                <p className="font-semibold text-[#003366]">Check-up Matinal</p>
                <p className="text-sm text-gray-600">
                  Comece o dia com clareza sobre seu estado
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-[#2E8B57] text-xl mt-1">✓</div>
              <div>
                <p className="font-semibold text-[#003366]">Tarefas Inteligentes</p>
                <p className="text-sm text-gray-600">
                  IA decompõe suas tarefas em micro-passos
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-[#003366] text-xl mt-1">✓</div>
              <div>
                <p className="font-semibold text-[#003366]">Micro-Práticas</p>
                <p className="text-sm text-gray-600">
                  Pausas de recuperação ao longo do dia
                </p>
              </div>
            </div>
          </div>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#E67E22] to-[#D65A0F] text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {loading ? "Conectando..." : "Entrar com Manus"}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-gray-500 mt-6">
            Ao fazer login, você concorda com nossos Termos de Serviço
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
