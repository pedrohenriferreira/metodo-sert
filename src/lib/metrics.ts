import { Dimension, questions } from "@/lib/questions";
import { CompanyFilterOptions, CompanyFilters } from "@/lib/dashboard-filters";
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

export type BenchmarkMetric = {
  label: string;
  currentValue: number;
  baselineValue: number;
  delta: number;
  format: "percent" | "score" | "count";
};

export type SampleAlert = {
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

export type CriticalSegment = {
  id: string;
  label: string;
  kind: ComparisonGroupKind;
  count: number;
  riskBand: RiskBand;
  overallMedian: number;
  weakestDimension: Dimension;
};

export type HeatmapRow = {
  label: string;
  count: number;
  values: Array<{ dimension: Dimension; score: number }>;
};

export type ComparisonGroupKind = "team" | "role" | "area";

export type ComparisonGroup = {
  id: string;
  kind: ComparisonGroupKind;
  label: string;
  shortLabel: string;
  count: number;
  overallMedian: number;
  wellbeingIndex: number;
  burnoutRiskShare: number;
  anxietyRiskShare: number;
  riskBand: RiskBand;
  weakestDimension: Dimension;
  dimensionScores: DimensionScore[];
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
  comparisonGroups: ComparisonGroup[];
  highRiskShare: number;
  overloadShare: number;
  sleepRiskShare: number;
  conditionPrevalence: ConditionSignal[];
  executiveSummary: NarrativeInsight[];
  priorityInsights: NarrativeInsight[];
  diagnosticHypotheses: NarrativeInsight[];
  benchmarkMetrics: BenchmarkMetric[];
  sampleAlerts: SampleAlert[];
  criticalSegments: CriticalSegment[];
};

export type TechnicalResponseRow = {
  id: string;
  pseudonymId?: string;
  submittedAt: string;
  team?: string;
  role?: string;
  area?: string;
  overallAverage: number;
  riskBand: RiskBand;
  weakestDimension: Dimension;
  strongestDimension: Dimension;
  protectedGroup: boolean;
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
  activeTeamFilter?: string;
  teamOptions: string[];
  activeFilters: CompanyFilters;
  filterOptions: CompanyFilterOptions;
  individual: IndividualView | null;
  companyView: CompanyView | null;
  companyAccess?: CompanyAccessSnapshot | null;
  allowedViews: ViewMode[];
  defaultView: ViewMode;
};

export type AccessTokenSnapshot = {
  value: string;
  used: boolean;
  active: boolean;
  usedAt?: string;
  label: string;
  reusable: boolean;
  responseId?: string;
  tokenType: "member" | "company";
};

export type CompanyAccessSnapshot = {
  totalTokens: number;
  usedTokens: number;
  availableTokens: number;
  alertCount: number;
  memberTokens: AccessTokenSnapshot[];
  companyTokens: AccessTokenSnapshot[];
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

function countByNormalizedValue(values: Array<string | undefined>) {
  return values.reduce<Record<string, number>>((acc, value) => {
    const normalized = value?.trim();
    if (!normalized) return acc;
    acc[normalized] = (acc[normalized] ?? 0) + 1;
    return acc;
  }, {});
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

  const visibleRows: PathologyHeatmapRow[] = [];
  const protectedRows: Array<ReturnType<typeof computePerResponse>> = [];

  Array.from(groups.entries()).forEach(([label, rows]) => {
    if (rows.length < 3) {
      protectedRows.push(...rows);
      return;
    }

    const indicators = rows.map(getIndicatorMap);
    visibleRows.push({
      label,
      count: rows.length,
      values: [
        { category: "burnout" as const, score: round(mean(indicators.map((item) => item.burnout))) },
        { category: "anxiety" as const, score: round(mean(indicators.map((item) => item.anxiety))) },
        { category: "depression" as const, score: round(mean(indicators.map((item) => item.depression))) },
        { category: "stress" as const, score: round(mean(indicators.map((item) => item.stress))) },
        { category: "satisfaction" as const, score: round(mean(indicators.map((item) => item.satisfaction))) },
      ],
    });
  });

  if (protectedRows.length) {
    const indicators = protectedRows.map(getIndicatorMap);
    visibleRows.push({
      label: "Grupos protegidos (<3)",
      count: protectedRows.length,
      values: [
        { category: "burnout" as const, score: round(mean(indicators.map((item) => item.burnout))) },
        { category: "anxiety" as const, score: round(mean(indicators.map((item) => item.anxiety))) },
        { category: "depression" as const, score: round(mean(indicators.map((item) => item.depression))) },
        { category: "stress" as const, score: round(mean(indicators.map((item) => item.stress))) },
        { category: "satisfaction" as const, score: round(mean(indicators.map((item) => item.satisfaction))) },
      ],
    });
  }

  return visibleRows
    .map((row) => {
      return {
        ...row,
      } satisfies PathologyHeatmapRow;
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function buildComparisonGroups(perResponse: Array<ReturnType<typeof computePerResponse>>) {
  const grouped = new Map<string, { kind: ComparisonGroupKind; value: string; rows: Array<ReturnType<typeof computePerResponse>> }>();

  perResponse.forEach((item) => {
    const candidates = [
      item.response.team ? { kind: "team" as const, value: item.response.team.trim() } : null,
      item.response.role ? { kind: "role" as const, value: item.response.role.trim() } : null,
      item.response.triage?.area ? { kind: "area" as const, value: item.response.triage.area.trim() } : null,
    ].filter((candidate): candidate is { kind: ComparisonGroupKind; value: string } => Boolean(candidate?.value));

    candidates.forEach((candidate) => {
      const key = `${candidate.kind}:${candidate.value}`;
      const current = grouped.get(key) ?? { kind: candidate.kind, value: candidate.value, rows: [] };
      current.rows.push(item);
      grouped.set(key, current);
    });
  });

  return Array.from(grouped.values())
    .filter((group) => group.rows.length >= 1)
    .map((group) => {
      const overallMedian = round(median(group.rows.map((row) => row.overallAverage)));
      const dimensions = buildCompanyDimensions(group.rows).sort((a, b) => a.median - b.median);
      const burnoutRiskShare = percent(
        group.rows.filter((row) => getIndicatorMap(row).burnout >= 60).length,
        group.rows.length
      );
      const anxietyRiskShare = percent(
        group.rows.filter((row) => getIndicatorMap(row).anxiety >= 60).length,
        group.rows.length
      );
      const kindLabel =
        group.kind === "team" ? "Time" : group.kind === "role" ? "Função" : "Área";

      return {
        id: `${group.kind}:${group.value}`,
        kind: group.kind,
        label: `${kindLabel}: ${group.value}`,
        shortLabel: group.value,
        count: group.rows.length,
        overallMedian,
        wellbeingIndex: round((overallMedian / 5) * 100),
        burnoutRiskShare,
        anxietyRiskShare,
        riskBand: getRiskBand(overallMedian),
        weakestDimension: dimensions[0]?.dimension ?? "Demanda e Ritmo",
        dimensionScores: dimensions,
      } satisfies ComparisonGroup;
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
      return a.shortLabel.localeCompare(b.shortLabel, "pt-BR");
    });
}

function buildBenchmarkMetrics(currentResponses: Array<ReturnType<typeof computePerResponse>>, baselineResponses: Array<ReturnType<typeof computePerResponse>>) {
  const currentIndicators = buildIndicatorBars(currentResponses);
  const baselineIndicators = buildIndicatorBars(baselineResponses);
  const currentWellbeingIndex = round((median(currentResponses.map((item) => item.overallAverage)) / 5) * 100);
  const baselineWellbeingIndex = round((median(baselineResponses.map((item) => item.overallAverage)) / 5) * 100);
  const currentHighRiskShare = percent(
    currentResponses.filter((item) => item.riskBand === "Atenção alta" || item.riskBand === "Crítico").length,
    currentResponses.length
  );
  const baselineHighRiskShare = percent(
    baselineResponses.filter((item) => item.riskBand === "Atenção alta" || item.riskBand === "Crítico").length,
    baselineResponses.length
  );

  return [
    {
      label: "Pessoas no recorte",
      currentValue: currentResponses.length,
      baselineValue: baselineResponses.length,
      delta: currentResponses.length - baselineResponses.length,
      format: "count",
    },
    {
      label: "Bem-estar",
      currentValue: currentWellbeingIndex,
      baselineValue: baselineWellbeingIndex,
      delta: currentWellbeingIndex - baselineWellbeingIndex,
      format: "percent",
    },
    {
      label: "Burnout alto",
      currentValue: currentIndicators.find((item) => item.key === "burnout")?.value ?? 0,
      baselineValue: baselineIndicators.find((item) => item.key === "burnout")?.value ?? 0,
      delta:
        (currentIndicators.find((item) => item.key === "burnout")?.value ?? 0) -
        (baselineIndicators.find((item) => item.key === "burnout")?.value ?? 0),
      format: "percent",
    },
    {
      label: "Ansiedade alta",
      currentValue: currentIndicators.find((item) => item.key === "anxiety")?.value ?? 0,
      baselineValue: baselineIndicators.find((item) => item.key === "anxiety")?.value ?? 0,
      delta:
        (currentIndicators.find((item) => item.key === "anxiety")?.value ?? 0) -
        (baselineIndicators.find((item) => item.key === "anxiety")?.value ?? 0),
      format: "percent",
    },
    {
      label: "Alta atenção + crítico",
      currentValue: currentHighRiskShare,
      baselineValue: baselineHighRiskShare,
      delta: currentHighRiskShare - baselineHighRiskShare,
      format: "percent",
    },
  ] satisfies BenchmarkMetric[];
}

function buildSampleAlerts(args: {
  totalResponses: number;
  comparisonGroups: ComparisonGroup[];
  criticalSegments: CriticalSegment[];
}) {
  const alerts: SampleAlert[] = [];

  if (args.totalResponses < 5) {
    alerts.push({
      title: "Amostra geral reduzida",
      detail: "O recorte atual ainda tem menos de 5 respostas. Use os sinais como tendência inicial, não como fechamento conclusivo.",
      tone: "attention",
    });
  } else if (args.totalResponses < 10) {
    alerts.push({
      title: "Amostra geral em consolidação",
      detail: "A leitura já orienta priorização, mas a estabilidade analítica melhora quando o recorte supera 10 respostas.",
      tone: "neutral",
    });
  }

  const smallGroups = args.comparisonGroups.filter((group) => group.count < 3);
  if (smallGroups.length) {
    alerts.push({
      title: "Grupos pequenos protegidos",
      detail: `${smallGroups.length} grupo(s) com menos de 3 respostas entram com leitura restrita ou agregada para reduzir risco de identificação indireta.`,
      tone: "neutral",
    });
  }

  if (!args.criticalSegments.length) {
    alerts.push({
      title: "Sem recortes críticos comparáveis",
      detail: "Ainda não há grupos suficientes com base mínima para formar um ranking confiável de criticidade por segmento.",
      tone: "neutral",
    });
  }

  return alerts.slice(0, 3);
}

function buildCriticalSegments(comparisonGroups: ComparisonGroup[]) {
  return comparisonGroups
    .filter((group) => group.count >= 3)
    .sort((a, b) => {
      if (a.overallMedian !== b.overallMedian) return a.overallMedian - b.overallMedian;
      return b.count - a.count;
    })
    .slice(0, 3)
    .map((group) => ({
      id: group.id,
      label: group.label,
      kind: group.kind,
      count: group.count,
      riskBand: group.riskBand,
      overallMedian: group.overallMedian,
      weakestDimension: group.weakestDimension,
    }) satisfies CriticalSegment);
}

function buildDiagnosticHypotheses(args: {
  weakestDimension: Dimension;
  burnoutRiskShare: number;
  anxietyRiskShare: number;
  overloadShare: number;
  topTendency?: ConditionSignal;
  responses: ResponseRecord[];
}) {
  const { anxietyRiskShare, burnoutRiskShare, overloadShare, responses, topTendency, weakestDimension } = args;
  const leadershipShare = percent(
    responses.filter((response) => response.triage?.leadership === "sim").length,
    responses.length
  );
  const isolationShare = percent(
    responses.filter(
      (response) =>
        response.triage?.socialIsolation === "pontual" || response.triage?.socialIsolation === "frequente"
    ).length,
    responses.length
  );

  return [
    {
      title: "Sinal mais compatível com sobrecarga",
      detail:
        overloadShare >= 35 || weakestDimension === "Demanda e Ritmo" || burnoutRiskShare >= anxietyRiskShare
          ? `O recorte atual combina pressão em demanda e ritmo com ${overloadShare.toFixed(0)}% de relatos de sobrecarga recente, sugerindo desgaste operacional como hipótese principal.`
          : "A sobrecarga não aparece como hipótese dominante neste recorte, mas ainda merece monitoramento em grupos de maior pressão.",
      tone: overloadShare >= 35 ? "attention" : "neutral",
    },
    {
      title: "Sinal mais compatível com liderança",
      detail:
        leadershipShare >= 25
          ? `${leadershipShare.toFixed(0)}% do recorte está em posições de liderança formal. Vale comparar gestores e não gestores para separar problema de gestão, cascata de pressão e base operacional.`
          : "A base atual tem pouca presença de liderança formal. O recorte sugere investigar mais a operação e o desenho do trabalho do que o nível gestor isoladamente.",
      tone: leadershipShare >= 25 ? "neutral" : "positive",
    },
    {
      title: "Sinal mais compatível com isolamento",
      detail:
        isolationShare >= 30 || topTendency?.name.includes("isolamento")
          ? `${isolationShare.toFixed(0)}% do grupo relata isolamento pontual ou frequente, o que reforça hipótese de desconexão relacional e menor segurança psicológica.`
          : "O isolamento não aparece como vetor dominante nesta leitura. O principal peso hoje parece estar mais em carga, pressão e organização do trabalho.",
      tone: isolationShare >= 30 ? "attention" : "neutral",
    },
  ] satisfies NarrativeInsight[];
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

function buildExecutiveSummary(args: {
  weakestDimension: Dimension;
  highRiskShare: number;
  topTendency?: ConditionSignal;
  totalResponses: number;
}) {
  const { highRiskShare, topTendency, totalResponses, weakestDimension } = args;
  const summary: NarrativeInsight[] = [
    {
      title: "Recorte em foco",
      detail: `${totalResponses} respostas compõem a leitura atual, com ${highRiskShare.toFixed(0)}% da base em alta atenção ou criticidade.`,
      tone: highRiskShare >= 35 ? "attention" : "neutral",
    },
    {
      title: "Eixo mais sensível",
      detail: `${weakestDimension} é a dimensão que mais puxa o resultado para baixo neste recorte.`,
      tone: "attention",
    },
  ];

  if (topTendency) {
    summary.push({
      title: "Sinal contextual dominante",
      detail: `${topTendency.name} aparece como o sinal mais prevalente e ajuda a explicar a concentração do risco.`,
      tone: topTendency.severity === "alto" ? "attention" : "neutral",
    });
  }

  return summary.slice(0, 3);
}

function buildPriorityInsights(args: {
  weakestDimension: Dimension;
  highRiskShare: number;
  overloadShare: number;
  sleepRiskShare: number;
  burnoutRiskShare: number;
  anxietyRiskShare: number;
  topTendency?: ConditionSignal;
}) {
  const { anxietyRiskShare, burnoutRiskShare, highRiskShare, overloadShare, sleepRiskShare, topTendency, weakestDimension } = args;
  const priorities: NarrativeInsight[] = [];

  priorities.push({
    title: "Prioridade 1",
    detail:
      highRiskShare >= 35
        ? "Acione monitoramento mais próximo e conversa com liderança, porque a concentração de casos sensíveis já pede resposta rápida."
        : "Monitore o recorte com rotina curta de acompanhamento para evitar escalada nos grupos mais sensíveis.",
    tone: highRiskShare >= 35 ? "attention" : "neutral",
  });

  priorities.push({
    title: "Prioridade 2",
    detail:
      weakestDimension === "Demanda e Ritmo" || overloadShare >= 35 || burnoutRiskShare >= anxietyRiskShare
        ? "Revise carga, ritmo operacional e distribuição do trabalho. O recorte sugere desgaste e sobrecarga como vetores relevantes."
        : `Aprofunde o eixo ${weakestDimension}, porque ele está concentrando a maior fragilidade do grupo filtrado.`,
    tone: "attention",
  });

  priorities.push({
    title: "Prioridade 3",
    detail:
      sleepRiskShare >= 35 || topTendency?.name.includes("Sono")
        ? "Inclua recuperação, descanso e fadiga na devolutiva para RH e liderança. O recorte mostra desgaste sustentado."
        : "Feche um plano de ação curto com responsáveis, prazo e nova leitura do mesmo recorte para comparar evolução.",
    tone: sleepRiskShare >= 35 ? "attention" : "positive",
  });

  return priorities;
}

function buildCompanyView(responses: ResponseRecord[], baselineResponses: ResponseRecord[] = responses): CompanyView {
  const perResponse = responses.map(computePerResponse);
  const baselinePerResponse = baselineResponses.map(computePerResponse);
  const dimensionScores = buildCompanyDimensions(perResponse);
  const sortedDimensions = [...dimensionScores].sort((a, b) => a.median - b.median);
  const overallAverages = perResponse.map((item) => item.overallAverage);
  const riskDistribution = buildRiskDistribution(perResponse);
  const tendencies = buildConditionSignals(perResponse).slice(0, 6);
  const conditionPrevalence = buildConditionSignals(perResponse).slice(0, 6);
  const indicatorBars = buildIndicatorBars(perResponse);
  const comparisonGroups = buildComparisonGroups(perResponse);
  const criticalSegments = buildCriticalSegments(comparisonGroups);
  const wellbeingIndex = round((median(overallAverages) / 5) * 100);
  const satisfactionScore = indicatorBars.find((item) => item.key === "satisfaction")?.value ?? 0;
  const burnoutRiskShare = percent(perResponse.filter((item) => getIndicatorMap(item).burnout >= 60).length, perResponse.length);
  const anxietyRiskShare = percent(perResponse.filter((item) => getIndicatorMap(item).anxiety >= 60).length, perResponse.length);
  const highRiskShare = percent(
    perResponse.filter((item) => item.riskBand === "Atenção alta" || item.riskBand === "Crítico").length,
    perResponse.length
  );
  const overloadShare = percent(
    perResponse.filter((item) => item.response.triage?.recentOverload === "sim").length,
    perResponse.length
  );
  const sleepRiskShare = percent(
    perResponse.filter(
      (item) => item.response.triage?.sleepQuality === "regular" || item.response.triage?.sleepQuality === "ruim"
    ).length,
    perResponse.length
  );
  const executiveSummary = buildExecutiveSummary({
    weakestDimension: sortedDimensions[0]?.dimension ?? "Demanda e Ritmo",
    highRiskShare,
    topTendency: tendencies[0],
    totalResponses: responses.length,
  });
  const priorityInsights = buildPriorityInsights({
    weakestDimension: sortedDimensions[0]?.dimension ?? "Demanda e Ritmo",
    highRiskShare,
    overloadShare,
    sleepRiskShare,
    burnoutRiskShare,
    anxietyRiskShare,
    topTendency: tendencies[0],
  });
  const diagnosticHypotheses = buildDiagnosticHypotheses({
    weakestDimension: sortedDimensions[0]?.dimension ?? "Demanda e Ritmo",
    burnoutRiskShare,
    anxietyRiskShare,
    overloadShare,
    topTendency: tendencies[0],
    responses,
  });
  const benchmarkMetrics = buildBenchmarkMetrics(perResponse, baselinePerResponse);
  const sampleAlerts = buildSampleAlerts({
    totalResponses: responses.length,
    comparisonGroups,
    criticalSegments,
  });
  const teamCounts = countByNormalizedValue(responses.map((response) => response.team));
  const roleCounts = countByNormalizedValue(responses.map((response) => response.role));
  const areaCounts = countByNormalizedValue(responses.map((response) => response.triage?.area));

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
    comparisonGroups,
    technicalResponseRows: perResponse
      .map((item) => ({
        id: item.response.id,
        pseudonymId: item.response.pseudonymId,
        submittedAt: item.response.submittedAt,
        team: item.response.team,
        role: item.response.role,
        area: item.response.triage?.area,
        overallAverage: item.overallAverage,
        riskBand: item.riskBand,
        weakestDimension: item.weakestDimension,
        strongestDimension: item.strongestDimension,
        protectedGroup:
          (item.response.team ? (teamCounts[item.response.team.trim()] ?? 0) < 3 : false) ||
          (item.response.role ? (roleCounts[item.response.role.trim()] ?? 0) < 3 : false) ||
          (item.response.triage?.area ? (areaCounts[item.response.triage.area.trim()] ?? 0) < 3 : false),
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
    highRiskShare,
    overloadShare,
    sleepRiskShare,
    conditionPrevalence,
    executiveSummary,
    priorityInsights,
    diagnosticHypotheses,
    benchmarkMetrics,
    sampleAlerts,
    criticalSegments,
  };
}

export function buildDashboardPayload(args: {
  responses: ResponseRecord[];
  baselineResponses?: ResponseRecord[];
  companyLabel: string;
  seats?: number;
  teamOptions?: string[];
  activeTeamFilter?: string;
  filterOptions?: CompanyFilterOptions;
  activeFilters?: CompanyFilters;
  ownerResponseId?: string;
  companyAccess?: CompanyAccessSnapshot | null;
  includeCompanyView?: boolean;
  allowedViews?: ViewMode[];
  defaultView?: ViewMode;
}): DashboardPayload {
  const {
    companyAccess = null,
    baselineResponses,
    companyLabel,
    includeCompanyView = true,
    teamOptions = [],
    activeTeamFilter = "all",
    filterOptions,
    activeFilters,
    ownerResponseId,
    responses,
    seats,
    allowedViews = ["company"],
    defaultView = "company",
  } = args;
  const owner = ownerResponseId ? responses.find((response) => response.id === ownerResponseId) : null;
  const individual = owner ? buildIndividualView(computePerResponse(owner)) : null;

  return {
    generatedAt: new Date().toISOString(),
    companyLabel,
    totalResponses: responses.length,
    participationRate: seats ? percent(responses.length, seats) : undefined,
    activeTeamFilter,
    teamOptions,
    activeFilters: activeFilters ?? {
      team: "all",
      area: "all",
      tenureBand: "all",
      workModel: "all",
      leadership: "all",
      publicExposure: "all",
      recentOverload: "all",
      sleepQuality: "all",
      energyLevel: "all",
      emotionalPressure: "all",
      motivationLevel: "all",
      socialIsolation: "all",
    },
    filterOptions: filterOptions ?? {
      team: [],
      area: [],
      areasByTeam: {},
      tenureBand: ["ate-3m", "3-12m", "1-3a", "3a-plus"],
      workModel: [],
      leadership: [],
      publicExposure: [],
      recentOverload: [],
      sleepQuality: [],
      energyLevel: [],
      emotionalPressure: [],
      motivationLevel: [],
      socialIsolation: [],
    },
    individual,
    companyView: includeCompanyView ? buildCompanyView(responses, baselineResponses ?? responses) : null,
    companyAccess: includeCompanyView ? companyAccess : null,
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
