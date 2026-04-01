export type Dimension =
  | "Demanda e Ritmo"
  | "Clareza e Autonomia"
  | "Reconhecimento"
  | "Relacionamentos"
  | "Segurança Psicológica"
  | "Suporte Organizacional";

export type Question = {
  id: string;
  text: string;
  dimension: Dimension;
};

export const questions: Question[] = [
  {
    id: "q1",
    text: "Consigo concluir as entregas no tempo sem sentir sobrecarga constante.",
    dimension: "Demanda e Ritmo",
  },
  {
    id: "q2",
    text: "Tenho clareza sobre prioridades e expectativas do meu papel.",
    dimension: "Clareza e Autonomia",
  },
  {
    id: "q3",
    text: "Posso decidir como executar minhas tarefas diárias.",
    dimension: "Clareza e Autonomia",
  },
  {
    id: "q4",
    text: "Recebo reconhecimento justo pelo meu trabalho.",
    dimension: "Reconhecimento",
  },
  {
    id: "q5",
    text: "Sinto que posso expressar preocupações sem medo de retaliação.",
    dimension: "Segurança Psicológica",
  },
  {
    id: "q6",
    text: "Tenho apoio adequado da liderança quando surgem obstáculos.",
    dimension: "Suporte Organizacional",
  },
  {
    id: "q7",
    text: "Existe colaboração saudável entre as equipes.",
    dimension: "Relacionamentos",
  },
  {
    id: "q8",
    text: "As pausas e momentos de descanso são respeitados na rotina.",
    dimension: "Demanda e Ritmo",
  },
  {
    id: "q9",
    text: "Recebo feedback frequente e construtivo.",
    dimension: "Reconhecimento",
  },
  {
    id: "q10",
    text: "Consigo acessar recursos (pessoas ou ferramentas) quando preciso de ajuda.",
    dimension: "Suporte Organizacional",
  },
];

export const dimensionDescriptions: Record<Dimension, string> = {
  "Demanda e Ritmo":
    "Carga de trabalho, prazos e pausas — base para o risco de esgotamento.",
  "Clareza e Autonomia":
    "Grau de controle sobre como trabalhar e entendimento do papel.",
  "Reconhecimento":
    "Feedbacks, valorização e equidade na percepção de justiça.",
  "Relacionamentos":
    "Clima de cooperação, respeito e apoio entre pares.",
  "Segurança Psicológica":
    "Liberdade para falar e errar sem medo de punição.",
  "Suporte Organizacional":
    "Recursos, liderança acessível e suporte em situações críticas.",
};
