import { ResponseRecord, TriageData } from "@/lib/storage";

export type TenureBand = "all" | "ate-3m" | "3-12m" | "1-3a" | "3a-plus";

export type CompanyFilters = {
  team: string;
  area: string;
  tenureBand: TenureBand;
  workModel: "all" | NonNullable<TriageData["workModel"]>;
  leadership: "all" | NonNullable<TriageData["leadership"]>;
  publicExposure: "all" | NonNullable<TriageData["publicExposure"]>;
  recentOverload: "all" | NonNullable<TriageData["recentOverload"]>;
  sleepQuality: "all" | NonNullable<TriageData["sleepQuality"]>;
  energyLevel: "all" | NonNullable<TriageData["energyLevel"]>;
  emotionalPressure: "all" | NonNullable<TriageData["emotionalPressure"]>;
  motivationLevel: "all" | NonNullable<TriageData["motivationLevel"]>;
  socialIsolation: "all" | NonNullable<TriageData["socialIsolation"]>;
};

export type CompanyFilterOptions = {
  team: string[];
  area: string[];
  tenureBand: TenureBand[];
  workModel: NonNullable<TriageData["workModel"]>[];
  leadership: NonNullable<TriageData["leadership"]>[];
  publicExposure: NonNullable<TriageData["publicExposure"]>[];
  recentOverload: NonNullable<TriageData["recentOverload"]>[];
  sleepQuality: NonNullable<TriageData["sleepQuality"]>[];
  energyLevel: NonNullable<TriageData["energyLevel"]>[];
  emotionalPressure: NonNullable<TriageData["emotionalPressure"]>[];
  motivationLevel: NonNullable<TriageData["motivationLevel"]>[];
  socialIsolation: NonNullable<TriageData["socialIsolation"]>[];
};

const DEFAULT_FILTERS: CompanyFilters = {
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
};

const FILTER_KEYS = Object.keys(DEFAULT_FILTERS) as Array<keyof CompanyFilters>;

function normalizeText(value: string | null) {
  return value?.trim() || "all";
}

function uniqueSorted(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).sort(
    (a, b) => a.localeCompare(b, "pt-BR")
  );
}

function uniqueOrdered<T extends string>(values: Array<T | undefined>, reference: readonly T[]) {
  const set = new Set(values.filter((value): value is T => Boolean(value)));
  return reference.filter((value) => set.has(value));
}

export function getDefaultCompanyFilters(): CompanyFilters {
  return { ...DEFAULT_FILTERS };
}

export function hasActiveCompanyFilters(filters: CompanyFilters) {
  return FILTER_KEYS.some((key) => filters[key] !== DEFAULT_FILTERS[key]);
}

export function getTenureBandLabel(tenureBand: TenureBand) {
  switch (tenureBand) {
    case "ate-3m":
      return "Até 3 meses";
    case "3-12m":
      return "3 a 12 meses";
    case "1-3a":
      return "1 a 3 anos";
    case "3a-plus":
      return "Mais de 3 anos";
    default:
      return "Todo o histórico";
  }
}

export function resolveTenureBand(tenureMonths?: number): TenureBand {
  if (typeof tenureMonths !== "number" || tenureMonths < 0) return "all";
  if (tenureMonths <= 3) return "ate-3m";
  if (tenureMonths <= 12) return "3-12m";
  if (tenureMonths <= 36) return "1-3a";
  return "3a-plus";
}

export function parseCompanyFiltersFromParams(params: URLSearchParams | ReadonlyURLSearchParams): CompanyFilters {
  return {
    team: normalizeText(params.get("team")),
    area: normalizeText(params.get("area")),
    tenureBand: (params.get("tenureBand")?.trim() as TenureBand) || "all",
    workModel: (params.get("workModel")?.trim() as CompanyFilters["workModel"]) || "all",
    leadership: (params.get("leadership")?.trim() as CompanyFilters["leadership"]) || "all",
    publicExposure: (params.get("publicExposure")?.trim() as CompanyFilters["publicExposure"]) || "all",
    recentOverload: (params.get("recentOverload")?.trim() as CompanyFilters["recentOverload"]) || "all",
    sleepQuality: (params.get("sleepQuality")?.trim() as CompanyFilters["sleepQuality"]) || "all",
    energyLevel: (params.get("energyLevel")?.trim() as CompanyFilters["energyLevel"]) || "all",
    emotionalPressure: (params.get("emotionalPressure")?.trim() as CompanyFilters["emotionalPressure"]) || "all",
    motivationLevel: (params.get("motivationLevel")?.trim() as CompanyFilters["motivationLevel"]) || "all",
    socialIsolation: (params.get("socialIsolation")?.trim() as CompanyFilters["socialIsolation"]) || "all",
  };
}

