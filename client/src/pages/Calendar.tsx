import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import Calendar from "@/components/Calendar";
import { GoogleCalendarSync } from "@/components/GoogleCalendarSync";
import { Calendar as CalendarIcon } from "lucide-react";

export default function CalendarPage() {
  const [showGoogleSync, setShowGoogleSync] = useState(false);

  return (
    <div className="screen-container">
      <AppHeader rightSlot={
        <button className="w-9 h-9 rounded-full bg-white border border-[#E8DFD0] flex items-center justify-center text-[#8E8E93]">
          🔔
        </button>
      } />

      {/* Cabeçalho */}
      <div className="px-5 mb-4">
        <h2 className="text-2xl font-black text-[#1C1C1E]">Calendário</h2>
        <p className="text-sm text-[#8E8E93] mt-0.5">Visualize suas tarefas por mês</p>
      </div>

      {/* Sincronização com Google Calendar */}
      <div className="px-5 mb-4">
        <button
          onClick={() => setShowGoogleSync(!showGoogleSync)}
          className="w-full text-left font-bold text-[#1C1C1E] mb-3 text-sm flex items-center justify-between hover:text-[#E67E22] transition-colors"
        >
          <span>🔗 Google Calendar</span>
          <span className="text-[#8E8E93]">{showGoogleSync ? "−" : "+"}</span>
        </button>
        {showGoogleSync && <GoogleCalendarSync />}
      </div>

      {/* Calendário */}
      <div className="px-5 mb-4">
        <Calendar />
      </div>

      {/* Legenda */}
      <div className="px-5 mb-6 bg-white rounded-2xl border border-[#E8DFD0] p-4">
        <p className="text-xs font-bold text-[#8E8E93] mb-3">LEGENDA</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#2980B9]" />
            <span className="text-xs text-[#1C1C1E]">Pendente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#D4AC0D]" />
            <span className="text-xs text-[#1C1C1E]">Em progresso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#2E8B57]" />
            <span className="text-xs text-[#1C1C1E]">Concluída</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#E67E22]" />
            <span className="text-xs text-[#1C1C1E]">Hoje</span>
          </div>
        </div>
      </div>

      {/* Dicas */}
      <div className="px-5 mb-6">
        <div className="bg-[#FEF3E2] border-2 border-[#F7DC6F] rounded-2xl p-4">
          <p className="text-xs font-bold text-[#D4AC0D] mb-2">💡 DICA</p>
          <p className="text-xs text-[#8B6914]">
            Clique em qualquer dia para ver todas as tarefas daquele dia. Você pode visualizar detalhes, status e tempo estimado.
          </p>
        </div>
      </div>
    </div>
  );
}
