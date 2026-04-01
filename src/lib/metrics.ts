import { Dimension, questions } from "@/lib/questions";
import { ResponseRecord, TriageData } from "@/lib/storage";

export type RiskBand = "Saudável" | "Monitoramento" | "Atenção alta" | "Crítico";
export type Severity = "baixo" | "moderado" | "alto";
export type InsightTone = "positive" | "neutral" | "attention";
export type ViewMode = "individual" | "company";
export type IndicatorKey = "burnout" | "anxiety" | "depression" | "stress" | "satisfaction";

export type DimensionScore = {
  dimension: Dimension;
  average: number;
  median: number;
  count: number;
};

export type QuestionScore = {
  id: string;
  text: string;
  dimension: Dimension;
  average: number;
  median: number;
  lowShare: number;
  count: number;
};

export type ConditionSignal = {
  name: string;
  score: number;
  prevalence: number;
  severity: Severity;
  rationale: string;
};

export type NarrativeInsight = {
  title: string;
  detail: string;
  tone: InsightTone;
};

export type IndicatorMetric = {
  key: IndicatorKey;
  label: string;
  value: number;
};

export type DistributionSlice = {
  label: string;
  value: number;
};

export type AreaBucket = {
  label: string;
  count: number;
};

export type PathologyHeatmapRow = {
  label: string;
  count: number;
  values: Array<{ category: IndicatorKey; score: number }>;
};

export type IndividualView = {
  submittedAt: string;
  team?: string;
  role?: string;
  overallAverage: number;
  riskBand: RiskBand;
  weakestDimension: Dimension;
  strongestDimension: Dimension;
  dimensionScores: DimensionScore[];
  alerts: string[];
  tendencies: ConditionSignal[];
  triage: TriageData;
};

export type RiskDistributionItem = {
  band: RiskBand;
  count: number;
  share: number;
};

export type SegmentSnapshot = {
  segment: string;
  count: number;
  median: number;
  riskBand: RiskBand;
  topDimension: Dimension;
};

export type HeatmapRow = {
  label: string;
  count: number;
  values: Array<{ dimension: Dimension; score: number }>;
};

export type CompanyView = {
  totalResponses: number;
  overallMedian: number;
  overallAverage: number;
  wellbeingIndex: number;
  satisfactionScore: number;
  burnoutRiskShare: number;
  anxietyRiskShare: number;
  weakestDimension: Dimension;
  strongestDimension: Dimension;
  dimensionScores: DimensionScore[];
  questionScores: QuestionScore[];
  riskDistribution: RiskDistributionItem[];
  tendencies: ConditionSignal[];
  segmentSnapshots: SegmentSnapshot[];
  heatmap: HeatmapRow[];
  insights: NarrativeInsight[];
  indicatorBars: IndicatorMetric[];
  riskDonut: DistributionSlice[];
  wellbeingArea: AreaBucket[];
  pathologyHeatmap: PathologyHeatmapRow[];
  technicalResponseRows: TechnicalResponseRow[];
  technicalHeatmap: HeatmapRow[];
  highRiskShare: number;
  overloadShare: number;
  sleepRiskShare: number;
  conditionPrevalence: ConditionSignal[];
};

export type TechnicalResponseRow = {
  id: string;
  submittedAt: string;
  team?: string;
  role?: string;
  overallAverage: number;
  riskBand: RiskBand;
  weakestDimension: Dimension;
  strongestDimension: Dimension;
  recentOverload?: TriageData["recentOverload"];
  sleepQuality?: TriageData["sleepQuality"];
  workModel?: TriageData["workModel"];
  leadership?: TriageData["leadership"];
  emotionalPressure?: TriageData["emotionalPressure"];
  energyLevel?: TriageData["energyLevel"];
  motivationLevel?: TriageData["motivationLevel"];
  socialIsolation?: TriageData["socialIsolation"];
};

