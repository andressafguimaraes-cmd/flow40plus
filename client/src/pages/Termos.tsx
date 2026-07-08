import { useState } from "react";
import { useLocation } from "wouter";

interface Clause {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

const TERMOS_CLAUSES: Clause[] = [
  {
    title: "1. Aceitação",
    paragraphs: [
      "Ao criar uma conta ou utilizar o Flow40+, você concorda com estes Termos de Uso e com nossa Política de Privacidade.",
      "Caso não concorde, basta não utilizar o aplicativo.",
    ],
  },
  {
    title: "2. Objetivo do Flow40+",
    paragraphs: [
      "O Flow40+ é um aplicativo desenvolvido para ajudar mulheres 40+ a organizar tarefas, desenvolver hábitos saudáveis e tomar decisões com mais clareza e equilíbrio.",
      "As recomendações fornecidas pelo aplicativo são sugestões baseadas nas informações inseridas pela própria usuária e não substituem orientação médica, psicológica, nutricional, jurídica ou profissional.",
    ],
  },
  {
    title: "3. Cadastro",
    paragraphs: ["Para utilizar algumas funcionalidades é necessário criar uma conta.", "A usuária é responsável por:"],
    bullets: ["fornecer informações verdadeiras", "manter sua senha em segurança", "manter seu e-mail atualizado"],
  },
  {
    title: "4. Uso responsável",
    paragraphs: [
      "A usuária concorda em utilizar o aplicativo de forma ética e legal, não realizando ações que possam prejudicar outros usuários ou comprometer o funcionamento da plataforma.",
    ],
  },
  {
    title: "5. Inteligência Artificial",
    paragraphs: ["Algumas funcionalidades utilizam Inteligência Artificial para sugerir:"],
    bullets: ["divisão de tarefas", "micro-passos", "recomendações de produtividade", "práticas de bem-estar"],
  },
  {
    title: "6. Disponibilidade",
    paragraphs: [
      "Buscamos manter o aplicativo disponível continuamente, mas não garantimos funcionamento ininterrupto.",
      "Atualizações e manutenções poderão ocorrer sempre que necessário.",
    ],
  },
  {
    title: "7. Alterações",
    paragraphs: [
      "Estes Termos poderão ser atualizados periodicamente.",
      "Sempre que houver mudanças relevantes, elas serão informadas dentro do aplicativo.",
    ],
  },
  {
    title: "8. Contato",
    paragraphs: ["Em caso de dúvidas, entre em contato pelo e-mail de suporte informado no aplicativo."],
  },
];

const PRIVACIDADE_CLAUSES: Clause[] = [
  {
    title: "1. Nosso compromisso",
    paragraphs: [
      "Sua privacidade é importante para nós.",
      "Coletamos apenas as informações necessárias para oferecer uma experiência personalizada no Flow40+.",
    ],
  },
  {
    title: "2. Dados coletados",
    paragraphs: ["Podemos coletar:"],
    bullets: [
      "nome",
      "e-mail",
      "senha (armazenada de forma segura)",
      "tarefas cadastradas",
      "respostas dos check-ups",
      "práticas realizadas",
      "preferências de uso",
      "informações de utilização do aplicativo",
    ],
  },
  {
    title: "3. Como usamos esses dados",
    paragraphs: ["Os dados são utilizados para:"],
    bullets: ["personalizar recomendações", "organizar tarefas", "acompanhar sua evolução", "melhorar a experiência do aplicativo", "corrigir problemas técnicos"],
  },
  {
    title: "4. Compartilhamento",
    paragraphs: [
      "O Flow40+ não vende dados pessoais.",
      "As informações poderão ser compartilhadas apenas quando necessário para funcionamento do serviço (por exemplo, provedores de hospedagem ou autenticação) ou quando exigido por lei.",
    ],
  },
  {
    title: "5. Segurança",
    paragraphs: [
      "Adotamos medidas técnicas para proteger seus dados contra acessos não autorizados.",
      "Apesar disso, nenhum sistema é totalmente imune a riscos.",
    ],
  },
  {
    title: "6. Seus direitos",
    paragraphs: ["Você pode solicitar:"],
    bullets: ["acesso aos seus dados", "correção de informações", "exclusão da conta", "exclusão dos dados pessoais, quando aplicável"],
  },
  {
    title: "7. Cookies e tecnologias semelhantes",
    paragraphs: ["O aplicativo pode utilizar tecnologias que ajudam a melhorar desempenho, segurança e análise de uso."],
  },
  {
    title: "8. Alterações",
    paragraphs: ["Esta Política poderá ser atualizada para acompanhar melhorias no aplicativo ou mudanças na legislação."],
  },
  {
    title: "9. Contato",
    paragraphs: ["Caso tenha dúvidas sobre privacidade, utilize o canal de suporte informado no aplicativo."],
  },
];

export default function Termos() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"termos" | "privacidade">("termos");
  const clauses = tab === "termos" ? TERMOS_CLAUSES : PRIVACIDADE_CLAUSES;

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="px-5 pt-6 pb-4">
        <button onClick={() => setLocation("/")} className="text-sm text-muted mb-4">
          ‹ Voltar
        </button>
        <h1 className="text-2xl font-light text-secondary">Termos & Privacidade</h1>
        <p className="text-xs text-muted mt-1">Última atualização: julho de 2026</p>
      </div>

      <div className="flex gap-2 px-5 mb-6">
        <button
          onClick={() => setTab("termos")}
          className={`flex-1 h-10 rounded-xl text-sm font-semibold transition-all ${tab === "termos" ? "bg-secondary text-white" : "bg-card border border-border text-muted"}`}
        >
          Termos de Uso
        </button>
        <button
          onClick={() => setTab("privacidade")}
          className={`flex-1 h-10 rounded-xl text-sm font-semibold transition-all ${tab === "privacidade" ? "bg-secondary text-white" : "bg-card border border-border text-muted"}`}
        >
          Privacidade
        </button>
      </div>

      <div className="px-5 space-y-6">
        {clauses.map(clause => (
          <div key={clause.title}>
            <h2 className="text-base font-semibold text-secondary mb-2">{clause.title}</h2>
            <div className="space-y-2">
              {clause.paragraphs?.map((p, i) => (
                <p key={i} className="text-sm font-light text-muted leading-relaxed">{p}</p>
              ))}
              {clause.bullets && (
                <ul className="space-y-1.5 pl-1">
                  {clause.bullets.map((b, i) => (
                    <li key={i} className="text-sm font-light text-muted leading-relaxed flex gap-2">
                      <span className="text-accent flex-shrink-0">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
