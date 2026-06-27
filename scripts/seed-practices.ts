import { getDb } from "../server/db";
import { practices } from "../drizzle/schema";

const seedPractices = [
  // Focus (Foco)
  {
    title: "Técnica Pomodoro Adaptada",
    description: "25 minutos de foco intenso com pausa restauradora",
    category: "focus" as const,
    duration: 30,
    instructions: `1. Defina um timer para 25 minutos
2. Escolha uma única tarefa para focar
3. Elimine distrações (silenciar celular, fechar abas)
4. Trabalhe com total concentração
5. Ao soar o alarme, faça uma pausa de 5 minutos
6. Após 4 ciclos, faça uma pausa maior de 15-20 minutos

Dica: Mulheres 40+ podem precisar de pausas mais frequentes. Adapte conforme sua energia.`,
  },
  {
    title: "Meditação de Foco Rápida",
    description: "Meditação guiada para clareza mental em 10 minutos",
    category: "focus" as const,
    duration: 10,
    instructions: `1. Sente-se confortavelmente em um local tranquilo
2. Feche os olhos e respire profundamente 3 vezes
3. Concentre-se no seu padrão natural de respiração
4. Quando a mente vagar, traga gentilmente a atenção de volta
5. Mantenha por 10 minutos
6. Abra os olhos lentamente e aproveite a clareza

Benefício: Melhora concentração e reduz ansiedade.`,
  },
  {
    title: "Planejamento Matinal Intencional",
    description: "Organize seu dia com clareza e propósito",
    category: "focus" as const,
    duration: 15,
    instructions: `1. Com uma xícara de chá/café, sente-se tranquilamente
2. Revise seu calendário e tarefas do dia
3. Identifique as 3 prioridades principais
4. Defina blocos de tempo para cada uma
5. Antecipe possíveis obstáculos
6. Escreva uma intenção positiva para o dia

Dica: Fazer isso pela manhã melhora significativamente a produtividade.`,
  },

  // Relief (Alívio)
  {
    title: "Respiração 4-7-8 para Relaxamento",
    description: "Técnica de respiração que acalma o sistema nervoso",
    category: "relief" as const,
    duration: 5,
    instructions: `1. Sente-se ou deite-se confortavelmente
2. Inspire pelo nariz contando até 4
3. Prenda a respiração contando até 7
4. Expire pela boca contando até 8
5. Repita 4 vezes

Benefício: Reduz stress, ansiedade e melhora o sono.
Segurança: Se sentir tontura, reduza os números para 3-5-6.`,
  },
  {
    title: "Alongamento Suave de 10 Minutos",
    description: "Libere tensões do corpo com movimentos gentis",
    category: "relief" as const,
    duration: 10,
    instructions: `1. Alongue pescoço (5 movimentos cada lado)
2. Ombros (rotações e encolhimentos)
3. Costas (torção suave sentada)
4. Quadris (alongamento de borboleta)
5. Pernas (alongamento de isquiotibiais)
6. Pulsos e tornozelos (rotações)

Dica: Faça com movimentos lentos e conscientes. Nunca force além do conforto.`,
  },
  {
    title: "Banho Relaxante com Atenção Plena",
    description: "Transforme um banho em prática de bem-estar",
    category: "relief" as const,
    duration: 20,
    instructions: `1. Prepare a água em temperatura confortável
2. Adicione essência de lavanda ou camomila (opcional)
3. Desligue notificações e deixe o celular longe
4. Sinta a temperatura, textura da água
5. Observe aromas e sons
6. Deixe tensões saírem com a água

Benefício: Relaxamento profundo e restauração emocional.`,
  },

  // Inspiration (Inspiração)
  {
    title: "Leitura Inspiradora Matinal",
    description: "Comece o dia com palavras que elevam o espírito",
    category: "inspiration" as const,
    duration: 15,
    instructions: `1. Escolha um livro, artigo ou poesia que inspire você
2. Sente-se em um local confortável com uma bebida
3. Leia lentamente, absorvendo cada palavra
4. Pause para refletir sobre passagens significativas
5. Anote uma frase que ressoe com você
6. Leve essa inspiração para o dia

Sugestões: Autobiografias, poesia, filosofia, histórias de superação.`,
  },
  {
    title: "Gratidão Reflexiva",
    description: "Reconheça as bênçãos e pequenas alegrias do dia",
    category: "inspiration" as const,
    duration: 10,
    instructions: `1. Pegue papel e caneta
2. Escreva 3 coisas pelas quais é grata hoje
3. Para cada uma, escreva por que é significativa
4. Reflita sobre como essas coisas melhoram sua vida
5. Leia em voz alta com gratidão genuína
6. Guarde o papel para reler quando precisar

Benefício: Aumenta bem-estar, reduz depressão e ansiedade.`,
  },
  {
    title: "Movimento Consciente (Dança Livre)",
    description: "Expresse-se através do movimento e da música",
    category: "inspiration" as const,
    duration: 15,
    instructions: `1. Escolha uma música que levante seu ânimo
2. Encontre um espaço seguro para se mover
3. Deixe o corpo se mover naturalmente
4. Não há certo ou errado - apenas flua
5. Sinta a energia da música em cada célula
6. Termine com uma respiração profunda de gratidão

Benefício: Libera endorfinas, melhora humor e autoestima.
Dica: Escolha músicas que façam você sorrir.`,
  },
];

async function seed() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }

  try {
    console.log("🌱 Iniciando seed de práticas...");

    for (const practice of seedPractices) {
      await db.insert(practices).values(practice);
      console.log(`✅ Adicionada: ${practice.title}`);
    }

    console.log("🎉 Seed concluído com sucesso!");
    console.log(`Total de práticas adicionadas: ${seedPractices.length}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao fazer seed:", error);
    process.exit(1);
  }
}

seed();
