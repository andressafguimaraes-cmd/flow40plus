import { useState } from "react";
import { useLocation } from "wouter";
import AppHeader from "@/components/AppHeader";

interface FAQItem {
  q: string;
  a: string;
  list?: { icon: string; label: string; text: string }[];
}

const FAQ: FAQItem[] = [
  {
    q: "O que é o Flow40+ e como ele funciona?",
    a: "O Flow40+ é um santuário digital de regulação de ritmo projetado para ajudar você a gerenciar sua energia, clareza e descanso sem a pressão das listas de tarefas corporativas tradicionais. Combinando o monitoramento consciente do seu estado diário com micro-práticas de bem-estar, o aplicativo sugere pequenos rituais e pausas ideais para o seu momento atual.",
  },
  {
    q: "Como o aplicativo escolhe \"A Próxima Melhor Decisão\"?",
    a: "Toda manhã, ao realizar o seu Check-up Matinal, você avalia de 1 a 5 três pilares: Sono, Energia e Clareza Mental. Nosso ecossistema lê esses scores em tempo real e, através do bloco de inteligência da página inicial, prioriza e sugere a micro-prática que vai atuar diretamente na sua métrica mais baixa daquele dia (seja para resgatar o foco, recuperar a energia ou relaxar a mente).",
  },
  {
    q: "O que são as Âncoras e como elas diferem das Tarefas Flexíveis?",
    a: "Para evitar a ansiedade visual, dividimos seu dia de forma inteligente:",
    list: [
      { icon: "⚓", label: "Âncoras:", text: "São compromissos inegociáveis que possuem um horário fixo e marcado no seu dia (como uma consulta médica ou um bloco de foco profundo). Elas ganham um marcador elegante de horário na sua lista." },
      { icon: "📋", label: "Tarefas Flexíveis:", text: "São pendências necessárias, mas livres de horários rígidos, estruturadas e agrupadas por prioridade para que você possa encaixá-las de forma fluida ao longo do seu ritmo diário." },
    ],
  },
  {
    q: "O que acontece se eu esquecer de fazer o Check-up Matinal?",
    a: "Não se preocupe! Caso você não registre o seu estado ao acordar, o bloco \"A Próxima Melhor Decisão\" ativa um modo de rotação inteligente baseado no período do dia (manhã, tarde ou noite) e no dia do mês, garantindo que você continue recebendo sugestões valiosas de pausas e hidratação.",
  },
  {
    q: "Como funcionam os Alertas de Ritmo?",
    a: "Os Alertas de Ritmo agem como lembretes gentis em primeiro plano enquanto você utiliza o aplicativo. Eles disparam notificações discretas nos momentos de transição do seu dia (como o lembrete de hidratação ou de pausa consciente), oferecendo um atalho direto para você pausar e conferir sua próxima melhor decisão. Eles são configurados e podem ser ajustados ou silenciados a qualquer momento na sua tela de Perfil.",
  },
];

export default function Ajuda() {
  const [, setLocation] = useLocation();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="screen-container">
      <AppHeader />

      <div className="px-5 mb-5">
        <button onClick={() => setLocation("/perfil")} className="text-sm text-muted mb-3">
          ‹ Voltar
        </button>
        <h2 className="text-2xl font-light text-secondary">🌿 Central de Ajuda & FAQ</h2>
        <p className="text-sm text-muted mt-1">Tudo sobre como o Flow40+ cuida do seu ritmo</p>
      </div>

      <div className="px-5 space-y-3 pb-6">
        {FAQ.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={item.q}
              className={`bg-card rounded-2xl border overflow-hidden transition-all ${isOpen ? "border-accent" : "border-border"}`}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
              >
                <span className="text-sm font-medium text-foreground flex-1">{item.q}</span>
                <span className={`text-sm flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-accent" : "text-muted"}`}>
                  ⌄
                </span>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-border">
                  <p className="text-sm font-light text-muted leading-relaxed">{item.a}</p>
                  {item.list && (
                    <ul className="mt-3 space-y-2">
                      {item.list.map(li => (
                        <li key={li.label} className="text-sm font-light text-muted leading-relaxed">
                          <span className="font-semibold text-secondary">{li.icon} {li.label}</span> {li.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
