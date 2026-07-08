import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import AppHeader from "@/components/AppHeader";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { REMINDERS, getReminderSettings, saveReminderSettings } from "@/lib/reminderSettings";

const GRATITUDE_VAULT = [
  { date: "07 de julho de 2026", text: "Hoje sou grata por ter conseguido dormir uma noite inteira sem acordar preocupada com nada." },
  { date: "05 de julho de 2026", text: "Grata pela ligação da minha filha só para saber como eu estava — pequenos gestos que enchem o coração." },
  { date: "03 de julho de 2026", text: "Por ter tido coragem de dizer não a um compromisso que só ia me cansar. Me colocar em primeiro lugar, enfim." },
  { date: "01 de julho de 2026", text: "Grata pelo sol da manhã na varanda com meu café, sem pressa nenhuma." },
];

export default function Perfil() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data: checkInTotal } = trpc.checkIns.getTotalCount.useQuery();
  const { data: userTasks } = trpc.tasks.list.useQuery();

  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [pauseAlerts, setPauseAlerts] = useState(getReminderSettings);
  const [checkInAlert, setCheckInAlert] = useState({ enabled: true, time: "07:30" });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setEmail(user.email ?? "");
    }
  }, [user]);

  const completedTasksCount = userTasks?.filter(t => t.status === "completed").length;
  const plannedTasksCount = userTasks?.length;

  const STATS = [
    { label: "Check-ups", value: checkInTotal !== undefined ? String(checkInTotal.count) : "—", icon: "☀️" },
    { label: "Decisões", value: completedTasksCount !== undefined ? String(completedTasksCount) : "—", icon: "✅" },
    { label: "Planejados", value: plannedTasksCount !== undefined ? String(plannedTasksCount) : "—", icon: "📆" },
  ];

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const RHYTHM_SETTINGS = [
    { icon: "✏️", label: "Editar Perfil", detail: undefined as string | undefined, action: () => setEditingProfile(true) },
    { icon: "🔔", label: "Lembrete do Check-up", detail: checkInAlert.time, action: () => setShowNotifications(true) },
  ];

  const OTHER_SETTINGS = [
    { icon: "❓", label: "Ajuda e FAQ", action: () => setLocation("/ajuda"), danger: false },
    { icon: "📄", label: "Termos de Uso e Privacidade", action: () => setLocation("/termos"), danger: false },
    { icon: "⭐", label: "Avaliar o app", action: () => toast.success("Obrigada pelo seu feedback! 💛"), danger: false },
    { icon: "🚪", label: "Sair", action: () => { logout(); toast.info("Sessão encerrada"); }, danger: true },
  ];

  return (
    <div className="screen-container">
      <AppHeader />

      {/* Avatar */}
      <div className="flex flex-col items-center px-5 mb-6">
        <div className="relative mb-3">
          <div className="w-20 h-20 rounded-full border-4 border-accent overflow-hidden bg-card flex items-center justify-center">
            {photo ? <img src={photo} className="w-full h-full object-cover" /> : <span className="text-3xl">👩🏽</span>}
          </div>
          <button onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-accent text-white text-xs flex items-center justify-center border-2 border-white">
            ✏️
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </div>
        <h2 className="text-lg font-black text-foreground">{name}</h2>
        <p className="text-xs text-muted">{email}</p>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-3 px-5 mb-6">
        {STATS.map(s => (
          <div key={s.label} className="bg-card rounded-2xl border border-border p-3 text-center">
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="text-xl font-black text-accent">{s.value}</div>
            <div className="text-[10px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Espaço Emocional */}
      <p className="section-title">Espaço Emocional</p>
      <div className="mx-5 mb-6">
        <button onClick={() => setIsVaultOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-accent text-accent text-sm font-semibold transition-all hover:bg-accent/5">
          ✨ Meu Baú de Gratidão
        </button>
      </div>

      {/* Configurações de Ritmo */}
      <p className="section-title">Configurações de Ritmo</p>
      <div className="mx-5 bg-card rounded-2xl border border-border overflow-hidden mb-3">
        {RHYTHM_SETTINGS.map((s, i) => (
          <button key={s.label} onClick={s.action}
            className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all hover:bg-background ${i > 0 ? "border-t border-border" : ""}`}>
            <span className="text-lg w-7 text-center">{s.icon}</span>
            <span className="flex-1 text-sm font-semibold text-foreground">{s.label}</span>
            {s.detail && <span className="text-xs text-muted">{s.detail}</span>}
            <span className="text-muted text-sm">›</span>
          </button>
        ))}
        <div className="w-full flex items-center gap-3 px-4 py-3.5 border-t border-border">
          <span className="text-lg w-7 text-center">🌙</span>
          <span className="flex-1 text-sm font-semibold text-foreground">Tema Escuro</span>
          <Switch checked={theme === "dark"} onCheckedChange={() => toggleTheme?.()} />
        </div>
      </div>

      <div className="mx-5 bg-card rounded-2xl border border-border overflow-hidden mb-6">
        {OTHER_SETTINGS.map((s, i) => (
          <button key={s.label} onClick={s.action}
            className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all hover:bg-background ${i > 0 ? "border-t border-border" : ""}`}>
            <span className="text-lg w-7 text-center">{s.icon}</span>
            <span className={`flex-1 text-sm font-semibold ${s.danger ? "text-red-500" : "text-foreground"}`}>{s.label}</span>
            <span className="text-muted text-sm">›</span>
          </button>
        ))}
      </div>

      {/* Modal: Meu Baú de Gratidão */}
      {isVaultOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-md bg-background rounded-t-3xl p-5 max-h-[75vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
            <h3 className="text-base font-black text-foreground mb-1">✨ Meu Baú de Gratidão</h3>
            <p className="text-xs text-muted mb-4">Momentos que você registrou nos seus check-ups</p>
            <div className="space-y-3">
              {GRATITUDE_VAULT.map((entry, i) => (
                <div key={i} className="bg-card rounded-2xl border border-border p-4">
                  <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1.5">{entry.date}</p>
                  <p className="text-sm text-foreground leading-relaxed italic">"{entry.text}"</p>
                </div>
              ))}
            </div>
            <button onClick={() => setIsVaultOpen(false)}
              className="w-full h-11 rounded-2xl border border-border text-sm font-bold text-muted mt-4">
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal: Editar perfil */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-md bg-background rounded-t-3xl p-5">
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
            <h3 className="text-base font-black text-foreground mb-4">Editar Perfil</h3>
            <div className="space-y-3">
              {[
                { label: "Nome", value: name, set: setName },
                { label: "E-mail", value: email, set: setEmail },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-xs font-bold text-muted mb-1 block">{f.label}</label>
                  <input value={f.value} onChange={e => f.set(e.target.value)}
                    className="w-full text-sm bg-card border border-border rounded-xl px-3 py-2.5 outline-none focus:border-accent" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setEditingProfile(false)} className="flex-1 h-11 rounded-2xl border border-border text-sm font-bold text-muted">Cancelar</button>
              <button onClick={() => { setEditingProfile(false); toast.success("Perfil atualizado!"); }}
                className="flex-1 h-11 rounded-2xl bg-accent text-white text-sm font-bold">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Lembrete do Check-up */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-md bg-background rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
            <h3 className="text-base font-black text-foreground mb-4">Lembrete do Check-up</h3>

            {/* Check-in matinal */}
            <div className="mb-4">
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Check-up Matinal</p>
              <div className="bg-card rounded-2xl border border-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-foreground">☀️ Alerta matinal</span>
                  <div className={`w-10 h-6 rounded-full cursor-pointer transition-all ${checkInAlert.enabled ? "bg-accent" : "bg-border"}`}
                       onClick={() => setCheckInAlert(a => ({ ...a, enabled: !a.enabled }))}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow m-0.5 transition-all ${checkInAlert.enabled ? "translate-x-4" : ""}`} />
                  </div>
                </div>
                <input type="time" value={checkInAlert.time}
                  onChange={e => setCheckInAlert(a => ({ ...a, time: e.target.value }))}
                  className="text-sm border border-border rounded-lg px-2 py-1 bg-background outline-none focus:border-accent" />
              </div>
            </div>

            {/* Pausas de recuperação */}
            <div className="mb-4">
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Pausas de Recuperação</p>
              <div className="space-y-2">
                {REMINDERS.map(a => (
                  <div key={a.id} className="bg-card rounded-2xl border border-border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-foreground">{a.icon} {a.label}</span>
                      <div className={`w-10 h-6 rounded-full cursor-pointer transition-all ${pauseAlerts[a.id].enabled ? "bg-accent" : "bg-border"}`}
                           onClick={() => setPauseAlerts(prev => ({ ...prev, [a.id]: { ...prev[a.id], enabled: !prev[a.id].enabled } }))}>
                        <div className={`w-5 h-5 rounded-full bg-white shadow m-0.5 transition-all ${pauseAlerts[a.id].enabled ? "translate-x-4" : ""}`} />
                      </div>
                    </div>
                    <input type="time" value={pauseAlerts[a.id].time}
                      onChange={e => setPauseAlerts(prev => ({ ...prev, [a.id]: { ...prev[a.id], time: e.target.value } }))}
                      className="text-sm border border-border rounded-lg px-2 py-1 bg-background outline-none focus:border-accent" />
                    <p className="text-[10px] text-muted mt-1">{a.message}</p>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => { saveReminderSettings(pauseAlerts); setShowNotifications(false); toast.success("Alertas salvos!"); }}
              className="w-full h-11 rounded-2xl bg-accent text-white text-sm font-bold">
              Salvar alertas
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