export type ResponseRiskSummary = {
  id: string;
  submittedAt: string;
  team?: string;
  role?: string;
  overallAverage: number;
  riskBand: RiskBand;
  weakestDimension: Dimension;
  strongestDimension: Dimension;
  alerts: string[];
};

export type DashboardPayload = {
  generatedAt: string;
  companyLabel: string;
  totalResponses: number;
  participationRate?: number;
  individual: IndividualView | null;
  companyView: CompanyView;
  allowedViews: ViewMode[];
  defaultView: ViewMode;
};

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function inverseScore(score: number) {
  return Math.max(0, Math.min(1, (5 - score) / 4));
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return round((part / total) * 100);
}

function triageWeight(value: string | undefined, weights: Record<string, number>) {
  if (!value) return 0;
  return weights[value] ?? 0;
}

function getRiskBand(score: number): RiskBand {
  if (score >= 4) return "Saudável";
  if (score >= 3.3) return "Monitoramento";
  if (score >= 2.5) return "Atenção alta";
  return "Crítico";
}

function getSeverity(score: number): Severity {
  if (score >= 70) return "alto";
  if (score >= 45) return "moderado";
  return "baixo";
}

function normalizeHours(hours?: number) {
  if (!hours) return 0;
  return Math.max(0, Math.min(1, (hours - 40) / 15));
}

function getQuestion(questionId: string) {
  return questions.find((question) => question.id === questionId);
}

function computePerResponse(response: ResponseRecord) {
  const valuesByDimension: Record<Dimension, number[]> = {
    "Demanda e Ritmo": [],
    "Clareza e Autonomia": [],
    Reconhecimento: [],
    Relacionamentos: [],
    "Segurança Psicológica": [],
    "Suporte Organizacional": [],
  };

  response.answers.forEach((answer) => {
    const question = getQuestion(answer.questionId);
    if (!question) return;
    valuesByDimension[question.dimension].push(answer.value);
  });

  const dimensionScores = (Object.keys(valuesByDimension) as Dimension[]).map((dimension) => ({
    dimension,
    average: round(mean(valuesByDimension[dimension])),
    median: round(median(valuesByDimension[dimension])),
    count: valuesByDimension[dimension].length,
  } satisfies DimensionScore));

  const answerValues = response.answers.map((answer) => answer.value);
  const overallAverage = round(mean(answerValues));
  const sortedDimensions = [...dimensionScores].sort((a, b) => a.average - b.average);

  return {
    response,
    overallAverage,
    riskBand: getRiskBand(overallAverage),
    dimensionScores,
    weakestDimension: sortedDimensions[0]?.dimension ?? "Demanda e Ritmo",
    strongestDimension:
      sortedDimensions[sortedDimensions.length - 1]?.dimension ?? "Suporte Organizacional",
  };
}

