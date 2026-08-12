import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(d: string | Date) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
    " " + new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: users, isLoading } = trpc.admin.listUsers.useQuery(undefined, { enabled: isAdmin });

  return (
    <div className="screen-container">
      <AppHeader />

      <div className="px-5 mb-5">
        <button onClick={() => setLocation("/perfil")} className="text-sm text-muted mb-3">
          ‹ Voltar
        </button>
        <h2 className="text-2xl font-light text-secondary">👥 Usuárias</h2>
        <p className="text-sm text-muted mt-1">
          {isAdmin ? (users ? `${users.length} cadastro${users.length === 1 ? "" : "s"}` : "Carregando...") : "Acesso restrito."}
        </p>
      </div>

      {isAdmin && (
        <div className="px-5 space-y-3 pb-6">
          {isLoading && <p className="text-sm text-muted">Carregando...</p>}

          {users?.map(u => (
            <div key={u.id} className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-semibold text-foreground">{u.name || "(sem nome)"}</p>
                {u.role === "admin" && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent flex-shrink-0">
                    admin
                  </span>
                )}
              </div>
              <p className="text-xs text-muted mb-2">{u.email}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted mb-2.5">
                <span>Cadastro: {formatDate(u.createdAt)}</span>
                <span>Último acesso: {formatDateTime(u.lastSignedIn)}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-[11px] font-medium px-2 py-1 rounded-lg bg-background text-foreground">
                  📋 {u.taskCount} tarefa{u.taskCount === 1 ? "" : "s"}
                </span>
                <span className="text-[11px] font-medium px-2 py-1 rounded-lg bg-background text-foreground">
                  ✅ {u.completedCount} concluída{u.completedCount === 1 ? "" : "s"}
                </span>
                <span className="text-[11px] font-medium px-2 py-1 rounded-lg bg-background text-foreground">
                  ☀️ {u.checkinCount} check-up{u.checkinCount === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          ))}

          {users && users.length === 0 && <p className="text-sm text-muted">Nenhum cadastro ainda.</p>}
        </div>
      )}
    </div>
  );
}
