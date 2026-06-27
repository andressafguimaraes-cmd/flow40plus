import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { LinkIcon, CheckCircle, AlertCircle, LogOut } from "lucide-react";
import { toast } from "sonner";

interface GoogleCalendarSyncProps {
  onSyncComplete?: () => void;
}

export function GoogleCalendarSync({ onSyncComplete }: GoogleCalendarSyncProps) {
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");
  const [showInstructions, setShowInstructions] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [authUrl, setAuthUrl] = useState<string>("");

  // Get Google auth URL
  const getAuthUrlMutation = trpc.googleCalendar.getAuthUrl.useQuery();

  // Exchange authorization code
  const exchangeCodeMutation = trpc.googleCalendar.exchangeCode.useMutation({
    onSuccess: () => {
      toast.success("Google Calendar conectado com sucesso!");
      setIsConnected(true);
      setSyncStatus("synced");
      onSyncComplete?.();
      setTimeout(() => setSyncStatus("idle"), 3000);
    },
    onError: (error) => {
      toast.error("Erro ao conectar com Google Calendar");
      setSyncStatus("error");
      setTimeout(() => setSyncStatus("idle"), 3000);
    },
  });

  // Disconnect from Google Calendar
  const disconnectMutation = trpc.googleCalendar.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Google Calendar desconectado");
      setIsConnected(false);
      setSyncStatus("idle");
    },
    onError: () => {
      toast.error("Erro ao desconectar");
    },
  });

  // Get auth URL on mount
  useEffect(() => {
    if (getAuthUrlMutation.data?.url) {
      setAuthUrl(getAuthUrlMutation.data.url);
    }
  }, [getAuthUrlMutation.data]);

  // Listen for authorization code from callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      setSyncStatus("syncing");
      exchangeCodeMutation.mutate({ code });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleGoogleAuth = () => {
    if (!authUrl) {
      toast.error("Falha ao obter URL de autenticação");
      return;
    }

    setSyncStatus("syncing");
    // Open Google auth in a new window
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    window.open(
      authUrl,
      "Google Calendar Auth",
      `width=${width},height=${height},left=${left},top=${top}`
    );
  };

  const handleDisconnect = () => {
    if (confirm("Tem certeza que deseja desconectar do Google Calendar?")) {
      disconnectMutation.mutate();
    }
  };

  return (
    <div className="space-y-4">
      {/* Status */}
      {isConnected ? (
        <div className="bg-[#E8F5EE] border-2 border-[#A8D5B8] rounded-2xl p-4 flex items-start gap-3">
          <CheckCircle className="text-[#2E8B57] flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="font-bold text-[#2E8B57]">Conectado ao Google Calendar</p>
            <p className="text-sm text-[#2E8B57] mt-1">Suas tarefas estão sendo sincronizadas automaticamente</p>
            <button
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
              className="text-xs font-bold text-[#2E8B57] underline mt-2 hover:no-underline disabled:opacity-50"
            >
              Desconectar
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Botão de conexão */}
          <button
            onClick={handleGoogleAuth}
            disabled={syncStatus === "syncing" || !authUrl}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#4285F4] to-[#34A853] text-white rounded-2xl p-4 font-bold text-sm hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <LinkIcon size={18} />
            {syncStatus === "syncing" ? "Conectando..." : "Conectar Google Calendar"}
          </button>

          {/* Instruções */}
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="w-full text-center text-xs font-bold text-[#8E8E93] hover:text-[#E67E22] transition-colors"
          >
            {showInstructions ? "Ocultar instruções" : "Ver instruções"}
          </button>

          {showInstructions && (
            <div className="bg-[#FEF9E7] border-2 border-[#F7DC6F] rounded-2xl p-4">
              <p className="text-sm font-bold text-[#D4AC0D] mb-3">📋 Como sincronizar:</p>
              <ol className="text-xs text-[#8B6914] space-y-2 list-decimal list-inside">
                <li>Clique no botão acima para conectar sua conta Google</li>
                <li>Autorize o Flow 40+ a acessar seu Google Calendar</li>
                <li>Suas tarefas serão exportadas automaticamente</li>
                <li>Atualizações futuras sincronizarão em tempo real</li>
              </ol>
              <p className="text-xs text-[#8B6914] mt-3 font-semibold">
                💡 Dica: Você pode criar um calendário separado no Google Calendar para tarefas do Flow 40+
              </p>
            </div>
          )}

          {/* Status de erro */}
          {syncStatus === "error" && (
            <div className="bg-[#FDECEA] border-2 border-[#FBBDBA] rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="text-[#E74C3C] flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-bold text-[#E74C3C]">Erro na conexão</p>
                <p className="text-sm text-[#E74C3C] mt-1">Tente novamente ou verifique suas permissões</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Informações de privacidade */}
      <div className="bg-white border-2 border-[#E8DFD0] rounded-2xl p-4">
        <p className="text-xs font-bold text-[#8E8E93] mb-2">🔒 PRIVACIDADE</p>
        <p className="text-xs text-[#8E8E93]">
          Seus dados são sincronizados de forma segura. O Flow 40+ nunca armazena seus dados do Google Calendar em seus servidores.
        </p>
      </div>
    </div>
  );
}