function buildConditionScores(item: ReturnType<typeof computePerResponse>) {
  const triage = item.response.triage ?? {};
  const dimensionMap = Object.fromEntries(
    item.dimensionScores.map((dimension) => [dimension.dimension, dimension.average])
  ) as Record<Dimension, number>;

  const burnout = round(
    (
      inverseScore(dimensionMap["Demanda e Ritmo"]) * 0.3 +
      inverseScore(dimensionMap["Suporte Organizacional"]) * 0.12 +
      triageWeight(triage.energyLevel, { preservada: 0, oscilando: 0.1, esgotada: 0.22 }) +
      (triage.recentOverload === "sim" ? 0.16 : 0) +
      (triage.sleepQuality === "ruim" ? 0.12 : triage.sleepQuality === "regular" ? 0.06 : 0) +
      normalizeHours(triage.weeklyHours) * 0.1
    ) * 100
  );

  const anxiety = round(
    (
      inverseScore(dimensionMap["Segurança Psicológica"]) * 0.28 +
      inverseScore(dimensionMap["Clareza e Autonomia"]) * 0.16 +
      triageWeight(triage.emotionalPressure, { baixa: 0, media: 0.12, alta: 0.24 }) +
      (triage.publicExposure === "alta" ? 0.1 : triage.publicExposure === "media" ? 0.05 : 0) +
      (triage.sleepQuality === "ruim" ? 0.1 : triage.sleepQuality === "regular" ? 0.05 : 0) +
      (triage.recentOverload === "sim" ? 0.11 : 0)
    ) * 100
  );

  const depression = round(
    (
      inverseScore(dimensionMap.Reconhecimento) * 0.18 +
      inverseScore(dimensionMap.Relacionamentos) * 0.18 +
      inverseScore(dimensionMap["Suporte Organizacional"]) * 0.14 +
      inverseScore(item.overallAverage) * 0.12 +
      triageWeight(triage.motivationLevel, { preservada: 0, oscilando: 0.14, reduzida: 0.28 }) +
      triageWeight(triage.socialIsolation, { nao: 0, pontual: 0.05, frequente: 0.1 }) +
      (triage.sleepQuality === "ruim" ? 0.1 : triage.sleepQuality === "regular" ? 0.05 : 0)
    ) * 100
  );

  const stress = round(
    (
      inverseScore(dimensionMap["Demanda e Ritmo"]) * 0.22 +
      inverseScore(dimensionMap["Clareza e Autonomia"]) * 0.12 +
      triageWeight(triage.emotionalPressure, { baixa: 0, media: 0.12, alta: 0.24 }) +
      (triage.recentOverload === "sim" ? 0.14 : 0) +
      normalizeHours(triage.weeklyHours) * 0.12 +
      (triage.sleepQuality === "ruim" ? 0.1 : triage.sleepQuality === "regular" ? 0.05 : 0)
    ) * 100
  );

  const isolation = round(
    (
      inverseScore(dimensionMap.Relacionamentos) * 0.32 +
      inverseScore(dimensionMap["Segurança Psicológica"]) * 0.2 +
      inverseScore(dimensionMap["Suporte Organizacional"]) * 0.16 +
      triageWeight(triage.socialIsolation, { nao: 0, pontual: 0.12, frequente: 0.24 }) +
      (triage.workModel === "remoto" ? 0.04 : 0) +
      (triage.leadership === "nao" ? 0.04 : 0)
    ) * 100
  );

  const satisfaction = round(
    Math.max(
      0,
      Math.min(
        100,
        (
          mean([
            dimensionMap.Reconhecimento,
            dimensionMap["Suporte Organizacional"],
            dimensionMap.Relacionamentos,
            item.overallAverage,
          ]) / 5
        ) * 100 - triageWeight(triage.motivationLevel, { preservada: 0, oscilando: 8, reduzida: 16 })
      )
    )
  );

  return [
    {
      name: "Risco de exaustão / burnout",
      score: burnout,
      rationale: "Combina demanda, energia, sobrecarga recente, sono, suporte e carga horária.",
    },
    {
      name: "Risco de ansiedade ocupacional",
      score: anxiety,
      rationale: "Considera segurança psicológica, clareza, pressão emocional, exposição e sono.",
    },
    {
      name: "Sinais de humor depressivo",
      score: depression,
      rationale: "Cruza motivação, vínculos, reconhecimento, suporte e indicadores de retração.",
    },
    {
      name: "Estresse ocupacional",
      score: stress,
      rationale: "Observa sobrecarga, pressão emocional, autonomia, sono e intensidade da rotina.",
    },
    {
      name: "Risco de isolamento psicossocial",
      score: isolation,
      rationale: "Observa relações, segurança para se posicionar e sensação de desconexão da equipe.",
    },
    {
      name: "Satisfação percebida",
      score: satisfaction,
      rationale: "Combina reconhecimento, suporte, relacionamento e manutenção da motivação.",
    },
  ];
}

function getIndicatorMap(item: ReturnType<typeof computePerResponse>) {
  const conditions = buildConditionScores(item);
  return {
    burnout: conditions.find((condition) => condition.name.includes("burnout"))?.score ?? 0,
    anxiety: conditions.find((condition) => condition.name.includes("ansiedade"))?.score ?? 0,
    depression: conditions.find((condition) => condition.name.includes("depressivo"))?.score ?? 0,
    stress: conditions.find((condition) => condition.name.includes("Estresse"))?.score ?? 0,
    satisfaction: conditions.find((condition) => condition.name.includes("Satisfação"))?.score ?? 0,
  } satisfies Record<IndicatorKey, number>;
}

