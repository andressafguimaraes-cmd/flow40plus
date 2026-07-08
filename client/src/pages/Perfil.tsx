import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { REMINDERS, getReminderSettings, saveReminderSettings } from "@/lib/reminderSettings";

// Paleta específica desta tela (mockup fornecido)
const NAVY = "#16365A";
const SAGE = "#5FA37A";
const BG_APP = "#EEF3EC";
const TEXT_MUTED = "#8C948C";
const LINE = "#E7E5DE";
const ORANGE = "#E8813A";
const RED_TEXT = "#B85C5C";
const AVATAR_BG = "#D5DFD8";

const MONTH_NAMES_CAP = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function vaultDateLabel(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const label = `${d.getDate()} de ${MONTH_NAMES_CAP[d.getMonth()]} de ${d.getFullYear()}`;
  if (daysAgo === 0) return `Hoje, ${label}`;
  if (daysAgo === 1) return `Ontem, ${label}`;
  return label;
}

const GRATITUDE_VAULT = [
  { daysAgo: 0, text: "Grata pelo café quentinho e pelo abraço apertado do meu filho antes de sair de casa." },
  { daysAgo: 1, text: "Pela paciência e calma que encontrei para resolver aquele problema complexo com o cliente." },
  { daysAgo: 2, text: "Por conseguir tirar 15 minutos de silêncio para respirar no meio de uma tarde super corrida." },
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
  const [checkInAlert, setCheckInAlert] = useState({ enabled: true, time: "08:00" });
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

  const EMOTIONAL_SETTINGS = [
    { icon: "✨", label: "Meu Baú de Gratidão", detail: undefined as string | undefined, action: () => setIsVaultOpen(true) },
  ];

  const RHYTHM_SETTINGS = [
    { icon: "👤", label: "Editar perfil", detail: undefined as string | undefined, action: () => setEditingProfile(true) },
    { icon: "🔔", label: "Lembrete do Check-up", detail: checkInAlert.time, action: () => setShowNotifications(true) },
  ];

  const APP_SETTINGS = [
    { icon: "❓", label: "Ajuda e FAQ", action: () => setLocation("/ajuda") },
    { icon: "📄", label: "Termos de Uso e Privacidade", action: () => setLocation("/termos") },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ background: BG_APP }}>
      <div className="px-5 pt-6">
        {/* Cabeçalho do perfil */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3" style={{ width: 84, height: 84 }}>
            <div
              className="w-full h-full rounded-full overflow-hidden flex items-center justify-center text-[32px]"
              style={{ background: AVATAR_BG, border: "2px solid #FFFFFF", boxShadow: "0 2px 8px rgba(22,54,90,0.06)" }}
            >
              {photo ? <img src={photo} className="w-full h-full object-cover" /> : "👩🏽"}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 rounded-full text-white text-[11px] flex items-center justify-center"
              style={{ width: 26, height: 26, background: NAVY, border: "2px solid #FFFFFF" }}
            >
              ✏️
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>
          <h2 className="text-lg font-bold" style={{ color: NAVY }}>{name}</h2>
          <p className="text-xs font-medium" style={{ color: TEXT_MUTED }}>{email}</p>
        </div>

        {/* Stats de engajamento */}
        <div className="flex gap-2.5 mb-6">
          {STATS.map(s => (
            <div key={s.label} className="flex-1 bg-white rounded-2xl py-3 px-2 text-center" style={{ boxShadow: "0 2px 8px rgba(22,54,90,0.03)" }}>
              <div className="text-base mb-1">{s.icon}</div>
              <div className="text-xl font-bold mb-0.5" style={{ color: ORANGE }}>{s.value}</div>
              <div className="text-[10.5px] font-semibold" style={{ color: TEXT_MUTED }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Espaço Emocional */}
        <div className="mb-5">
          <p className="text-[11.5px] font-bold uppercase mb-2" style={{ color: TEXT_MUTED, letterSpacing: "0.5px" }}>Espaço Emocional</p>
          <div className="bg-white rounded-[18px] overflow-hidden" style={{ boxShadow: "0 2px 10px rgba(22,54,90,0.03)" }}>
            {EMOTIONAL_SETTINGS.map(s => (
              <button key={s.label} onClick={s.action} className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left">
                <span className="text-base w-5 text-center" style={{ color: NAVY }}>{s.icon}</span>
                <span className="flex-1 text-[13.5px] font-semibold" style={{ color: NAVY }}>{s.label}</span>
                <span className="text-xs" style={{ color: "#C4CBC4" }}>›</span>
              </button>
            ))}
          </div>
        </div>

        {/* Configurações de Ritmo */}
        <div className="mb-5">
          <p className="text-[11.5px] font-bold uppercase mb-2" style={{ color: TEXT_MUTED, letterSpacing: "0.5px" }}>Configurações de Ritmo</p>
          <div className="bg-white rounded-[18px] overflow-hidden" style={{ boxShadow: "0 2px 10px rgba(22,54,90,0.03)" }}>
            {RHYTHM_SETTINGS.map((s, i) => (
              <button key={s.label} onClick={s.action}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left"
                style={i > 0 ? { borderTop: `1px solid ${LINE}` } : undefined}>
                <span className="text-base w-5 text-center" style={{ color: NAVY }}>{s.icon}</span>
                <span className="flex-1 text-[13.5px] font-semibold" style={{ color: NAVY }}>{s.label}</span>
                {s.detail && <span className="text-[11.5px] font-semibold mr-1" style={{ color: TEXT_MUTED }}>{s.detail}</span>}
                <span className="text-xs" style={{ color: "#C4CBC4" }}>›</span>
              </button>
            ))}
            <div className="w-full flex items-center gap-3.5 px-4 py-3.5" style={{ borderTop: `1px solid ${LINE}` }}>
              <span className="text-base w-5 text-center" style={{ color: NAVY }}>🌙</span>
              <span className="flex-1 text-[13.5px] font-semibold" style={{ color: NAVY }}>Tema escuro</span>
              <Switch checked={theme === "dark"} onCheckedChange={() => toggleTheme?.()} />
            </div>
          </div>
        </div>

        {/* Aplicativo */}
        <div className="mb-5">
          <p className="text-[11.5px] font-bold uppercase mb-2" style={{ color: TEXT_MUTED, letterSpacing: "0.5px" }}>Aplicativo</p>
          <div className="bg-white rounded-[18px] overflow-hidden" style={{ boxShadow: "0 2px 10px rgba(22,54,90,0.03)" }}>
            {APP_SETTINGS.map((s, i) => (
              <button key={s.label} onClick={s.action}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left"
                style={i > 0 ? { borderTop: `1px solid ${LINE}` } : undefined}>
                <span className="text-base w-5 text-center" style={{ color: NAVY }}>{s.icon}</span>
                <span className="flex-1 text-[13.5px] font-semibold" style={{ color: NAVY }}>{s.label}</span>
                <span className="text-xs" style={{ color: "#C4CBC4" }}>›</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sair */}
        <div className="mb-4">
          <div className="bg-white rounded-[18px] overflow-hidden" style={{ boxShadow: "0 2px 10px rgba(22,54,90,0.03)" }}>
            <button
              onClick={() => { logout(); toast.info("Sessão encerrada"); }}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left"
            >
              <span className="text-base w-5 text-center" style={{ color: RED_TEXT }}>🚪</span>
              <span className="flex-1 text-[13.5px] font-semibold" style={{ color: RED_TEXT }}>Sair</span>
              <span className="text-xs" style={{ color: "#C4CBC4" }}>›</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Meu Baú de Gratidão */}
      {isVaultOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(22,54,90,0.4)" }}>
          <div className="w-full max-w-md rounded-t-[32px] p-6 max-h-[75vh] flex flex-col" style={{ background: BG_APP }}>
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <span className="text-base font-bold" style={{ color: NAVY }}>✨ Meu Baú de Gratidão</span>
              <button
                onClick={() => setIsVaultOpen(false)}
                className="rounded-full bg-white flex items-center justify-center text-sm"
                style={{ width: 30, height: 30, border: `1px solid ${LINE}`, color: NAVY }}
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-2">
              {GRATITUDE_VAULT.map((entry, i) => (
                <div key={i} className="bg-white rounded-2xl p-3.5" style={{ boxShadow: "0 2px 6px rgba(22,54,90,0.02)" }}>
                  <p className="text-[11px] font-semibold mb-1.5" style={{ color: TEXT_MUTED }}>{vaultDateLabel(entry.daysAgo)}</p>
                  <p className="text-[13px] italic leading-relaxed" style={{ color: NAVY }}>"{entry.text}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar perfil */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(22,54,90,0.4)" }}>
          <div className="w-full max-w-md rounded-t-3xl p-5" style={{ background: BG_APP }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: LINE }} />
            <h3 className="text-base font-bold mb-4" style={{ color: NAVY }}>Editar Perfil</h3>
            <div className="space-y-3">
              {[
                { label: "Nome", value: name, set: setName },
                { label: "E-mail", value: email, set: setEmail },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-xs font-bold mb-1 block" style={{ color: TEXT_MUTED }}>{f.label}</label>
                  <input value={f.value} onChange={e => f.set(e.target.value)}
                    className="w-full text-sm bg-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ border: `1px solid ${LINE}`, color: NAVY }} />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setEditingProfile(false)} className="flex-1 h-11 rounded-2xl text-sm font-bold"
                style={{ border: `1px solid ${LINE}`, color: TEXT_MUTED }}>Cancelar</button>
              <button onClick={() => { setEditingProfile(false); toast.success("Perfil atualizado!"); }}
                className="flex-1 h-11 rounded-2xl text-white text-sm font-bold" style={{ background: SAGE }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Lembrete do Check-up */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(22,54,90,0.4)" }}>
          <div className="w-full max-w-md rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto" style={{ background: BG_APP }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: LINE }} />
            <h3 className="text-base font-bold mb-4" style={{ color: NAVY }}>Lembrete do Check-up</h3>

            {/* Check-in matinal */}
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: TEXT_MUTED }}>Check-up Matinal</p>
              <div className="bg-white rounded-2xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold" style={{ color: NAVY }}>☀️ Alerta matinal</span>
                  <div className="w-10 h-6 rounded-full cursor-pointer transition-all"
                       style={{ background: checkInAlert.enabled ? SAGE : LINE }}
                       onClick={() => setCheckInAlert(a => ({ ...a, enabled: !a.enabled }))}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow m-0.5 transition-all ${checkInAlert.enabled ? "translate-x-4" : ""}`} />
                  </div>
                </div>
                <input type="time" value={checkInAlert.time}
                  onChange={e => setCheckInAlert(a => ({ ...a, time: e.target.value }))}
                  className="text-sm rounded-lg px-2 py-1 bg-white outline-none"
                  style={{ border: `1px solid ${LINE}`, color: NAVY }} />
              </div>
            </div>

            {/* Pausas de recuperação */}
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: TEXT_MUTED }}>Pausas de Recuperação</p>
              <div className="space-y-2">
                {REMINDERS.map(a => (
                  <div key={a.id} className="bg-white rounded-2xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold" style={{ color: NAVY }}>{a.icon} {a.label}</span>
                      <div className="w-10 h-6 rounded-full cursor-pointer transition-all"
                           style={{ background: pauseAlerts[a.id].enabled ? SAGE : LINE }}
                           onClick={() => setPauseAlerts(prev => ({ ...prev, [a.id]: { ...prev[a.id], enabled: !prev[a.id].enabled } }))}>
                        <div className={`w-5 h-5 rounded-full bg-white shadow m-0.5 transition-all ${pauseAlerts[a.id].enabled ? "translate-x-4" : ""}`} />
                      </div>
                    </div>
                    <input type="time" value={pauseAlerts[a.id].time}
                      onChange={e => setPauseAlerts(prev => ({ ...prev, [a.id]: { ...prev[a.id], time: e.target.value } }))}
                      className="text-sm rounded-lg px-2 py-1 bg-white outline-none"
                      style={{ border: `1px solid ${LINE}`, color: NAVY }} />
                    <p className="text-[10px] mt-1" style={{ color: TEXT_MUTED }}>{a.message}</p>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => { saveReminderSettings(pauseAlerts); setShowNotifications(false); toast.success("Alertas salvos!"); }}
              className="w-full h-11 rounded-2xl text-white text-sm font-bold" style={{ background: SAGE }}>
              Salvar alertas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