export function applyCompanyFiltersToParams(params: URLSearchParams, filters: CompanyFilters) {
  for (const key of FILTER_KEYS) {
    params.delete(key);
    if (filters[key] !== DEFAULT_FILTERS[key]) {
      params.set(key, filters[key]);
    }
  }
}

export function buildCompanyFilterOptions(responses: ResponseRecord[]): CompanyFilterOptions {
  return {
    team: uniqueSorted(responses.map((response) => response.team)),
    area: uniqueSorted(responses.map((response) => response.triage?.area)),
    tenureBand: ["ate-3m", "3-12m", "1-3a", "3a-plus"],
    workModel: uniqueOrdered(
      responses.map((response) => response.triage?.workModel),
      ["presencial", "hibrido", "remoto"]
    ),
    leadership: uniqueOrdered(
      responses.map((response) => response.triage?.leadership),
      ["sim", "nao"]
    ),
    publicExposure: uniqueOrdered(
      responses.map((response) => response.triage?.publicExposure),
      ["alta", "media", "baixa"]
    ),
    recentOverload: uniqueOrdered(
      responses.map((response) => response.triage?.recentOverload),
      ["sim", "nao"]
    ),
    sleepQuality: uniqueOrdered(
      responses.map((response) => response.triage?.sleepQuality),
      ["boa", "regular", "ruim"]
    ),
    energyLevel: uniqueOrdered(
      responses.map((response) => response.triage?.energyLevel),
      ["preservada", "oscilando", "esgotada"]
    ),
    emotionalPressure: uniqueOrdered(
      responses.map((response) => response.triage?.emotionalPressure),
      ["baixa", "media", "alta"]
    ),
    motivationLevel: uniqueOrdered(
      responses.map((response) => response.triage?.motivationLevel),
      ["preservada", "oscilando", "reduzida"]
    ),
    socialIsolation: uniqueOrdered(
      responses.map((response) => response.triage?.socialIsolation),
      ["nao", "pontual", "frequente"]
    ),
  };
}

export function filterResponsesByCompanyFilters(responses: ResponseRecord[], filters: CompanyFilters) {
  return responses.filter((response) => {
    const triage = response.triage;

    if (filters.team !== "all" && response.team?.trim() !== filters.team) return false;
    if (filters.area !== "all" && triage?.area?.trim() !== filters.area) return false;
    if (filters.tenureBand !== "all" && resolveTenureBand(triage?.tenureMonths) !== filters.tenureBand) return false;
    if (filters.workModel !== "all" && triage?.workModel !== filters.workModel) return false;
    if (filters.leadership !== "all" && triage?.leadership !== filters.leadership) return false;
    if (filters.publicExposure !== "all" && triage?.publicExposure !== filters.publicExposure) return false;
    if (filters.recentOverload !== "all" && triage?.recentOverload !== filters.recentOverload) return false;
    if (filters.sleepQuality !== "all" && triage?.sleepQuality !== filters.sleepQuality) return false;
    if (filters.energyLevel !== "all" && triage?.energyLevel !== filters.energyLevel) return false;
    if (filters.emotionalPressure !== "all" && triage?.emotionalPressure !== filters.emotionalPressure) return false;
    if (filters.motivationLevel !== "all" && triage?.motivationLevel !== filters.motivationLevel) return false;
    if (filters.socialIsolation !== "all" && triage?.socialIsolation !== filters.socialIsolation) return false;

    return true;
  });
}