function buildIndividualView(item: ReturnType<typeof computePerResponse>): IndividualView {
  const triage = item.response.triage ?? {};
  const alerts: string[] = [];

  if (item.overallAverage < 3.3) alerts.push("Índice individual abaixo da faixa de conforto, sugerindo atenção clínica.");
  if (triage.recentOverload === "sim") alerts.push("Relato de sobrecarga nas últimas 2 semanas.");
  if (triage.sleepQuality === "ruim") alerts.push("Qualidade do sono ruim, com potencial impacto em fadiga e regulação emocional.");
  if (triage.energyLevel === "esgotada") alerts.push("Energia diária relatada como esgotada, com sinal consistente de desgaste.");
  if (triage.emotionalPressure === "alta") alerts.push("Pressão emocional alta nas últimas semanas, com potencial intensificação de ansiedade.");
  if (triage.motivationLevel === "reduzida") alerts.push("Motivação reduzida percebida no trabalho, sinal compatível com retração e queda de engajamento.");
  if (triage.socialIsolation === "frequente") alerts.push("Sensação frequente de isolamento ou desconexão da equipe.");
  if ((triage.weeklyHours ?? 0) >= 45) alerts.push("Carga horária elevada, aumentando risco de esgotamento e queda de recuperação.");
  if (item.weakestDimension) alerts.push(`Dimensão mais sensível: ${item.weakestDimension}.`);

  const tendencies = buildConditionScores(item)
    .map((condition) => ({
      ...condition,
      prevalence: condition.score >= 60 ? 100 : condition.score >= 45 ? 50 : 0,
      severity: condition.name.includes("Satisfação") ? getSeverity(100 - condition.score) : getSeverity(condition.score),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return {
    submittedAt: item.response.submittedAt,
    team: item.response.team,
    role: item.response.role,
    overallAverage: item.overallAverage,
    riskBand: item.riskBand,
    weakestDimension: item.weakestDimension,
    strongestDimension: item.strongestDimension,
    dimensionScores: item.dimensionScores,
    alerts,
    tendencies,
    triage,
  };
}

function buildCompanyDimensions(perResponse: Array<ReturnType<typeof computePerResponse>>) {
  const grouped: Record<Dimension, number[]> = {
    "Demanda e Ritmo": [],
    "Clareza e Autonomia": [],
    Reconhecimento: [],
    Relacionamentos: [],
    "Segurança Psicológica": [],
    "Suporte Organizacional": [],
  };

  perResponse.forEach((item) => {
    item.dimensionScores.forEach((dimension) => grouped[dimension.dimension].push(dimension.average));
  });

  return (Object.keys(grouped) as Dimension[]).map((dimension) => ({
    dimension,
    average: round(mean(grouped[dimension])),
    median: round(median(grouped[dimension])),
    count: grouped[dimension].length,
  } satisfies DimensionScore));
}

function buildQuestionScores(responses: ResponseRecord[]) {
  return questions.map((question) => {
    const values = responses.reduce<number[]>((acc, response) => {
      const value = response.answers.find((answer) => answer.questionId === question.id)?.value;
      if (typeof value === "number") acc.push(value);
      return acc;
    }, []);

    return {
      id: question.id,
      text: question.text,
      dimension: question.dimension,
      average: round(mean(values)),
      median: round(median(values)),
      lowShare: percent(values.filter((value) => value <= 2).length, values.length),
      count: values.length,
    } satisfies QuestionScore;
  });
}

function buildRiskDistribution(perResponse: Array<ReturnType<typeof computePerResponse>>) {
  const bands: RiskBand[] = ["Saudável", "Monitoramento", "Atenção alta", "Crítico"];
  return bands.map((band) => {
    const count = perResponse.filter((item) => item.riskBand === band).length;
    return {
      band,
      count,
      share: percent(count, perResponse.length),
    } satisfies RiskDistributionItem;
  });
}

function buildConditionSignals(perResponse: Array<ReturnType<typeof computePerResponse>>) {
  if (!perResponse.length) return [] as ConditionSignal[];

  const grouped = new Map<string, { scores: number[]; rationale: string }>();
  perResponse.forEach((item) => {
    buildConditionScores(item).forEach((condition) => {
      const current = grouped.get(condition.name) ?? { scores: [], rationale: condition.rationale };
      current.scores.push(condition.score);
      grouped.set(condition.name, current);
    });
  });

  return Array.from(grouped.entries())
    .map(([name, payload]) => {
      const score = round(mean(payload.scores));
      const prevalence = percent(
        payload.scores.filter((value) => (name.includes("Satisfação") ? value >= 70 : value >= 60)).length,
        payload.scores.length
      );
      const severityScore = name.includes("Satisfação") ? 100 - score : score;
      return {
        name,
        score,
        prevalence,
        severity: getSeverity(severityScore),
        rationale: payload.rationale,
      } satisfies ConditionSignal;
    })
    .sort((a, b) => b.score - a.score);
}

function buildSegmentSnapshots(perResponse: Array<ReturnType<typeof computePerResponse>>) {
  const segments = [
    { label: "Sobrecarga recente", filter: (item: ReturnType<typeof computePerResponse>) => item.response.triage?.recentOverload === "sim" },
    { label: "Sono regular/ruim", filter: (item: ReturnType<typeof computePerResponse>) => item.response.triage?.sleepQuality === "regular" || item.response.triage?.sleepQuality === "ruim" },
    { label: "Pressão emocional alta", filter: (item: ReturnType<typeof computePerResponse>) => item.response.triage?.emotionalPressure === "alta" },
    { label: "Motivação oscilando/reduzida", filter: (item: ReturnType<typeof computePerResponse>) => item.response.triage?.motivationLevel === "oscilando" || item.response.triage?.motivationLevel === "reduzida" },
    { label: "Isolamento pontual/frequente", filter: (item: ReturnType<typeof computePerResponse>) => item.response.triage?.socialIsolation === "pontual" || item.response.triage?.socialIsolation === "frequente" },
  ];

  return segments
    .map((segment) => {
      const rows = perResponse.filter(segment.filter);
      if (!rows.length) return null;
      const dimensions = buildCompanyDimensions(rows).sort((a, b) => a.median - b.median);
      const medianScore = round(median(rows.map((row) => row.overallAverage)));
      return {
        segment: segment.label,
        count: rows.length,
        median: medianScore,
        riskBand: getRiskBand(medianScore),
        topDimension: dimensions[0]?.dimension ?? "Demanda e Ritmo",
      } satisfies SegmentSnapshot;
    })
    .filter((item): item is SegmentSnapshot => Boolean(item));
}

function buildHeatmap(perResponse: Array<ReturnType<typeof computePerResponse>>) {
  const segments = [
    { label: "Empresa geral", filter: () => true },
    { label: "Sobrecarga recente", filter: (item: ReturnType<typeof computePerResponse>) => item.response.triage?.recentOverload === "sim" },
    { label: "Sono ruim/regular", filter: (item: ReturnType<typeof computePerResponse>) => item.response.triage?.sleepQuality === "ruim" || item.response.triage?.sleepQuality === "regular" },
    { label: "Pressão emocional alta", filter: (item: ReturnType<typeof computePerResponse>) => item.response.triage?.emotionalPressure === "alta" },
    { label: "Motivação reduzida", filter: (item: ReturnType<typeof computePerResponse>) => item.response.triage?.motivationLevel === "reduzida" },
    { label: "Isolamento frequente", filter: (item: ReturnType<typeof computePerResponse>) => item.response.triage?.socialIsolation === "frequente" },
  ];

  return segments
    .map((segment) => {
      const rows = perResponse.filter(segment.filter);
      if (!rows.length) return null;
      const dimensions = buildCompanyDimensions(rows);
      return {
        label: segment.label,
        count: rows.length,
        values: dimensions.map((dimension) => ({ dimension: dimension.dimension, score: dimension.median })),
      } satisfies HeatmapRow;
    })
    .filter((item): item is HeatmapRow => Boolean(item));
}

function buildIndicatorBars(perResponse: Array<ReturnType<typeof computePerResponse>>) {
  const values = perResponse.map(getIndicatorMap);
  return [
    { key: "burnout", label: "Burnout", value: round(mean(values.map((item) => item.burnout))) },
    { key: "anxiety", label: "Ansiedade", value: round(mean(values.map((item) => item.anxiety))) },
    { key: "depression", label: "Depressão", value: round(mean(values.map((item) => item.depression))) },
    { key: "stress", label: "Estresse", value: round(mean(values.map((item) => item.stress))) },
    { key: "satisfaction", label: "Satisfação", value: round(mean(values.map((item) => item.satisfaction))) },
  ] satisfies IndicatorMetric[];
}

function buildRiskDonut(perResponse: Array<ReturnType<typeof computePerResponse>>) {
  const low = perResponse.filter((item) => item.overallAverage >= 4).length;
  const moderate = perResponse.filter((item) => item.overallAverage >= 3.3 && item.overallAverage < 4).length;
  const high = perResponse.filter((item) => item.overallAverage < 3.3).length;
  return [
    { label: "Baixo risco", value: low },
    { label: "Risco moderado", value: moderate },
    { label: "Alto risco", value: high },
  ] satisfies DistributionSlice[];
}

function buildWellbeingArea(perResponse: Array<ReturnType<typeof computePerResponse>>) {
  const buckets = [
    { label: "1.0-2.0", min: 1, max: 2.01 },
    { label: "2.0-3.0", min: 2.01, max: 3.01 },
    { label: "3.0-4.0", min: 3.01, max: 4.01 },
    { label: "4.0-5.0", min: 4.01, max: 5.01 },
  ];
  return buckets.map((bucket) => ({
    label: bucket.label,
    count: perResponse.filter((item) => item.overallAverage >= bucket.min && item.overallAverage < bucket.max).length,
  } satisfies AreaBucket));
}

function buildPathologyHeatmap(perResponse: Array<ReturnType<typeof computePerResponse>>) {
  const groups = new Map<string, Array<ReturnType<typeof computePerResponse>>>();
  perResponse.forEach((item) => {
    const label = item.response.team || item.response.role || item.response.triage?.area || "Base geral";
    const rows = groups.get(label) ?? [];
    rows.push(item);
    groups.set(label, rows);
  });

  return Array.from(groups.entries())
    .map(([label, rows]) => {
      const indicators = rows.map(getIndicatorMap);
      return {
        label,
        count: rows.length,
        values: [
          { category: "burnout" as const, score: round(mean(indicators.map((item) => item.burnout))) },
          { category: "anxiety" as const, score: round(mean(indicators.map((item) => item.anxiety))) },
          { category: "depression" as const, score: round(mean(indicators.map((item) => item.depression))) },
          { category: "stress" as const, score: round(mean(indicators.map((item) => item.stress))) },
          { category: "satisfaction" as const, score: round(mean(indicators.map((item) => item.satisfaction))) },
        ],
      } satisfies PathologyHeatmapRow;
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function buildCompanyInsights(args: { dimensionScores: DimensionScore[]; tendencies: ConditionSignal[]; riskDistribution: RiskDistributionItem[]; totalResponses: number; }) {
  const { dimensionScores, tendencies, riskDistribution, totalResponses } = args;
  const weakestDimension = [...dimensionScores].sort((a, b) => a.median - b.median)[0];
  const strongestDimension = [...dimensionScores].sort((a, b) => b.median - a.median)[0];
  const highRiskShare = riskDistribution
    .filter((item) => item.band === "Atenção alta" || item.band === "Crítico")
    .reduce((sum, item) => sum + item.share, 0);
  const topCondition = tendencies.find((item) => !item.name.includes("Satisfação")) ?? tendencies[0];

  const insights: NarrativeInsight[] = [];
  if (weakestDimension) {
    insights.push({
      title: `Foco imediato em ${weakestDimension.dimension}`,
      detail: `A menor mediana está em ${weakestDimension.dimension.toLowerCase()} (${weakestDimension.median.toFixed(2)}), indicando onde a intervenção tende a gerar maior alívio sistêmico.`,
      tone: weakestDimension.median < 3.3 ? "attention" : "neutral",
    });
  }
  if (topCondition) {
    insights.push({
      title: topCondition.name,
      detail: `${topCondition.prevalence.toFixed(0)}% da base aparece em faixa intensa para esse sinal, o que ajuda a priorizar ações clínicas, educativas ou de gestão.`,
      tone: topCondition.severity === "alto" ? "attention" : "neutral",
    });
  }
  insights.push({
    title: `Distribuição atual de risco: ${highRiskShare.toFixed(0)}% em alta atenção/crítico`,
    detail: highRiskShare >= 35
      ? "A empresa já concentra uma massa relevante de respostas em faixa de cuidado prioritário. Vale combinar intervenção organizacional com leitura segmentada."
      : "O quadro geral não está concentrado apenas em extremos, mas ainda pede monitoramento dos recortes mais sensíveis.",
    tone: highRiskShare >= 35 ? "attention" : "neutral",
  });
  if (strongestDimension) {
    insights.push({
      title: `Base de proteção em ${strongestDimension.dimension}`,
      detail: `${strongestDimension.dimension} aparece como a dimensão mais forte (${strongestDimension.median.toFixed(2)}), e pode servir de alavanca para o plano de ação.`,
      tone: strongestDimension.median >= 4 ? "positive" : "neutral",
    });
  }
  if (totalResponses < 5) {
    insights.push({
      title: "Base amostral ainda pequena",
      detail: "A leitura já sinaliza tendências, mas o diagnóstico ganha estabilidade conforme mais respostas entram.",
      tone: "neutral",
    });
  }
  return insights.slice(0, 4);
}

function buildCompanyView(responses: ResponseRecord[]): CompanyView {
  const perResponse = responses.map(computePerResponse);
  const dimensionScores = buildCompanyDimensions(perResponse);
  const sortedDimensions = [...dimensionScores].sort((a, b) => a.median - b.median);
  const overallAverages = perResponse.map((item) => item.overallAverage);
  const riskDistribution = buildRiskDistribution(perResponse);
  const tendencies = buildConditionSignals(perResponse).slice(0, 6);
  const conditionPrevalence = buildConditionSignals(perResponse).slice(0, 6);
  const indicatorBars = buildIndicatorBars(perResponse);
  const wellbeingIndex = round((median(overallAverages) / 5) * 100);
  const satisfactionScore = indicatorBars.find((item) => item.key === "satisfaction")?.value ?? 0;
  const burnoutRiskShare = percent(perResponse.filter((item) => getIndicatorMap(item).burnout >= 60).length, perResponse.length);
  const anxietyRiskShare = percent(perResponse.filter((item) => getIndicatorMap(item).anxiety >= 60).length, perResponse.length);

  return {
    totalResponses: responses.length,
    overallMedian: round(median(overallAverages)),
    overallAverage: round(mean(overallAverages)),
    wellbeingIndex,
    satisfactionScore,
    burnoutRiskShare,
    anxietyRiskShare,
    weakestDimension: sortedDimensions[0]?.dimension ?? "Demanda e Ritmo",
    strongestDimension: sortedDimensions[sortedDimensions.length - 1]?.dimension ?? "Suporte Organizacional",
    dimensionScores,
    questionScores: buildQuestionScores(responses),
    riskDistribution,
    tendencies,
    segmentSnapshots: buildSegmentSnapshots(perResponse),
    heatmap: buildHeatmap(perResponse),
    insights: buildCompanyInsights({ dimensionScores, tendencies, riskDistribution, totalResponses: responses.length }),
    indicatorBars,
    riskDonut: buildRiskDonut(perResponse),
    wellbeingArea: buildWellbeingArea(perResponse),
    pathologyHeatmap: buildPathologyHeatmap(perResponse),
    technicalResponseRows: perResponse
      .map((item) => ({
        id: item.response.id,
        submittedAt: item.response.submittedAt,
        team: item.response.team,
        role: item.response.role,
        overallAverage: item.overallAverage,
        riskBand: item.riskBand,
        weakestDimension: item.weakestDimension,
        strongestDimension: item.strongestDimension,
        recentOverload: item.response.triage?.recentOverload,
        sleepQuality: item.response.triage?.sleepQuality,
        workModel: item.response.triage?.workModel,
        leadership: item.response.triage?.leadership,
        emotionalPressure: item.response.triage?.emotionalPressure,
        energyLevel: item.response.triage?.energyLevel,
        motivationLevel: item.response.triage?.motivationLevel,
        socialIsolation: item.response.triage?.socialIsolation,
      }))
      .sort((a, b) => a.overallAverage - b.overallAverage),
    technicalHeatmap: perResponse.map((item) => ({
      label: item.response.team || item.response.role || item.response.id.slice(0, 8),
      count: 1,
      values: item.dimensionScores.map((dimension) => ({ dimension: dimension.dimension, score: dimension.average })),
    })),
    highRiskShare: percent(
      perResponse.filter((item) => item.riskBand === "Atenção alta" || item.riskBand === "Crítico").length,
      perResponse.length
    ),
    overloadShare: percent(
      perResponse.filter((item) => item.response.triage?.recentOverload === "sim").length,
      perResponse.length
    ),
    sleepRiskShare: percent(
      perResponse.filter(
        (item) => item.response.triage?.sleepQuality === "regular" || item.response.triage?.sleepQuality === "ruim"
      ).length,
      perResponse.length
    ),
    conditionPrevalence,
  };
}

export function buildDashboardPayload(args: {
  responses: ResponseRecord[];
  companyLabel: string;
  seats?: number;
  ownerResponseId?: string;
  allowedViews?: ViewMode[];
  defaultView?: ViewMode;
}): DashboardPayload {
  const { companyLabel, ownerResponseId, responses, seats, allowedViews = ["company"], defaultView = "company" } = args;
  const owner = ownerResponseId ? responses.find((response) => response.id === ownerResponseId) : null;
  const individual = owner ? buildIndividualView(computePerResponse(owner)) : null;

  return {
    generatedAt: new Date().toISOString(),
    companyLabel,
    totalResponses: responses.length,
    participationRate: seats ? percent(responses.length, seats) : undefined,
    individual,
    companyView: buildCompanyView(responses),
    allowedViews,
    defaultView,
  };
}

export function summarizeResponseRisk(response: ResponseRecord): ResponseRiskSummary {
  const perResponse = computePerResponse(response);
  const individual = buildIndividualView(perResponse);

  return {
    id: response.id,
    submittedAt: response.submittedAt,
    team: response.team,
    role: response.role,
    overallAverage: perResponse.overallAverage,
    riskBand: perResponse.riskBand,
    weakestDimension: perResponse.weakestDimension,
    strongestDimension: perResponse.strongestDimension,
    alerts: individual.alerts,
  };
}

export type Metrics = {
  totalResponses: number;
  overallAverage: number;
  dimensionScores: DimensionScore[];
  questionScores: QuestionScore[];
};

export function computeMetrics(responses: ResponseRecord[]): Metrics {
  const companyView = buildCompanyView(responses);
  return {
    totalResponses: companyView.totalResponses,
    overallAverage: companyView.overallAverage,
    dimensionScores: companyView.dimensionScores,
    questionScores: companyView.questionScores,
  };
}
