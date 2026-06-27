import { useLocation } from "wouter";

const tabs = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? "#E67E22" : "none"} stroke={active ? "#E67E22" : "#8E8E93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    path: "/jornada",
    label: "Jornada",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? "#E67E22" : "#8E8E93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    ),
  },
  {
    path: "/tasks",
    label: "Tarefas",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? "#E67E22" : "#8E8E93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
  },
  {
    path: "/calendar",
    label: "Calendário",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? "#E67E22" : "#8E8E93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    path: "/practices",
    label: "Práticas",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? "#E67E22" : "#8E8E93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22c-4.97 0-9-4.03-9-9 0-3.03 1.5-5.71 3.8-7.35"/>
        <path d="M12 2c4.97 0 9 4.03 9 9 0 3.03-1.5 5.71-3.8 7.35"/>
        <circle cx="12" cy="13" r="3"/>
      </svg>
    ),
  },
  {
    path: "/perfil",
    label: "Perfil",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? "#E67E22" : "#8E8E93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8DFD0] z-50"
         style={{ height: 64, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex items-center justify-around h-full px-2">
        {tabs.map((tab) => {
          const active = location === tab.path || (location === "/" && tab.path === "/dashboard");
          return (
            <button
              key={tab.path}
              onClick={() => setLocation(tab.path)}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all select-none"
              style={{ color: active ? "#E67E22" : "#8E8E93" }}
            >
              <span className="w-5 h-5">{tab.icon(active)}</span>
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
