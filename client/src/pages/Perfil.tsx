import { useEffect, useState, useRef } from "react";
import AppHeader from "@/components/AppHeader";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const PAUSE_ALERTS = [
  { id: "manha", label: "🌿 Pausa da Manhã", defaultTime: "10:00", msg: "Hora de respirar e recarregar ☀️" },
  { id: "tarde", label: "🌿 Pausa da Tarde", defaultTime: "15:00", msg: "Faça uma pausa de 5 minutos 🌿" },
  { id: "noite", label: "🌿 Pausa Noturna", defaultTime: "20:00", msg: "Desacelere e prepare-se para descansar 🌙" },
];

export default function Perfil() {
  const { user, logout } = useAuth();
  const { data: checkInTotal } = trpc.checkIns.getTotalCount.useQuery();
  const { data: userTasks } = trpc.tasks.list.useQuery();
  const { data: practiceProgress } = trpc.practices.getUserProgress.useQuery();

  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [pauseAlerts, setPauseAlerts] = useState(
    PAUSE_ALERTS.reduce((acc, a) => ({ ...acc, [a.id]: { enabled: true, time: a.defaultTime } }), {} as Record<string, { enabled: boolean; time: string }>)
  );
  const [checkInAlert, setCheckInAlert] = useState({ enabled: true, time: "07:30" });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setEmail(user.email ?? "");
    }
  }, [user]);

  const completedTasksCount = userTasks?.filter(t => t.status === "completed").length;
  const practicesCount = practiceProgress?.length;

  const STATS = [
    { label: "Check-ups", value: checkInTotal !== undefined ? String(checkInTotal.count) : "—", icon: "☀️" },
    { label: "Tarefas", value: completedTasksCount !== undefined ? String(completedTasksCount) : "—", icon: "✅" },
    { label: "Práticas", value: practicesCount !== undefined ? String(practicesCount) : "—", icon: "🌿" },
  ];

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const SETTINGS = [
    { icon: "✏️", label: "Editar perfil", action: () => setEditingProfile(true) },
    { icon: "🔔", label: "Notificações e alertas", action: () => setShowNotifications(true) },
    { icon: "🌙", label: "Tema escuro", action: () => { setDarkMode(!darkMode); toast.success(darkMode ? "Tema claro ativado" : "Tema escuro ativado"); }, toggle: darkMode },
    { icon: "❓", label: "Ajuda e FAQ", action: () => setShowHelp(true) },
    { icon: "⭐", label: "Avaliar o app", action: () => toast.success("Obrigada pelo seu feedback! 💛") },
    { icon: "🚪", label: "Sair", action: () => { logout(); toast.info("Sessão encerrada"); }, danger: true },
  ];

  return (
    <div className="screen-container">
      <AppHeader />

      {/* Avatar */}
      <div className="flex flex-col items-center px-5 mb-6">
        <div className="relative mb-3">
          <div className="w-20 h-20 rounded-full border-4 border-[#E67E22] overflow-hidden bg-[#FEF3E2] flex items-center justify-center">
            {photo ? <img src={photo} className="w-full h-full object-cover" /> : <span className="text-3xl">👩</span>}
          </div>
          <button onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#E67E22] text-white text-xs flex items-center justify-center border-2 border-white">
            ✏️
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </div>
        <h2 className="text-lg font-black text-[#1C1C1E]">{name}</h2>
        <p className="text-xs text-[#8E8E93]">{email}</p>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-3 px-5 mb-5">
        {STATS.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#E8DFD0] p-3 text-center">
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="text-xl font-black text-[#E67E22]">{s.value}</div>
            <div className="text-[10px] text-[#8E8E93]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Configurações */}
      <p className="section-title">Configurações</p>
      <div className="mx-5 bg-white rounded-2xl border border-[#E8DFD0] overflow-hidden mb-6">
        {SETTINGS.map((s, i) => (
          <button key={s.label} onClick={s.action}
            className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all hover:bg-[#FDF5E6] ${i > 0 ? "border-t border-[#F0E8D8]" : ""}`}>
            <span className="text-lg w-7 text-center">{s.icon}</span>
            <span className={`flex-1 text-sm font-semibold ${s.danger ? "text-red-500" : "text-[#1C1C1E]"}`}>{s.label}</span>
            {"toggle" in s ? (
              <div className={`w-10 h-6 rounded-full transition-all ${s.toggle ? "bg-[#E67E22]" : "bg-[#E8DFD0]"}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow m-0.5 transition-all ${s.toggle ? "translate-x-4" : ""}`} />
              </div>
            ) : (
              <span className="text-[#8E8E93] text-sm">›</span>
            )}
          </button>
        ))}
      </div>

      {/* Modal: Editar perfil */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-md bg-white rounded-t-3xl p-5">
            <div className="w-10 h-1 rounded-full bg-[#E8DFD0] mx-auto mb-4" />
            <h3 className="text-base font-black text-[#1C1C1E] mb-4">Editar Perfil</h3>
            <div className="space-y-3">
              {[
                { label: "Nome", value: name, set: setName },
                { label: "E-mail", value: email, set: setEmail },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-xs font-bold text-[#8E8E93] mb-1 block">{f.label}</label>
                  <input value={f.value} onChange={e => f.set(e.target.value)}
                    className="w-full text-sm bg-[#FDF5E6] border border-[#E8DFD0] rounded-xl px-3 py-2.5 outline-none focus:border-[#E67E22]" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setEditingProfile(false)} className="flex-1 h-11 rounded-2xl border border-[#E8DFD0] text-sm font-bold text-[#8E8E93]">Cancelar</button>
              <button onClick={() => { setEditingProfile(false); toast.success("Perfil atualizado!"); }}
                className="flex-1 h-11 rounded-2xl bg-[#E67E22] text-white text-sm font-bold">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Notificações */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-md bg-white rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-[#E8DFD0] mx-auto mb-4" />
            <h3 className="text-base font-black text-[#1C1C1E] mb-4">Notificações e Alertas</h3>

            {/* Check-in matinal */}
            <div className="mb-4">
              <p className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">Check-up Matinal</p>
              <div className="bg-[#FDF5E6] rounded-2xl border border-[#E8DFD0] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[#1C1C1E]">☀️ Alerta matinal</span>
                  <div className={`w-10 h-6 rounded-full cursor-pointer transition-all ${checkInAlert.enabled ? "bg-[#E67E22]" : "bg-[#E8DFD0]"}`}
                       onClick={() => setCheckInAlert(a => ({ ...a, enabled: !a.enabled }))}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow m-0.5 transition-all ${checkInAlert.enabled ? "translate-x-4" : ""}`} />
                  </div>
                </div>
                <input type="time" value={checkInAlert.time}
                  onChange={e => setCheckInAlert(a => ({ ...a, time: e.target.value }))}
                  className="text-sm border border-[#E8DFD0] rounded-lg px-2 py-1 bg-white outline-none focus:border-[#E67E22]" />
              </div>
            </div>

            {/* Pausas de recuperação */}
            <div className="mb-4">
              <p className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">Pausas de Recuperação</p>
              <div className="space-y-2">
                {PAUSE_ALERTS.map(a => (
                  <div key={a.id} className="bg-[#FDF5E6] rounded-2xl border border-[#E8DFD0] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-[#1C1C1E]">{a.label}</span>
                      <div className={`w-10 h-6 rounded-full cursor-pointer transition-all ${pauseAlerts[a.id].enabled ? "bg-[#2E8B57]" : "bg-[#E8DFD0]"}`}
                           onClick={() => setPauseAlerts(prev => ({ ...prev, [a.id]: { ...prev[a.id], enabled: !prev[a.id].enabled } }))}>
                        <div className={`w-5 h-5 rounded-full bg-white shadow m-0.5 transition-all ${pauseAlerts[a.id].enabled ? "translate-x-4" : ""}`} />
                      </div>
                    </div>
                    <input type="time" value={pauseAlerts[a.id].time}
                      onChange={e => setPauseAlerts(prev => ({ ...prev, [a.id]: { ...prev[a.id], time: e.target.value } }))}
                      className="text-sm border border-[#E8DFD0] rounded-lg px-2 py-1 bg-white outline-none focus:border-[#E67E22]" />
                    <p className="text-[10px] text-[#8E8E93] mt-1">{a.msg}</p>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => { setShowNotifications(false); toast.success("Alertas salvos!"); }}
              className="w-full h-11 rounded-2xl bg-[#E67E22] text-white text-sm font-bold">
              Salvar alertas
            </button>
          </div>
        </div>
      )}

      {/* Modal: Ajuda */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-md bg-white rounded-t-3xl p-5 max-h-[70vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-[#E8DFD0] mx-auto mb-4" />
            <h3 className="text-base font-black text-[#1C1C1E] mb-4">Ajuda e FAQ</h3>
            {[
              { q: "O que é o check-up matinal?", a: "É um registro diário do seu estado de sono, energia e clareza mental. Ele personaliza as recomendações do dia." },
              { q: "Como funciona a decomposição de tarefas?", a: "Você captura uma tarefa por texto ou voz, e a IA automaticamente a divide em micro-passos acionáveis, considerando brain fog e energia." },
              { q: "O que são as micro-práticas?", a: "São exercícios rápidos (5–30 min) de foco, alívio, força ou inspiração, guiados passo a passo para encaixar na sua rotina." },
              { q: "Como os alertas de pausa funcionam?", a: "O app envia notificações nos horários configurados (padrão: 10h, 15h, 20h) lembrando você de fazer uma pausa e praticar." },
            ].map((faq, i) => (
              <div key={i} className="mb-3 bg-[#FDF5E6] rounded-2xl border border-[#E8DFD0] p-3">
                <p className="text-sm font-bold text-[#1C1C1E] mb-1">{faq.q}</p>
                <p className="text-xs text-[#8E8E93] leading-relaxed">{faq.a}</p>
              </div>
            ))}
            <button onClick={() => setShowHelp(false)}
              className="w-full h-11 rounded-2xl border border-[#E8DFD0] text-sm font-bold text-[#8E8E93] mt-2">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
