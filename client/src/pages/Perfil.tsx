import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { TIMED_REMINDERS, defaultNotificationSettings, type NotificationSettings } from "@shared/notificationSettings";
import { isPushSupported, requestPushSubscription, getExistingPushSubscription, removePushSubscription } from "@/lib/pushNotifications";

// Paleta específica desta tela (mockup fornecido)
const SAGE = "#5FA37A";
const ORANGE = "#E8813A";
const NAVY_FILL = "#16365A"; // fundo do botão de editar avatar — constante nos dois temas

const MONTH_NAMES_CAP = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const CHECKIN_REMINDER = TIMED_REMINDERS.find(r => r.id === "checkin")!;
const PAUSA_REMINDERS = TIMED_REMINDERS.filter(r => r.id.startsWith("pausa_"));
const TASK_REMINDERS = TIMED_REMINDERS.filter(r => r.id === "task_summary" || r.id === "recalibrate");

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function vaultDateLabel(date: Date): string {
  const today = new Date();
  const label = `${date.getDate()} de ${MONTH_NAMES_CAP[date.getMonth()]} de ${date.getFullYear()}`;
  if (dateKey(date) === dateKey(today)) return `Hoje, ${label}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey(date) === dateKey(yesterday)) return `Ontem, ${label}`;
  return label;
}

export default function Perfil() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const NAVY = isDark ? "#EDEFEA" : "#16365A";
  const BG_APP = isDark ? "#0F1A15" : "#EEF3EC";
  const CARD = isDark ? "#1B2A23" : "#FFFFFF";
  const TEXT_MUTED = isDark ? "#93A69B" : "#8C948C";
  const LINE = isDark ? "#2A3B33" : "#E7E5DE";
  const RED_TEXT = isDark ? "#E08787" : "#B85C5C";
  const AVATAR_BG = isDark ? "#22352C" : "#D5DFD8";
  const { data: checkInTotal } = trpc.checkIns.getTotalCount.useQuery();
  const { data: userTasks } = trpc.tasks.list.useQuery();
  const { data: checkInHistory } = trpc.checkIns.getHistory.useQuery();
  const { data: notificationSettings } = trpc.notifications.getSettings.useQuery();
  const { data: vapidPublicKey } = trpc.notifications.getVapidPublicKey.useQuery();
  const saveSettingsMutation = trpc.notifications.saveSettings.useMutation({ onSuccess: () => toast.success("Alertas salvos!") });
  const subscribeMutation = trpc.notifications.subscribe.useMutation();
  const unsubscribeMutation = trpc.notifications.unsubscribe.useMutation();
  const broadcastMutation = trpc.notifications.broadcast.useMutation();

  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [draft, setDraft] = useState<NotificationSettings>(defaultNotificationSettings());
  const [pushEnabled, setPushEnabled] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getExistingPushSubscription().then(sub => setPushEnabled(!!sub));
  }, []);

  const handleEnablePush = async () => {
    if (!vapidPublicKey) {
      toast.error("Não foi possível carregar a configuração de notificações. Tente de novo em instantes.");
      return;
    }
    setEnablingPush(true);
    try {
      const sub = await requestPushSubscription(vapidPublicKey);
      await subscribeMutation.mutateAsync(sub);
      setPushEnabled(true);
      toast.success("Notificações ativadas neste dispositivo!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ativar as notificações.");
    } finally {
      setEnablingPush(false);
    }
  };

  const handleDisablePush = async () => {
    const endpoint = await removePushSubscription();
    if (endpoint) await unsubscribeMutation.mutateAsync({ endpoint });
    setPushEnabled(false);
    toast.info("Notificações desativadas neste dispositivo.");
  };

  const updateReminder = (id: keyof NotificationSettings["reminders"], patch: Partial<{ enabled: boolean; time: string }>) =>
    setDraft(prev => ({ ...prev, reminders: { ...prev.reminders, [id]: { ...prev.reminders[id], ...patch } } }));

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return;
    try {
      const result = await broadcastMutation.mutateAsync({ title: broadcastTitle.trim(), body: broadcastBody.trim() });
      toast.success(`Aviso enviado para ${result.sent} de ${result.total} usuárias.`);
      setShowBroadcast(false);
      setBroadcastTitle("");
      setBroadcastBody("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar aviso.");
    }
  };

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setEmail(user.email ?? "");
      setPhoto(localStorage.getItem(`flow40_profile_photo_${user.id}`));
    }
  }, [user]);

  const completedTasksCount = userTasks?.filter(t => t.status === "completed").length;
  const plannedTasksCount = userTasks?.length;

  const gratitudeEntries = (checkInHistory ?? [])
    .filter(h => h.notes && h.notes.trim().length > 0)
    .map(h => ({ date: new Date(h.createdAt), text: h.notes as string }));

  const STATS = [
    { label: "Check-ups", value: checkInTotal !== undefined ? String(checkInTotal.count) : "—", icon: "☀️" },
    { label: "Decisões", value: completedTasksCount !== undefined ? String(completedTasksCount) : "—", icon: "✅" },
    { label: "Planejados", value: plannedTasksCount !== undefined ? String(plannedTasksCount) : "—", icon: "📆" },
  ];

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      setPhoto(dataUrl);
      localStorage.setItem(`flow40_profile_photo_${user.id}`, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const EMOTIONAL_SETTINGS = [
    { icon: "✨", label: "Meu Baú de Gratidão", detail: undefined as string | undefined, action: () => setIsVaultOpen(true) },
  ];

  const RHYTHM_SETTINGS = [
    { icon: "👤", label: "Editar perfil", detail: undefined as string | undefined, action: () => setEditingProfile(true) },
    {
      icon: "🔔",
      label: "Notificações e Lembretes",
      detail: notificationSettings?.reminders.checkin.time,
      action: () => {
        setDraft(notificationSettings ?? defaultNotificationSettings());
        setShowNotifications(true);
      },
    },
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
              style={{ width: 26, height: 26, background: NAVY_FILL, border: "2px solid #FFFFFF" }}
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
            <div key={s.label} className="flex-1 rounded-2xl py-3 px-2 text-center" style={{ background: CARD, boxShadow: "0 2px 8px rgba(22,54,90,0.03)" }}>
              <div className="text-base mb-1">{s.icon}</div>
              <div className="text-xl font-bold mb-0.5" style={{ color: ORANGE }}>{s.value}</div>
              <div className="text-[10.5px] font-semibold" style={{ color: TEXT_MUTED }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Espaço Emocional */}
        <div className="mb-5">
          <p className="text-[11.5px] font-bold uppercase mb-2" style={{ color: TEXT_MUTED, letterSpacing: "0.5px" }}>Espaço Emocional</p>
          <div className="rounded-[18px] overflow-hidden" style={{ background: CARD, boxShadow: "0 2px 10px rgba(22,54,90,0.03)" }}>
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
          <div className="rounded-[18px] overflow-hidden" style={{ background: CARD, boxShadow: "0 2px 10px rgba(22,54,90,0.03)" }}>
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
          <div className="rounded-[18px] overflow-hidden" style={{ background: CARD, boxShadow: "0 2px 10px rgba(22,54,90,0.03)" }}>
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

        {/* Admin: aviso geral */}
        {user?.role === "admin" && (
          <div className="mb-5">
            <p className="text-[11.5px] font-bold uppercase mb-2" style={{ color: TEXT_MUTED, letterSpacing: "0.5px" }}>Admin</p>
            <div className="rounded-[18px] overflow-hidden" style={{ background: CARD, boxShadow: "0 2px 10px rgba(22,54,90,0.03)" }}>
              <button onClick={() => setShowBroadcast(true)} className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left">
                <span className="text-base w-5 text-center" style={{ color: NAVY }}>📢</span>
                <span className="flex-1 text-[13.5px] font-semibold" style={{ color: NAVY }}>Enviar aviso geral</span>
                <span className="text-xs" style={{ color: "#C4CBC4" }}>›</span>
              </button>
            </div>
          </div>
        )}

        {/* Sair */}
        <div className="mb-4">
          <div className="rounded-[18px] overflow-hidden" style={{ background: CARD, boxShadow: "0 2px 10px rgba(22,54,90,0.03)" }}>
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
      {isVaultOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(22,54,90,0.4)" }}>
          <div className="w-full max-w-md rounded-t-[32px] p-6 max-h-[75vh] flex flex-col" style={{ background: BG_APP }}>
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <span className="text-base font-bold" style={{ color: NAVY }}>✨ Meu Baú de Gratidão</span>
              <button
                onClick={() => setIsVaultOpen(false)}
                className="rounded-full flex items-center justify-center text-sm"
                style={{ width: 30, height: 30, background: CARD, border: `1px solid ${LINE}`, color: NAVY }}
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-2">
              {gratitudeEntries.length === 0 ? (
                <p className="text-center text-[12.5px] font-medium py-6" style={{ color: TEXT_MUTED }}>
                  Ainda não há gratidões registradas. Escreva algo no campo "Pelo que você é grata hoje?" do seu próximo check-up. 🌿
                </p>
              ) : (
                gratitudeEntries.map((entry, i) => (
                  <div key={i} className="rounded-2xl p-3.5" style={{ background: CARD, boxShadow: "0 2px 6px rgba(22,54,90,0.02)" }}>
                    <p className="text-[11px] font-semibold mb-1.5" style={{ color: TEXT_MUTED }}>{vaultDateLabel(entry.date)}</p>
                    <p className="text-[13px] italic leading-relaxed" style={{ color: NAVY }}>"{entry.text}"</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Editar perfil */}
      {editingProfile && createPortal(
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
                    className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: CARD, border: `1px solid ${LINE}`, color: NAVY }} />
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
        </div>,
        document.body
      )}

      {/* Modal: Notificações e Lembretes */}
      {showNotifications && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(22,54,90,0.4)" }}>
          <div className="w-full max-w-md rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto" style={{ background: BG_APP }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: LINE }} />
            <h3 className="text-base font-bold mb-4" style={{ color: NAVY }}>Notificações e Lembretes</h3>

            {/* Ativação de push */}
            <div className="mb-4 rounded-2xl p-3" style={{ background: CARD }}>
              {!isPushSupported() ? (
                <p className="text-xs font-medium" style={{ color: TEXT_MUTED }}>
                  Seu navegador não suporta notificações push.
                </p>
              ) : pushEnabled ? (
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold" style={{ color: NAVY }}>✅ Notificações ativadas neste dispositivo</span>
                  <button onClick={handleDisablePush} className="text-xs font-semibold underline flex-shrink-0" style={{ color: TEXT_MUTED }}>
                    Desativar
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleEnablePush}
                  disabled={enablingPush}
                  className="w-full h-10 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                  style={{ background: SAGE }}
                >
                  {enablingPush ? "Ativando..." : "🔔 Ativar notificações"}
                </button>
              )}
            </div>

            {/* Check-in matinal */}
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: TEXT_MUTED }}>Check-up Matinal</p>
              <div className="rounded-2xl p-3" style={{ background: CARD }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold" style={{ color: NAVY }}>{CHECKIN_REMINDER.icon} Alerta matinal</span>
                  <div className="w-10 h-6 rounded-full cursor-pointer transition-all"
                       style={{ background: draft.reminders.checkin.enabled ? SAGE : LINE }}
                       onClick={() => updateReminder("checkin", { enabled: !draft.reminders.checkin.enabled })}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow m-0.5 transition-all ${draft.reminders.checkin.enabled ? "translate-x-4" : ""}`} />
                  </div>
                </div>
                <input type="time" value={draft.reminders.checkin.time}
                  onChange={e => updateReminder("checkin", { time: e.target.value })}
                  className="text-sm rounded-lg px-2 py-1 outline-none"
                  style={{ background: CARD, border: `1px solid ${LINE}`, color: NAVY }} />
              </div>
            </div>

            {/* Lembretes de tarefa */}
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: TEXT_MUTED }}>Lembretes de Tarefa</p>
              <div className="space-y-2">
                {TASK_REMINDERS.map(r => (
                  <div key={r.id} className="rounded-2xl p-3" style={{ background: CARD }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold" style={{ color: NAVY }}>{r.icon} {r.label}</span>
                      <div className="w-10 h-6 rounded-full cursor-pointer transition-all"
                           style={{ background: draft.reminders[r.id].enabled ? SAGE : LINE }}
                           onClick={() => updateReminder(r.id, { enabled: !draft.reminders[r.id].enabled })}>
                        <div className={`w-5 h-5 rounded-full bg-white shadow m-0.5 transition-all ${draft.reminders[r.id].enabled ? "translate-x-4" : ""}`} />
                      </div>
                    </div>
                    <input type="time" value={draft.reminders[r.id].time}
                      onChange={e => updateReminder(r.id, { time: e.target.value })}
                      className="text-sm rounded-lg px-2 py-1 outline-none"
                      style={{ background: CARD, border: `1px solid ${LINE}`, color: NAVY }} />
                  </div>
                ))}
                <div className="rounded-2xl p-3" style={{ background: CARD }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold" style={{ color: NAVY }}>⏰ Lembrete de âncora</span>
                    <div className="w-10 h-6 rounded-full cursor-pointer transition-all"
                         style={{ background: draft.anchorsEnabled ? SAGE : LINE }}
                         onClick={() => setDraft(prev => ({ ...prev, anchorsEnabled: !prev.anchorsEnabled }))}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow m-0.5 transition-all ${draft.anchorsEnabled ? "translate-x-4" : ""}`} />
                    </div>
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: TEXT_MUTED }}>
                    Avisa no horário marcado de cada tarefa-âncora que você define no Planejamento.
                  </p>
                </div>
              </div>
            </div>

            {/* Pausas de recuperação */}
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: TEXT_MUTED }}>Pausas de Recuperação</p>
              <div className="space-y-2">
                {PAUSA_REMINDERS.map(r => (
                  <div key={r.id} className="rounded-2xl p-3" style={{ background: CARD }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold" style={{ color: NAVY }}>{r.icon} {r.label}</span>
                      <div className="w-10 h-6 rounded-full cursor-pointer transition-all"
                           style={{ background: draft.reminders[r.id].enabled ? SAGE : LINE }}
                           onClick={() => updateReminder(r.id, { enabled: !draft.reminders[r.id].enabled })}>
                        <div className={`w-5 h-5 rounded-full bg-white shadow m-0.5 transition-all ${draft.reminders[r.id].enabled ? "translate-x-4" : ""}`} />
                      </div>
                    </div>
                    <input type="time" value={draft.reminders[r.id].time}
                      onChange={e => updateReminder(r.id, { time: e.target.value })}
                      className="text-sm rounded-lg px-2 py-1 outline-none"
                      style={{ background: CARD, border: `1px solid ${LINE}`, color: NAVY }} />
                    <p className="text-[10px] mt-1" style={{ color: TEXT_MUTED }}>{r.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => { saveSettingsMutation.mutate(draft); setShowNotifications(false); }}
              className="w-full h-11 rounded-2xl text-white text-sm font-bold" style={{ background: SAGE }}>
              Salvar alertas
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Enviar aviso geral (admin) */}
      {showBroadcast && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(22,54,90,0.4)" }}>
          <div className="w-full max-w-md rounded-t-3xl p-5" style={{ background: BG_APP }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: LINE }} />
            <h3 className="text-base font-bold mb-1" style={{ color: NAVY }}>📢 Enviar aviso geral</h3>
            <p className="text-xs font-medium mb-4" style={{ color: TEXT_MUTED }}>
              Manda uma notificação push pra todas as usuárias que já ativaram notificações — use com moderação.
            </p>

            <label className="text-xs font-semibold mb-1.5 block" style={{ color: TEXT_MUTED }}>Título</label>
            <input
              value={broadcastTitle}
              onChange={e => setBroadcastTitle(e.target.value)}
              maxLength={80}
              placeholder="Ex.: Nova atualização disponível!"
              className="w-full text-sm rounded-xl px-3.5 py-2.5 outline-none mb-3"
              style={{ border: `1px solid ${LINE}`, color: NAVY, background: CARD }}
            />

            <label className="text-xs font-semibold mb-1.5 block" style={{ color: TEXT_MUTED }}>Mensagem</label>
            <textarea
              value={broadcastBody}
              onChange={e => setBroadcastBody(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="Ex.: Adicionamos lembretes de tarefa e um jeito melhor de planejar o dia."
              className="w-full text-sm rounded-xl px-3.5 py-2.5 outline-none mb-5 resize-none"
              style={{ border: `1px solid ${LINE}`, color: NAVY, background: CARD }}
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowBroadcast(false)}
                className="flex-1 h-11 rounded-2xl text-sm font-bold"
                style={{ border: `1px solid ${LINE}`, color: TEXT_MUTED }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSendBroadcast}
                disabled={!broadcastTitle.trim() || !broadcastBody.trim() || broadcastMutation.isPending}
                className="flex-1 h-11 rounded-2xl text-white text-sm font-bold disabled:opacity-50"
                style={{ background: SAGE }}
              >
                {broadcastMutation.isPending ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
