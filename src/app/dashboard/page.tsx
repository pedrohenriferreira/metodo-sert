"use client";

import type { ComponentType } from "react";
import { Suspense, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Ban, Calendar, Copy, Download, KeyRound, Layers3, Lock, RotateCcw, Settings2, ShieldAlert, SlidersHorizontal, Sparkles, Trash2, X } from "lucide-react";
import { BrandLogo } from "@/components/branding/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type {
  AreaBucket,
  ComparisonGroup,
  ComparisonGroupKind,
  CompanyView,
  ConditionSignal,
  DashboardPayload,
  DistributionSlice,
  HeatmapRow,
  IndicatorMetric,
  IndividualView,
  PathologyHeatmapRow,
  QuestionScore,
  ViewMode,
  BenchmarkMetric,
} from "@/lib/metrics";
import {
  applyCompanyFiltersToParams,
  getDefaultCompanyFilters,
  getTenureBandLabel,
  hasActiveCompanyFilters,
  parseCompanyFiltersFromParams,
  type CompanyFilters,
  type TenureBand,
} from "@/lib/dashboard-filters";
import { dimensionDescriptions, Dimension } from "@/lib/questions";
import { cn } from "@/lib/utils";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, XAxis, YAxis } from "recharts";

const gradientByDimension: Record<Dimension, string> = {
  "Demanda e Ritmo": "from-[var(--primary)] to-[var(--foreground)]",
  "Clareza e Autonomia": "from-[var(--primary)] to-[#d8e8e7]",
  Reconhecimento: "from-[var(--primary)] to-[#edf4f7]",
  Relacionamentos: "from-[var(--foreground)] to-[var(--primary)]",
  "Segurança Psicológica": "from-[#dfeeed] to-[var(--primary)]",
  "Suporte Organizacional": "from-[var(--foreground)] to-[#89b8b6]",
};

const badgeByDimension: Record<Dimension, string> = {
  "Demanda e Ritmo": "border-[var(--border)] bg-[var(--accent)] text-[var(--foreground)]",
  "Clareza e Autonomia": "border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)]",
  Reconhecimento: "border-[var(--border)] bg-[var(--accent)] text-[var(--foreground)]",
  Relacionamentos: "border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)]",
  "Segurança Psicológica": "border-[var(--border)] bg-[var(--accent)] text-[var(--foreground)]",
  "Suporte Organizacional": "border-[var(--border)] bg-[var(--accent)] text-[var(--foreground)]",
};

const categoryLabels = {
  burnout: "Burnout",
  anxiety: "Ansiedade",
  depression: "Depressão",
  stress: "Estresse",
  satisfaction: "Satisfação",
} as const;

const categoryColors = {
  burnout: "var(--foreground)",
  anxiety: "var(--primary)",
  depression: "var(--muted-foreground)",
  stress: "#9fc4c3",
  satisfaction: "#d7e7e8",
} as const;

const donutColors = ["var(--primary)", "#d7e7e8", "var(--foreground)"];

const companyChartConfig = {
  burnout: { label: "Burnout", color: categoryColors.burnout },
  anxiety: { label: "Ansiedade", color: categoryColors.anxiety },
  depression: { label: "Depressão", color: categoryColors.depression },
  stress: { label: "Estresse", color: categoryColors.stress },
  satisfaction: { label: "Satisfação", color: categoryColors.satisfaction },
} satisfies ChartConfig;

const triageLabels = {
  workModel: { presencial: "Presencial", remoto: "Remoto", hibrido: "Híbrido" },
  shift: { diurno: "Diurno", noturno: "Noturno", turnos: "Turnos/escala" },
  leadership: { sim: "Lidera pessoas", nao: "Sem liderança formal" },
  publicExposure: { alta: "Exposição alta", media: "Exposição média", baixa: "Exposição baixa" },
  recentOverload: { sim: "Sobrecarga recente", nao: "Sem sobrecarga recente" },
  sleepQuality: { boa: "Sono bom", regular: "Sono regular", ruim: "Sono ruim" },
  energyLevel: { preservada: "Energia preservada", oscilando: "Energia oscilando", esgotada: "Energia esgotada" },
  emotionalPressure: { baixa: "Pressão emocional baixa", media: "Pressão emocional média", alta: "Pressão emocional alta" },
  motivationLevel: { preservada: "Motivação preservada", oscilando: "Motivação oscilando", reduzida: "Motivação reduzida" },
  socialIsolation: { nao: "Sem isolamento", pontual: "Isolamento pontual", frequente: "Isolamento frequente" },
} as const;

type SavedFilterPreset = {
  id: string;
  name: string;
  filters: CompanyFilters;
  savedAt: string;
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoadingState />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewMode>((searchParams.get("panelView") as ViewMode) || "company");
  const [blocked, setBlocked] = useState(false);

  const viewKey = searchParams.get("view") ?? "";
  const memberToken = searchParams.get("memberToken") ?? "";
  const accessToken = searchParams.get("accessToken") ?? "";
  const companyId = searchParams.get("companyId") ?? "";
  const adminScope = searchParams.get("adminScope") ?? "";
  const companyFilters = useMemo(() => parseCompanyFiltersFromParams(searchParams), [searchParams]);
  const tabFromUrl = searchParams.get("tab") ?? "panorama";
  const compareKindFromUrl = (searchParams.get("compareKind") as ComparisonGroupKind) || "team";
  const compareAFromUrl = searchParams.get("compareA") ?? "";
  const compareBFromUrl = searchParams.get("compareB") ?? "";

  const updateUrlParams = useCallback((mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const href = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(href, { scroll: false });
  }, [pathname, router, searchParams]);

  const buildDashboardParams = useCallback((filters: CompanyFilters) => {
    const params = new URLSearchParams();
    if (viewKey) params.set("viewKey", viewKey);
    if (memberToken) params.set("memberToken", memberToken);
    if (accessToken) params.set("accessToken", accessToken);
    if (companyId) params.set("companyId", companyId);
    if (adminScope) params.set("adminScope", adminScope);
    applyCompanyFiltersToParams(params, filters);
    return params;
  }, [accessToken, adminScope, companyId, memberToken, viewKey]);

  function syncFiltersToUrl(filters: CompanyFilters) {
    updateUrlParams((params) => {
      applyCompanyFiltersToParams(params, filters);
    });
  }

  async function loadDashboard() {
    const params = buildDashboardParams(companyFilters);
    const endpoint = `/api/responses?${params.toString()}`;
    const response = await fetch(endpoint);

    if (!response.ok) {
      setPayload(null);
      setBlocked(true);
      setStatus("Acesso restrito: confirme o token correto ou acesse pelo painel administrativo.");
      return;
    }

      const data = (await response.json()) as DashboardPayload;
      setPayload(data);
      setActiveView((searchParams.get("panelView") as ViewMode) || data.defaultView);
    setBlocked(false);
    setStatus(null);
  }

  useEffect(() => {
    let cancelled = false;

    async function hydrateDashboard() {
      const params = buildDashboardParams(companyFilters);
      const endpoint = `/api/responses?${params.toString()}`;
      const response = await fetch(endpoint);
      if (cancelled) return;

      if (!response.ok) {
        setPayload(null);
        setBlocked(true);
        setStatus("Acesso restrito: confirme o token correto ou acesse pelo painel administrativo.");
        return;
      }

      const data = (await response.json()) as DashboardPayload;
      if (cancelled) return;

      setPayload(data);
      setActiveView((searchParams.get("panelView") as ViewMode) || data.defaultView);
      setBlocked(false);
      setStatus(null);
    }

    void hydrateDashboard();

    return () => {
      cancelled = true;
    };
  }, [buildDashboardParams, companyFilters, searchParams]);

  const availableViews = useMemo(() => {
    if (!payload) return [] as Array<{ id: ViewMode; label: string; description: string }>;

    const registry: Record<ViewMode, { label: string; description: string }> = {
      individual: {
        label: "Visão membro",
        description: "Acesso individual protegido pelo token utilizado na resposta.",
      },
      company: {
        label: "Visão empresa",
        description: "Painel executivo para diretoria/RH com indicadores organizacionais.",
      },
    };

    return payload.allowedViews.map((id) => ({ id, ...registry[id] }));
  }, [payload]);

  const resolvedActiveView = availableViews.some((view) => view.id === activeView)
    ? activeView
    : payload?.defaultView ?? availableViews[0]?.id ?? "company";

  if (blocked && !payload) {
    return (
      <BlockedCard
        title="Acesso restrito"
        message={status ?? "Use o token correto ou acesse pelo admin para abrir esta visão."}
        action={() => router.push("/form")}
      />
    );
  }

  return (
    <div className="shell-page brand-shell min-h-screen text-[var(--foreground)]">
      {payload && (
        <div className="w-full px-0 py-0">
          <>
            {status && (
              <div className="px-4 pt-4 lg:px-6 lg:pt-6">
                <Card className="frost-card rounded-[24px] border-[var(--border)] bg-[var(--accent)] text-[var(--foreground)] shadow-sm">
                  <CardContent className="p-4 text-sm">{status}</CardContent>
                </Card>
              </div>
            )}
            {resolvedActiveView === "individual" && payload.individual && (
              <IndividualSection individual={payload.individual} />
            )}
            {resolvedActiveView === "company" && payload.companyView && (
              <CompanySection
                companyView={payload.companyView}
                companyAccess={payload.companyAccess ?? null}
                companyLabel={payload.companyLabel}
                accessToken={accessToken}
                onRefresh={loadDashboard}
                activeFilters={companyFilters}
                filterOptions={payload.filterOptions}
                activeTab={tabFromUrl}
                comparisonKindFromUrl={compareKindFromUrl}
                comparisonGroupAFromUrl={compareAFromUrl}
                comparisonGroupBFromUrl={compareBFromUrl}
                onChangeFilters={(nextFilters) => {
                  syncFiltersToUrl(nextFilters);
                }}
                onChangeTab={(tab) => updateUrlParams((params) => {
                  params.set("tab", tab);
                })}
                onChangeComparisonState={(next) => updateUrlParams((params) => {
                  params.set("compareKind", next.kind);
                  if (next.groupAId) params.set("compareA", next.groupAId);
                  else params.delete("compareA");
                  if (next.groupBId) params.set("compareB", next.groupBId);
                  else params.delete("compareB");
                })}
              />
            )}
          </>
        </div>
      )}
    </div>
  );
}

function DashboardLoadingState() {
  return (
    <div className="shell-page brand-shell min-h-screen px-6 py-10">
      <Card className="frost-card mx-auto w-full max-w-3xl border-[var(--border)] bg-[rgba(255,255,255,0.82)] shadow-sm">
        <CardContent className="p-6 text-sm text-[var(--muted-foreground)]">
          Carregando dashboard...
        </CardContent>
      </Card>
    </div>
  );
}

function IndividualSection({ individual }: { individual: IndividualView }) {
  const triagePills = buildTriagePills(individual);

  return (
    <div className="space-y-8 lg:space-y-10">
      <Card className="bg-[var(--accent)]">
        <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted-foreground)]">Leitura protegida</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">Leitura individual protegida</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)] md:text-base">
            Este painel mostra os principais sinais da sua resposta individual e destaca dimensões de maior atenção e proteção.
          </p>
        </div>
        <div className="group relative inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm">
          <Lock className="h-4 w-4 text-[var(--muted-foreground)]" />
          <span>Visão membro</span>
          <div className="pointer-events-none absolute right-0 top-[calc(100%+10px)] z-20 hidden w-72 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-xs leading-6 text-[var(--muted-foreground)] shadow-[0_16px_40px_rgba(44,62,80,0.12)] group-hover:block group-focus-within:block">
            Esta visão individual só pode ser reaberta com o mesmo token usado na avaliação ou por uma sessão administrativa autorizada da empresa.
          </div>
        </div>
        </CardContent>
      </Card>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Índice individual" value={individual.overallAverage.toFixed(2)} helper="Escala 1-5" variant="individual" />
        <KpiCard
          label="Faixa de risco"
          value={individual.riskBand}
          helper="Leitura individual"
          valueClassName="max-w-full text-[1.55rem] leading-tight md:text-[1.8rem] xl:text-[2.1rem] whitespace-normal break-normal"
          variant="individual"
        />
        <KpiCard
          label="Maior atenção"
          value={individual.weakestDimension}
          helper="Dimensão mais sensível"
          valueClassName="max-w-full text-[1.55rem] leading-tight md:text-[1.8rem] xl:text-[2.1rem] whitespace-normal break-normal"
          variant="individual"
        />
        <KpiCard
          label="Maior proteção"
          value={individual.strongestDimension}
          helper="Dimensão mais preservada"
          valueClassName="max-w-full text-[1.55rem] leading-tight md:text-[1.8rem] xl:text-[2.1rem] whitespace-normal break-normal"
          variant="individual"
        />
      </section>

      <section className="grid gap-10 xl:grid-cols-[1.05fr_0.95fr] xl:items-start">
        <Card>
          <CardHeader className="space-y-3 pb-2">
            <CardTitle className="text-xl">Mapa individual por dimensão</CardTitle>
            <CardDescription>Leitura das dimensões psicossociais reportadas nesta resposta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-4 pb-6">
            <div className="flex flex-wrap gap-2">
              {triagePills.map((pill) => (
                <Badge key={pill} variant="outline">{pill}</Badge>
              ))}
            </div>
            <div className="space-y-4">
              {individual.dimensionScores.map((dimension) => (
                <DimensionBar key={dimension.dimension} dimension={dimension.dimension} score={dimension.average} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-3 pb-2">
            <CardTitle className="text-xl">Sinais prioritários</CardTitle>
            <CardDescription>Hipóteses de leitura clínica organizadas por intensidade estimada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4 pb-6">
            <div className="space-y-4">
              {individual.alerts.map((alert) => (
                <div key={alert} className="rounded-xl border border-[var(--border)] bg-[var(--accent)] px-4 py-4 text-sm leading-6">
                  {alert}
                </div>
              ))}
            </div>
            <ConditionGrid signals={individual.tendencies} compact />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function CompanySection({
  companyView,
  companyAccess,
  companyLabel,
  accessToken,
  onRefresh,
  activeFilters,
  filterOptions,
  activeTab: activeTabFromUrl,
  comparisonKindFromUrl,
  comparisonGroupAFromUrl,
  comparisonGroupBFromUrl,
  onChangeFilters,
  onChangeTab,
  onChangeComparisonState,
}: {
  companyView: CompanyView;
  companyAccess: DashboardPayload["companyAccess"];
  companyLabel: string;
  accessToken: string;
  onRefresh: () => Promise<void>;
  activeFilters: CompanyFilters;
  filterOptions: DashboardPayload["filterOptions"];
  activeTab: string;
  comparisonKindFromUrl: ComparisonGroupKind;
  comparisonGroupAFromUrl: string;
  comparisonGroupBFromUrl: string;
  onChangeFilters: (filters: CompanyFilters) => void;
  onChangeTab: (tab: string) => void;
  onChangeComparisonState: (state: { kind: ComparisonGroupKind; groupAId: string; groupBId: string }) => void;
}) {
  const [savedPresets, setSavedPresets] = useState<SavedFilterPreset[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(`dashboard-saved-filters:${companyLabel}`);
      return raw ? (JSON.parse(raw) as SavedFilterPreset[]) : [];
    } catch {
      return [];
    }
  });
  const [filtersExpanded, setFiltersExpanded] = useState(() => hasActiveCompanyFilters(activeFilters));
  const [tokenAdminOpen, setTokenAdminOpen] = useState(false);
  const [technicalQuery, setTechnicalQuery] = useState("");
  const deferredTechnicalQuery = useDeferredValue(technicalQuery);
  const activeFilterChips = buildActiveFilterChips(activeFilters);
  const tabItems = [
    { id: "panorama", label: "Panorama executivo", icon: Sparkles },
    { id: "visao-geral", label: "Visão geral", icon: Layers3 },
    { id: "diagnostico", label: "Diagnóstico", icon: ShieldAlert },
    { id: "recortes", label: "Recortes", icon: SlidersHorizontal },
    { id: "tecnico", label: "Camada técnica", icon: Settings2 },
  ] as const;
  const availableComparisonKinds = getAvailableComparisonKinds(companyView.comparisonGroups);
  const resolvedComparisonKind = availableComparisonKinds.includes(comparisonKindFromUrl)
    ? comparisonKindFromUrl
    : availableComparisonKinds[0] ?? "team";
  const comparisonGroupsForKind = companyView.comparisonGroups.filter((group) => group.kind === resolvedComparisonKind);
  const defaultComparisonSelection = getDefaultComparisonSelection(comparisonGroupsForKind);
  const resolvedComparisonGroupA = comparisonGroupsForKind.some((group) => group.id === comparisonGroupAFromUrl)
    ? comparisonGroupAFromUrl
    : defaultComparisonSelection?.groupAId ?? "";
  const resolvedComparisonGroupB = comparisonGroupsForKind.some(
    (group) => group.id === comparisonGroupBFromUrl && group.id !== resolvedComparisonGroupA
  )
    ? comparisonGroupBFromUrl
    : defaultComparisonSelection?.groupAId === resolvedComparisonGroupA
      ? defaultComparisonSelection.groupBId
      : comparisonGroupsForKind.find((group) => group.id !== resolvedComparisonGroupA)?.id ?? "";
  const filteredTechnicalRows = useMemo(() => {
    const query = deferredTechnicalQuery.trim().toLowerCase();
    if (!query) return companyView.technicalResponseRows;
    return companyView.technicalResponseRows.filter((row) =>
      [
        row.pseudonymId ?? row.id,
        row.team ?? "",
        row.role ?? "",
        row.area ?? "",
        row.weakestDimension,
        row.riskBand,
      ].some((value) => value.toLowerCase().includes(query))
    );
  }, [companyView.technicalResponseRows, deferredTechnicalQuery]);
  const activeTabMeta = tabItems.find((item) => item.id === activeTabFromUrl) ?? tabItems[0];
  const headlineMetrics = [
    {
      label: "Score geral",
      value: `${companyView.wellbeingIndex.toFixed(0)}%`,
      helper: "Bem-estar",
    },
    {
      label: "Participação",
      value: companyAccess ? `${Math.round((companyAccess.usedTokens / Math.max(companyAccess.totalTokens, 1)) * 100)}%` : `${companyView.totalResponses}`,
      helper: companyAccess ? `${companyAccess.usedTokens}/${companyAccess.totalTokens} convites` : "Base",
    },
    {
      label: "Casos críticos",
      value: `${companyView.highRiskShare.toFixed(0)}%`,
      helper: "Alta atenção",
    },
    {
      label: "Setores com leitura",
      value: `${new Set(companyView.segmentSnapshots.map((segment) => segment.segment)).size || companyView.comparisonGroups.length}`,
      helper: "Recortes",
    },
  ];
  const panoramaMetrics = [
    { label: "Mediana", value: companyView.overallMedian.toFixed(2), helper: "Escala 1-5" },
    { label: "Média", value: companyView.overallAverage.toFixed(2), helper: "Escala 1-5" },
    { label: "Maior atenção", value: companyView.weakestDimension, helper: "Dimensão" },
    { label: "Maior proteção", value: companyView.strongestDimension, helper: "Dimensão" },
    { label: "Sobrecarga", value: `${companyView.overloadShare.toFixed(0)}%`, helper: "Triagem" },
    { label: "Sono em risco", value: `${companyView.sleepRiskShare.toFixed(0)}%`, helper: "Triagem" },
  ];
  const shouldShowFilters = filtersExpanded || activeFilterChips.length > 0;

  function persistPresets(nextPresets: SavedFilterPreset[]) {
    setSavedPresets(nextPresets);
    window.localStorage.setItem(`dashboard-saved-filters:${companyLabel}`, JSON.stringify(nextPresets));
  }

  function saveCurrentPreset() {
    const name = window.prompt("Nome do recorte salvo:");
    if (!name?.trim()) return;
    const nextPreset: SavedFilterPreset = {
      id: crypto.randomUUID(),
      name: name.trim(),
      filters: activeFilters,
      savedAt: new Date().toISOString(),
    };
    persistPresets([nextPreset, ...savedPresets].slice(0, 8));
  }

  function deletePreset(presetId: string) {
    persistPresets(savedPresets.filter((preset) => preset.id !== presetId));
  }

  return (
    <Tabs value={activeTabFromUrl} onValueChange={onChangeTab} className="space-y-0">
      <SidebarProvider defaultOpen>
        <div className="overflow-hidden rounded-[2rem] border border-[rgba(255,255,255,0.58)] bg-[rgba(255,255,255,0.56)] shadow-[0_28px_90px_rgba(19,34,56,0.08)] backdrop-blur-xl">
          <div className="grid min-h-[calc(100vh-11rem)] xl:grid-cols-[288px_minmax(0,1fr)]">
            <Sidebar className="brand-grid hidden border-r border-[rgba(255,255,255,0.54)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(241,246,248,0.82)_100%)] xl:flex xl:w-[288px]">
              <SidebarHeader className="space-y-5 border-b border-[rgba(19,34,56,0.08)] px-6 py-6">
                <BrandLogo compact />
                <Card className="frost-card rounded-[1.4rem] border-[rgba(255,255,255,0.5)] bg-white/82 shadow-none">
                  <CardContent className="space-y-3 p-4">
                    <div>
                      <p className="text-lg font-semibold text-[var(--foreground)]">{companyLabel}</p>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {companyView.totalResponses} colaboradores no recorte atual
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <SidebarMetric label="Base" value={`${companyView.totalResponses}`} />
                      <SidebarMetric label="Filtros" value={`${activeFilterChips.length}`} />
                    </div>
                  </CardContent>
                </Card>
              </SidebarHeader>

              <SidebarContent className="space-y-6 px-4 py-5">
                <SidebarMenu className="space-y-2">
                  {tabItems.map((item) => {
                    const Icon = item.icon;

                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton isActive={activeTabFromUrl === item.id} onClick={() => onChangeTab(item.id)}>
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>

                <Card className="frost-card rounded-[1.5rem] border-[rgba(255,255,255,0.5)] bg-white/82 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Recorte ativo</CardTitle>
                    <CardDescription>{activeFilterChips.length ? "Base filtrada" : "Base consolidada"}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {activeFilterChips.length ? activeFilterChips.map((chip) => (
                        <Badge key={chip} variant="secondary" className="rounded-full">
                          {chip}
                        </Badge>
                      )) : (
                        <Badge variant="outline" className="rounded-full">Sem filtros</Badge>
                      )}
                    </div>
                    <Button variant="outline" className="w-full justify-between" onClick={() => setFiltersExpanded((value) => !value)}>
                      <span>Refinar visão</span>
                      <SlidersHorizontal className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </SidebarContent>

              <SidebarFooter className="space-y-3 border-t border-[rgba(19,34,56,0.08)] px-4 py-4">
                {activeFilterChips.length > 0 ? (
                  <Button variant="ghost" className="w-full justify-start" onClick={() => onChangeFilters(getDefaultCompanyFilters())}>
                    <RotateCcw className="h-4 w-4" />
                    Limpar filtros
                  </Button>
                ) : null}
              </SidebarFooter>
            </Sidebar>

            <SidebarInset className="brand-grid min-w-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(244,248,249,0.9))]">
              <div className="space-y-6 p-4 md:p-6 xl:p-8">
                <Card className="frost-card overflow-hidden rounded-[1.75rem] border-[rgba(255,255,255,0.56)] bg-white/84 shadow-none">
                  <CardContent className="space-y-6 p-6">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--foreground)] md:text-4xl">
                          {activeTabMeta.label}
                        </h2>
                      </div>

                      {activeTabFromUrl === "panorama" ? (
                        <div className="flex flex-col gap-3 md:items-end">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={() => setFiltersExpanded((value) => !value)}>
                              <SlidersHorizontal className="h-4 w-4" />
                              Filtros
                            </Button>
                            {companyAccess ? (
                              <Button variant="outline" onClick={() => exportTokensCsv(companyAccess, companyLabel)}>
                                <Download className="h-4 w-4" />
                                Exportar tokens
                              </Button>
                            ) : null}
                            <Button variant="outline" onClick={() => window.print()}>
                              <Download className="h-4 w-4" />
                              Exportar painel
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <MiniMetric icon={Calendar} label="Atualização" value={new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} />
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {activeTabFromUrl === "panorama" ? (
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {headlineMetrics.map((metric) => (
                          <HeroMetricCard
                            key={metric.label}
                            label={metric.label}
                            value={metric.value}
                            helper={metric.helper}
                          />
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <div className="xl:hidden">
                  <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-[1.5rem] bg-white/80 p-2 md:grid-cols-5">
                    {tabItems.map((item) => (
                      <TabsTrigger key={item.id} value={item.id} className="rounded-[1rem] py-2.5">
                        {item.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {shouldShowFilters ? (
                  <CompanyFilterPanel
                    activeFilters={activeFilters}
                    activeFilterChips={activeFilterChips}
                    filterOptions={filterOptions}
                    onChangeFilters={onChangeFilters}
                    sampleSize={companyView.totalResponses}
                  />
                ) : null}

                <TabsContent value="panorama" className="space-y-8">
        <SectionHeader
          title="Panorama executivo"
        />

        {companyAccess && (
          <section className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
              <KpiCard label="Respostas" value={`${companyView.totalResponses}`} helper="Base respondida" />
              <KpiCard label="Tokens totais" value={`${companyAccess.totalTokens}`} helper="Convites emitidos" />
              <KpiCard label="Disponíveis" value={`${companyAccess.availableTokens}`} helper="Tokens livres" />
              <KpiCard label="Usados" value={`${companyAccess.usedTokens}`} helper="Tokens consumidos" />
              <KpiCard label="Alertas" value={`${companyAccess.alertCount}`} helper="Alta atenção + crítico" />
            </div>

            <Card className="rounded-[1.75rem] border-[rgba(19,34,56,0.08)] bg-white/92 shadow-none">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-xl">Acesso e distribuição de tokens</CardTitle>
                  <CardDescription>
                    Tokens institucionais e individuais com cópia rápida e trilha de operação no mesmo card.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setTokenAdminOpen(true)}>
                  <Settings2 className="h-4 w-4" />
                  Gerenciar tokens
                </Button>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-5">
                  <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                    <ShieldAlert className="h-4 w-4 text-[var(--primary)]" />
                    Visão empresa
                  </div>
                    <div className="flex flex-wrap gap-2">
                    {companyAccess.companyTokens.map((token) => (
                      <TokenChip key={token.value} value={token.value} used={token.used} active={token.active} />
                    ))}
                  </div>
                </div>

                  <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                    <KeyRound className="h-4 w-4 text-[var(--primary)]" />
                    Tokens individuais
                  </div>
                    <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-1">
                    {companyAccess.memberTokens.map((token) => (
                      <TokenChip key={token.value} value={token.value} used={token.used} active={token.active} />
                    ))}
                  </div>
                </div>
                </div>
              </CardContent>
            </Card>

            <TokenOperationsModal
              accessToken={accessToken}
              companyAccess={companyAccess}
              companyLabel={companyLabel}
              onClose={() => setTokenAdminOpen(false)}
              onRefresh={onRefresh}
              open={tokenAdminOpen}
            />
          </section>
        )}

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-[1.75rem] border-[rgba(19,34,56,0.08)] bg-white/92 shadow-none">
            <CardHeader>
              <CardTitle className="text-xl">Leitura do recorte</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {panoramaMetrics.map((metric) => (
                <KpiCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  helper={metric.helper}
                  valueClassName={metric.label.includes("Maior") ? "text-[1.6rem] leading-tight md:text-[1.9rem]" : undefined}
                />
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-[rgba(19,34,56,0.08)] bg-white/92 shadow-none">
            <CardHeader>
              <CardTitle className="text-xl">Comparativo com a base total</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {companyView.benchmarkMetrics.slice(0, 4).map((metric) => (
                <BenchmarkCard key={metric.label} metric={metric} />
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-[1.75rem] border-[rgba(19,34,56,0.08)] bg-white/92 shadow-none">
            <CardHeader>
              <CardTitle className="text-xl">Top 3 recortes críticos</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {companyView.criticalSegments.length ? companyView.criticalSegments.map((segment, index) => (
                <div key={segment.id} className="rounded-[1.3rem] border border-[var(--border)] bg-[var(--accent)] px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">{index + 1}. {segment.label}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">{segment.weakestDimension}</p>
                    </div>
                    <Badge variant="outline" className="rounded-full">{segment.riskBand}</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <SidebarMetric label="Base" value={`${segment.count}`} />
                    <SidebarMetric label="Mediana" value={segment.overallMedian.toFixed(2)} />
                  </div>
                </div>
              )) : (
                <p className="text-sm text-[var(--muted-foreground)]">Sem base comparável suficiente.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-[rgba(19,34,56,0.08)] bg-white/92 shadow-none">
            <CardHeader>
              <CardTitle className="text-xl">Alertas de amostra</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {companyView.sampleAlerts.map((alert) => (
                <InsightCard key={alert.title} title={alert.title} detail={alert.detail} tone={alert.tone} />
              ))}
            </CardContent>
          </Card>
        </section>
      </TabsContent>

                <TabsContent value="visao-geral" className="space-y-8">
        <SectionHeader
          title="Indicadores centrais"
        />

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Índice de bem-estar" value={`${companyView.wellbeingIndex.toFixed(0)}%`} helper="Mediana convertida em índice executivo" />
          <KpiCard label="% risco de burnout" value={`${companyView.burnoutRiskShare.toFixed(0)}%`} helper="Base com intensidade alta para burnout" />
          <KpiCard label="Satisfação" value={`${companyView.satisfactionScore.toFixed(0)}%`} helper="Leitura agregada de satisfação percebida" />
          <KpiCard label="% ansiedade" value={`${companyView.anxietyRiskShare.toFixed(0)}%`} helper="Base com intensidade alta para ansiedade ocupacional" />
        </section>

        <Card className="rounded-[1.75rem] border-[rgba(19,34,56,0.08)] bg-white/92 shadow-none">
          <CardHeader>
            <CardTitle className="text-xl">Comparação rápida com a base total</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {companyView.benchmarkMetrics.map((metric) => (
              <BenchmarkCard key={metric.label} metric={metric} />
            ))}
          </CardContent>
        </Card>

        <section className="grid gap-10 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-[1.75rem] border-[rgba(19,34,56,0.08)] bg-white/92 shadow-none">
            <CardHeader>
              <CardTitle className="text-xl">Indicadores por categoria</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              <IndicatorBarChart items={companyView.indicatorBars} />
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-[rgba(19,34,56,0.08)] bg-white/92 shadow-none">
            <CardHeader>
              <CardTitle className="text-xl">Distribuição de risco</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              <RiskDonutChart slices={companyView.riskDonut} />
            </CardContent>
          </Card>
        </section>
      </TabsContent>

                <TabsContent value="diagnostico" className="space-y-8">
        <SectionHeader
          title="Diagnóstico"
        />

        <section className="grid gap-10 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Card className="rounded-[1.75rem] border-[rgba(19,34,56,0.08)] bg-white/92 shadow-none">
            <CardHeader>
              <CardTitle className="text-xl">Perfil psicológico organizacional</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              <RadarProfileChart dimensions={companyView.dimensionScores} />
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-[rgba(19,34,56,0.08)] bg-white/92 shadow-none">
            <CardHeader>
              <CardTitle className="text-xl">Distribuição de bem-estar</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              <WellbeingAreaChart buckets={companyView.wellbeingArea} />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-10 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-[1.75rem] border-[rgba(19,34,56,0.08)] bg-white/92 shadow-none">
            <CardHeader>
              <CardTitle className="text-xl">Leitura guiada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                {companyView.insights.map((insight) => (
                  <InsightCard key={insight.title} title={insight.title} detail={insight.detail} tone={insight.tone} />
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {companyView.diagnosticHypotheses.map((insight) => (
                  <InsightCard key={insight.title} title={insight.title} detail={insight.detail} tone={insight.tone} />
                ))}
              </div>
              <ConditionGrid signals={companyView.tendencies.filter((signal) => !signal.name.includes("Satisfação"))} />
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-[rgba(19,34,56,0.08)] bg-white/92 shadow-none">
            <CardHeader>
              <CardTitle className="text-xl">Fatores críticos da escala</CardTitle>
            </CardHeader>
            <CardContent>
              <QuestionTable rows={companyView.questionScores} />
            </CardContent>
          </Card>
        </section>
      </TabsContent>

                <TabsContent value="recortes" className="space-y-8">
        <SectionHeader
          title="Recortes"
        />

        <GroupComparisonCard
          groups={companyView.comparisonGroups}
          comparisonKind={resolvedComparisonKind}
          availableKinds={availableComparisonKinds}
          groupAId={resolvedComparisonGroupA}
          groupBId={resolvedComparisonGroupB}
          onChangeComparisonKind={(value) => {
            const nextGroups = companyView.comparisonGroups.filter((group) => group.kind === value);
            onChangeComparisonState({
              kind: value,
              groupAId: nextGroups[0]?.id ?? "",
              groupBId: nextGroups[1]?.id ?? "",
            });
          }}
          onChangeGroupA={(value) =>
            onChangeComparisonState({
              kind: resolvedComparisonKind,
              groupAId: value,
              groupBId: resolvedComparisonGroupB,
            })
          }
          onChangeGroupB={(value) =>
            onChangeComparisonState({
              kind: resolvedComparisonKind,
              groupAId: resolvedComparisonGroupA,
              groupBId: value,
            })
          }
        />

          <Card className="rounded-[1.75rem] border-[rgba(19,34,56,0.08)] bg-white/92 shadow-none">
            <CardHeader>
              <div>
                <CardTitle className="text-xl">Recortes salvos</CardTitle>
              </div>
            </CardHeader>
          <CardContent className="space-y-3">
            {savedPresets.length ? savedPresets.map((preset) => (
              <div key={preset.id} className="flex flex-col gap-3 rounded-[1.2rem] border border-[var(--border)] bg-[var(--accent)] px-4 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">{preset.name}</p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Salvo em {new Date(preset.savedAt).toLocaleDateString("pt-BR")} · {buildActiveFilterChips(preset.filters).join(" · ") || "Sem filtros"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onChangeFilters(preset.filters)}>Aplicar</Button>
                  <Button variant="ghost" size="sm" onClick={() => deletePreset(preset.id)}>Excluir</Button>
                </div>
              </div>
            )) : (
              <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                Nenhum recorte salvo ainda. Use isso para guardar cortes como liderança, onboarding, remoto ou exposição alta ao público.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-[rgba(19,34,56,0.08)] bg-white/92 shadow-none">
          <CardHeader>
            <CardTitle className="text-xl">Heatmap de incidência por cargo / função / time</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 overflow-hidden pt-2 pb-3">
            <PathologyHeatmapChart rows={companyView.pathologyHeatmap} />
          </CardContent>
        </Card>

        <section className="grid gap-10 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Card className="rounded-[1.75rem] border-[rgba(19,34,56,0.08)] bg-white/92 shadow-none">
            <CardHeader>
              <CardTitle className="text-xl">Recortes relevantes</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              <SegmentTable rows={companyView.segmentSnapshots} />
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-[rgba(19,34,56,0.08)] bg-white/92 shadow-none">
            <CardHeader>
              <CardTitle className="text-xl">Heatmap dimensional complementar</CardTitle>
            </CardHeader>
            <CardContent className="min-w-0 overflow-hidden pt-2 pb-3">
              <Heatmap rows={companyView.heatmap} />
            </CardContent>
          </Card>
        </section>
      </TabsContent>

                <TabsContent value="tecnico" className="space-y-8">
        <SectionHeader
          title="Camada técnica"
        />

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Alta atenção" value={`${companyView.highRiskShare.toFixed(0)}%`} helper="Atenção alta + crítico" />
          <KpiCard label="Sobrecarga recente" value={`${companyView.overloadShare.toFixed(0)}%`} helper="Relato direto na triagem" />
          <KpiCard label="Sono comprometido" value={`${companyView.sleepRiskShare.toFixed(0)}%`} helper="Sono regular ou ruim" />
          <KpiCard label="Base técnica" value={`${companyView.technicalResponseRows.length}`} helper="Respondentes disponíveis" />
        </section>

        <section className="grid gap-10 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
          <Card className="rounded-[1.75rem] border-[rgba(19,34,56,0.08)] bg-white/92 shadow-none">
            <CardHeader>
              <CardTitle className="text-xl">Prevalência técnica de sinais</CardTitle>
            </CardHeader>
            <CardContent>
              <ConditionGrid signals={companyView.conditionPrevalence} />
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-[rgba(19,34,56,0.08)] bg-white/92 shadow-none">
            <CardHeader>
              <CardTitle className="text-xl">Heatmap individual por dimensão</CardTitle>
            </CardHeader>
            <CardContent className="min-w-0 overflow-hidden">
              <Heatmap rows={companyView.technicalHeatmap} dense />
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-[1.75rem] border-[rgba(19,34,56,0.08)] bg-white/92 shadow-none">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-xl">Tabela técnica de respondentes</CardTitle>
              <CardDescription>Combina faixa de risco, triagem e dimensão mais sensível.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Input
                value={technicalQuery}
                onChange={(event) => setTechnicalQuery(event.target.value)}
                placeholder="Filtrar tabela técnica"
                className="min-w-[220px]"
              />
              <Button variant="outline" onClick={() => window.print()}>Exportar / imprimir</Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponseTable rows={filteredTechnicalRows} />
          </CardContent>
        </Card>
      </TabsContent>
              </div>
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    </Tabs>
  );
}

function CompanyFilterPanel({
  activeFilters,
  activeFilterChips,
  filterOptions,
  onChangeFilters,
  sampleSize,
}: {
  activeFilters: CompanyFilters;
  activeFilterChips: string[];
  filterOptions: DashboardPayload["filterOptions"];
  onChangeFilters: (filters: CompanyFilters) => void;
  sampleSize: number;
}) {
  const hasActiveFilters = hasActiveCompanyFilters(activeFilters);
  const resolvedAreaOptions =
    activeFilters.team !== "all"
      ? filterOptions.areasByTeam[activeFilters.team] ?? []
      : filterOptions.area;

  function updateFilter<K extends keyof CompanyFilters>(key: K, value: CompanyFilters[K]) {
    const nextFilters = { ...activeFilters, [key]: value };
    if (key === "team" && nextFilters.area !== "all") {
      const nextAreaOptions = value !== "all" ? filterOptions.areasByTeam[String(value)] ?? [] : filterOptions.area;
      if (!nextAreaOptions.includes(nextFilters.area)) {
        nextFilters.area = "all";
      }
    }
    onChangeFilters(nextFilters);
  }

  return (
    <Card className="rounded-[1.75rem] border-[rgba(19,34,56,0.08)] bg-white/90 shadow-none">
      <CardHeader className="flex flex-col gap-4 border-b border-[rgba(19,34,56,0.08)] pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Filtros da visão empresa</p>
          <div>
            <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">Refinar recorte</h3>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline">{sampleSize} pessoas no recorte</Badge>
          {hasActiveFilters ? (
            <Button variant="outline" size="sm" onClick={() => onChangeFilters(getDefaultCompanyFilters())}>
              <RotateCcw className="h-4 w-4" />
              Limpar filtros
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FilterSelect
            label="Time"
            value={activeFilters.team}
            options={filterOptions.team.map((value) => ({ value, label: value }))}
            onChange={(value) => updateFilter("team", value)}
          />
          <FilterSelect
            label="Area"
            value={activeFilters.area}
            options={resolvedAreaOptions.map((value) => ({ value, label: value }))}
            onChange={(value) => updateFilter("area", value)}
          />
          <FilterSelect
            label="Tempo de empresa"
            value={activeFilters.tenureBand}
            options={filterOptions.tenureBand.map((value) => ({ value, label: getTenureBandLabel(value) }))}
            onChange={(value) => updateFilter("tenureBand", value as TenureBand)}
          />
          <FilterSelect
            label="Modelo de trabalho"
            value={activeFilters.workModel}
            options={filterOptions.workModel.map((value) => ({ value, label: triageLabels.workModel[value] }))}
            onChange={(value) => updateFilter("workModel", value as CompanyFilters["workModel"])}
          />
          <FilterSelect
            label="Liderança"
            value={activeFilters.leadership}
            options={filterOptions.leadership.map((value) => ({ value, label: triageLabels.leadership[value] }))}
            onChange={(value) => updateFilter("leadership", value as CompanyFilters["leadership"])}
          />
          <FilterSelect
            label="Exposição ao público"
            value={activeFilters.publicExposure}
            options={filterOptions.publicExposure.map((value) => ({ value, label: triageLabels.publicExposure[value] }))}
            onChange={(value) => updateFilter("publicExposure", value as CompanyFilters["publicExposure"])}
          />
          <FilterSelect
            label="Sobrecarga recente"
            value={activeFilters.recentOverload}
            options={filterOptions.recentOverload.map((value) => ({ value, label: triageLabels.recentOverload[value] }))}
            onChange={(value) => updateFilter("recentOverload", value as CompanyFilters["recentOverload"])}
          />
          <FilterSelect
            label="Sono"
            value={activeFilters.sleepQuality}
            options={filterOptions.sleepQuality.map((value) => ({ value, label: triageLabels.sleepQuality[value] }))}
            onChange={(value) => updateFilter("sleepQuality", value as CompanyFilters["sleepQuality"])}
          />
          <FilterSelect
            label="Energia"
            value={activeFilters.energyLevel}
            options={filterOptions.energyLevel.map((value) => ({ value, label: triageLabels.energyLevel[value] }))}
            onChange={(value) => updateFilter("energyLevel", value as CompanyFilters["energyLevel"])}
          />
          <FilterSelect
            label="Pressão emocional"
            value={activeFilters.emotionalPressure}
            options={filterOptions.emotionalPressure.map((value) => ({ value, label: triageLabels.emotionalPressure[value] }))}
            onChange={(value) => updateFilter("emotionalPressure", value as CompanyFilters["emotionalPressure"])}
          />
          <FilterSelect
            label="Motivação"
            value={activeFilters.motivationLevel}
            options={filterOptions.motivationLevel.map((value) => ({ value, label: triageLabels.motivationLevel[value] }))}
            onChange={(value) => updateFilter("motivationLevel", value as CompanyFilters["motivationLevel"])}
          />
          <FilterSelect
            label="Isolamento social"
            value={activeFilters.socialIsolation}
            options={filterOptions.socialIsolation.map((value) => ({ value, label: triageLabels.socialIsolation[value] }))}
            onChange={(value) => updateFilter("socialIsolation", value as CompanyFilters["socialIsolation"])}
          />
        </div>

        {activeFilterChips.length ? (
          <div className="space-y-3 border-t border-[rgba(19,34,56,0.08)] pt-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">Filtros ativos</p>
            <div className="flex flex-wrap gap-2">
              {activeFilterChips.map((chip) => (
                <Badge key={chip} variant="outline">{chip}</Badge>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">Sem filtros aplicados.</p>
        )}
      </CardContent>
    </Card>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  value: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-[var(--foreground)]">{label}</span>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">Todos</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </label>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      {description ? <p className="text-sm text-[var(--muted-foreground)]">{description}</p> : null}
    </div>
  );
}

function KpiCard({
  label,
  value,
  helper,
  valueClassName,
}: {
  label: string;
  value: string;
  helper?: string;
  valueClassName?: string;
  centered?: boolean;
  variant?: "default" | "individual";
}) {
  return (
    <Card className="frost-card rounded-[1.5rem] border-[rgba(255,255,255,0.56)] bg-white/84 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("text-3xl font-semibold tracking-[-0.04em]", valueClassName)}>{value}</div>
        {helper ? <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}

function HeroMetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card className="frost-card rounded-[1.5rem] border-[rgba(255,255,255,0.6)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(246,251,252,0.84)_100%)] shadow-none">
      <CardContent className="space-y-4 p-5">
        <div className="space-y-2">
          <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
          <p className="text-4xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">{value}</p>
        </div>
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-[rgba(19,34,56,0.08)]">
            <div className="h-full w-2/3 rounded-full bg-[linear-gradient(90deg,var(--primary),var(--brand-teal))]" />
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SidebarMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-[rgba(255,255,255,0.52)] bg-[linear-gradient(180deg,rgba(223,243,240,0.72),rgba(255,255,255,0.74))] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.76)]">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function TokenChip({ value, used, active }: { value: string; used: boolean; active: boolean }) {
  async function handleCopy() {
    await navigator.clipboard.writeText(value);
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => void handleCopy()}
      className={cn(
        "h-auto max-w-full justify-start gap-2 rounded-full px-3 py-2 text-left text-xs font-medium",
        active === false
          ? "border-[rgba(136,163,191,0.2)] bg-[rgba(243,246,249,0.95)] text-[var(--muted-foreground)] hover:bg-[rgba(243,246,249,0.95)]"
          : used
            ? "border-[rgba(106,161,160,0.24)] bg-[rgba(238,246,246,0.92)] text-[var(--foreground)] hover:bg-[rgba(238,246,246,0.92)]"
            : "border-[var(--border)] bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      )}
    >
      <Copy className="h-3.5 w-3.5" />
      <span className="break-all">{value}</span>
      {active === false ? <span className="text-[10px] uppercase tracking-[0.12em]">inativo</span> : null}
      {active !== false && used ? <span className="text-[10px] uppercase tracking-[0.12em]">usado</span> : null}
    </Button>
  );
}

function TokenOperationsModal({
  accessToken,
  companyAccess,
  companyLabel,
  onClose,
  onRefresh,
  open,
}: {
  accessToken: string;
  companyAccess: NonNullable<DashboardPayload["companyAccess"]>;
  companyLabel: string;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  open: boolean;
}) {
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const tokenGroups = [
    { title: "Visão empresa", tokens: companyAccess.companyTokens },
    { title: "Tokens individuais", tokens: companyAccess.memberTokens },
  ];

  async function handleTokenAction(tokenValue: string, action: "reset" | "toggle-active" | "delete") {
    const actionLabel =
      action === "reset"
        ? "resetar"
        : action === "toggle-active"
          ? "alterar o status"
          : "excluir";
    const confirmed = window.confirm(`Deseja ${actionLabel} o token ${tokenValue}?`);
    if (!confirmed) return;

    setPendingToken(tokenValue);
    setStatus(null);

    const response = await fetch("/api/tokens/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        targetToken: tokenValue,
        accessToken: accessToken || undefined,
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setStatus(data.error ?? "Falha ao atualizar token.");
      setPendingToken(null);
      return;
    }

    await onRefresh();
    setPendingToken(null);
    setStatus(
      action === "reset"
        ? "Token resetado e vínculo anterior removido."
        : action === "toggle-active"
          ? "Status do token atualizado."
          : "Token excluído com sucesso."
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(19,34,56,0.36)] px-4 py-10 backdrop-blur-sm">
      <div className="w-full max-w-5xl rounded-[1.75rem] border border-[rgba(19,34,56,0.08)] bg-white shadow-[0_30px_80px_rgba(19,34,56,0.18)]">
        <div className="flex items-start justify-between gap-4 border-b border-[rgba(19,34,56,0.08)] px-6 py-5">
          <div>
            <h3 className="text-xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">Gestão dos tokens</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              {companyLabel}. O token institucional é fixo. Nos tokens individuais, resetar remove o vínculo atual, inativar bloqueia o uso e excluir remove o token do sistema.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-[75vh] space-y-5 overflow-y-auto px-6 py-6">
          {status ? (
            <div className="rounded-[1rem] border border-[var(--border)] bg-[var(--accent)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
              {status}
            </div>
          ) : null}

          {tokenGroups.map((group) => (
            <section key={group.title} className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                {group.title === "Visão empresa" ? <ShieldAlert className="h-4 w-4 text-[var(--primary)]" /> : <KeyRound className="h-4 w-4 text-[var(--primary)]" />}
                {group.title}
              </div>

              <div className="space-y-3">
                {group.tokens.map((token) => {
                  const busy = pendingToken === token.value;
                  const isInstitutionalToken = token.tokenType === "company";

                  return (
                    <Card key={token.value} className="rounded-[1.25rem] border-[rgba(19,34,56,0.08)] bg-white shadow-none">
                      <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-[var(--foreground)]">{token.label}</p>
                            <Badge variant="outline" className="rounded-full">
                              {token.tokenType === "company" ? "empresa" : "individual"}
                            </Badge>
                            <Badge variant="secondary" className="rounded-full">
                              {token.active ? (token.used ? "usado" : "ativo") : "inativo"}
                            </Badge>
                          </div>
                          <p className="break-all text-sm text-[var(--foreground)]">{token.value}</p>
                        </div>

                        {isInstitutionalToken ? (
                          <Badge variant="outline" className="rounded-full px-3 py-2 text-xs">
                            Token institucional protegido
                          </Badge>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void handleTokenAction(token.value, "reset")}>
                              <RotateCcw className="h-4 w-4" />
                              Resetar
                            </Button>
                            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void handleTokenAction(token.value, "toggle-active")}>
                              <Ban className="h-4 w-4" />
                              {token.active ? "Inativar" : "Reativar"}
                            </Button>
                            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void handleTokenAction(token.value, "delete")}>
                              <Trash2 className="h-4 w-4" />
                              Excluir
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function exportTokensCsv(companyAccess: NonNullable<DashboardPayload["companyAccess"]>, companyLabel: string) {
  const rows = [
    ["empresa", "tipo", "rotulo", "token", "status", "ativo", "reutilizavel", "usado_em", "response_id"],
    ...companyAccess.companyTokens.map((token) => [
      companyLabel,
      "institucional",
      token.label,
      token.value,
      token.used ? "usado" : "disponivel",
      token.active ? "sim" : "nao",
      token.reusable ? "sim" : "nao",
      token.usedAt ?? "",
      token.responseId ?? "",
    ]),
    ...companyAccess.memberTokens.map((token) => [
      companyLabel,
      "individual",
      token.label,
      token.value,
      token.used ? "usado" : "disponivel",
      token.active ? "sim" : "nao",
      token.reusable ? "sim" : "nao",
      token.usedAt ?? "",
      token.responseId ?? "",
    ]),
  ];

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\n");

  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const normalizedLabel = companyLabel
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  link.href = url;
  link.download = `tokens-${normalizedLabel || "empresa"}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function InsightCard({ title, detail, tone }: { title: string; detail: string; tone: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-[0_18px_34px_rgba(19,34,56,0.06)] backdrop-blur-sm",
        tone === "attention"
          ? "border-[rgba(255,91,127,0.16)] bg-[rgba(255,245,248,0.84)]"
          : tone === "positive"
            ? "border-[rgba(47,143,138,0.18)] bg-[rgba(223,243,240,0.74)]"
            : "border-[rgba(255,255,255,0.56)] bg-[rgba(255,255,255,0.76)]"
      )}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{detail}</p>
    </div>
  );
}

function MiniMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <div className="text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">{value}</div>
    </div>
  );
}

function BenchmarkCard({ metric }: { metric: BenchmarkMetric }) {
  const suffix = metric.format === "count" ? "" : "%";
  const deltaLabel = `${metric.delta > 0 ? "+" : ""}${metric.delta.toFixed(0)}${suffix}`;

  return (
    <div className="group rounded-[1.4rem] border border-[rgba(255,255,255,0.58)] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(246,250,251,0.76))] px-4 py-4 shadow-[0_18px_34px_rgba(19,34,56,0.06),inset_0_1px_0_rgba(255,255,255,0.72)] transition-all duration-200 hover:bg-[rgba(255,255,255,0.95)] hover:shadow-[0_10px_26px_rgba(19,34,56,0.08)]">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">{metric.label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
        {metric.currentValue.toFixed(0)}{suffix}
      </p>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        Base total: {metric.baselineValue.toFixed(0)}{suffix}
      </p>
      <Badge variant="outline" className="mt-3">
        Delta {deltaLabel}
      </Badge>
    </div>
  );
}

function DimensionBar({ dimension, score }: { dimension: Dimension; score: number }) {
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.58)] bg-[rgba(255,255,255,0.8)] p-4 shadow-[0_16px_30px_rgba(19,34,56,0.06)] backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <Badge variant="outline" className={cn("border", badgeByDimension[dimension])}>{dimension}</Badge>
        <span className="text-sm font-semibold text-[var(--foreground)]">{score.toFixed(2)}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--muted)]">
        <div className={cn("h-full rounded-full bg-gradient-to-r", gradientByDimension[dimension])} style={{ width: `${(score / 5) * 100}%` }} />
      </div>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">{dimensionDescriptions[dimension]}</p>
    </div>
  );
}

function ConditionGrid({ signals, compact = false }: { signals: ConditionSignal[]; compact?: boolean }) {
  return (
    <div className={cn("grid gap-3", compact ? "md:grid-cols-1" : "md:grid-cols-2")}>
      {signals.map((signal) => (
        <div key={signal.name} className="rounded-xl border border-[rgba(255,255,255,0.58)] bg-[rgba(255,255,255,0.8)] p-4 shadow-[0_16px_30px_rgba(19,34,56,0.06)] backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--foreground)]">{signal.name}</p>
            <Badge variant="outline">{signal.prevalence}%</Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{signal.rationale}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--muted)]">
            <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${signal.score}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
            <span>Intensidade {signal.severity}</span>
            <span>{signal.score.toFixed(0)}/100</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function IndicatorBarChart({ items }: { items: IndicatorMetric[] }) {
  return (
    <ChartContainer config={companyChartConfig} className="h-[340px] xl:h-[380px]">
      <BarChart data={items} margin={{ top: 12, right: 12, left: 0, bottom: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={36} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value) => `${value}%`} />} />
        <Bar dataKey="value" radius={[10, 10, 0, 0]}>
          {items.map((item) => (
            <Cell key={item.key} fill={categoryColors[item.key]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

function RiskDonutChart({ slices }: { slices: DistributionSlice[] }) {
  const chartData = slices.map((slice, index) => ({ ...slice, fill: donutColors[index % donutColors.length] }));
  const total = chartData.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,320px)_1fr] xl:items-center">
      <ChartContainer
        config={{
          low: { label: slices[0]?.label, color: donutColors[0] },
          moderate: { label: slices[1]?.label, color: donutColors[1] },
          high: { label: slices[2]?.label, color: donutColors[2] },
        }}
        className="h-[320px]"
      >
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(value) => `${value} pessoas`} />} />
          <Pie data={chartData} dataKey="value" nameKey="label" innerRadius={72} outerRadius={110} strokeWidth={8} cornerRadius={8}>
            {chartData.map((slice) => (
              <Cell key={slice.label} fill={slice.fill} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="space-y-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Total classificado</p>
          <p className="mt-2 text-3xl font-semibold">{total}</p>
        </div>
        {chartData.map((slice) => (
          <div key={slice.label} className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: slice.fill }} />
              <span className="font-medium">{slice.label}</span>
            </div>
            <span className="text-[var(--muted-foreground)]">{slice.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RadarProfileChart({ dimensions }: { dimensions: CompanyView["dimensionScores"] }) {
  const data = [...dimensions].map((dimension) => ({ dimension: dimension.dimension, score: Number(dimension.median.toFixed(2)) }));

  return (
    <ChartContainer config={{ score: { label: "Mediana", color: "var(--foreground)" } }} className="h-[360px] xl:h-[420px]">
      <RadarChart data={data} outerRadius="72%">
        <ChartTooltip content={<ChartTooltipContent formatter={(value) => Number(value).toFixed(2)} />} />
        <PolarGrid />
        <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
        <Radar dataKey="score" fill="rgba(106,161,160,0.24)" stroke="var(--foreground)" strokeWidth={2} />
      </RadarChart>
    </ChartContainer>
  );
}

function WellbeingAreaChart({ buckets }: { buckets: AreaBucket[] }) {
  return (
    <ChartContainer config={{ count: { label: "Colaboradores", color: "var(--primary)" } }} className="h-[340px] xl:h-[380px]">
      <AreaChart data={buckets} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
        <defs>
          <linearGradient id="wellbeing-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.34} />
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={36} />
        <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${value} colaborador(es)`} />} />
        <Area type="monotone" dataKey="count" stroke="var(--foreground)" strokeWidth={3} fill="url(#wellbeing-fill)" />
      </AreaChart>
    </ChartContainer>
  );
}

function PathologyHeatmapChart({ rows }: { rows: PathologyHeatmapRow[] }) {
  const categories = Object.keys(categoryLabels) as Array<keyof typeof categoryLabels>;
  const pathologyGridTemplate = "grid-cols-[220px_repeat(5,160px)]";
  const headerCellClassName =
    "flex min-w-0 min-h-[52px] items-center justify-center rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.82)] px-3 py-2 text-center leading-5 whitespace-normal break-words";

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="w-full overflow-x-auto pb-2">
        <div className="w-max min-w-full space-y-2">
          <div className={cn("grid gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]", pathologyGridTemplate)}>
            <div className="flex items-center px-1">Grupo</div>
            {categories.map((category) => (
              <div key={category} className={headerCellClassName}>
                {categoryLabels[category]}
              </div>
            ))}
          </div>
          {rows.map((row) => (
            <div key={row.label} className={cn("grid gap-2", pathologyGridTemplate)}>
              <div className="rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm">
                <p className="font-medium">{row.label}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{row.count} resposta(s)</p>
              </div>
              {categories.map((category) => {
                const score = row.values.find((value) => value.category === category)?.score ?? 0;
                return (
                  <div
                    key={`${row.label}-${category}`}
                    className="flex min-h-[72px] items-center justify-center rounded-xl border border-[var(--border)] text-sm font-semibold"
                    style={{ backgroundColor: `rgba(106,161,160,${0.08 + (score / 100) * 0.42})` }}
                  >
                    {score.toFixed(0)}%
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Heatmap({ rows, dense = false }: { rows: HeatmapRow[]; dense?: boolean }) {
  const dimensions = Object.keys(dimensionDescriptions) as Dimension[];
  const gridTemplate = dense
    ? "grid-cols-[260px_repeat(6,170px)]"
    : "grid-cols-[220px_repeat(6,170px)]";
  const headerCellClassName =
    "flex min-w-0 min-h-[56px] items-center justify-center rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.82)] px-3 py-2 text-center leading-5 whitespace-normal break-words";

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="w-full overflow-x-auto pb-2">
        <div className="w-max min-w-full space-y-3">
          <div
            className={cn(
              "grid gap-3 text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]",
              gridTemplate,
              dense && "items-end"
            )}
          >
            <div className={cn("flex items-center", dense ? "px-2" : "px-1")}>Recorte</div>
            {dimensions.map((dimension) => (
              <div
                key={dimension}
                className={cn(
                  headerCellClassName,
                  dense && "px-2 text-[11px]"
                )}
              >
                {dimension}
              </div>
            ))}
          </div>
          {rows.map((row) => (
            <div key={row.label} className={cn("grid gap-3", gridTemplate)}>
              <div className={cn("rounded-xl border border-[var(--border)] bg-white text-sm", dense ? "px-4 py-4" : "px-4 py-3")}>
                <p className="font-medium leading-6">{row.label}</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">{row.count} resposta(s)</p>
              </div>
              {dimensions.map((dimension) => {
                const score = row.values.find((value) => value.dimension === dimension)?.score ?? 0;
                return (
                  <div
                    key={`${row.label}-${dimension}`}
                    className={cn(
                      "flex items-center justify-center rounded-xl border border-[var(--border)] text-sm font-semibold",
                      dense && "px-3 text-[13px]"
                    )}
                    style={{
                      backgroundColor: `rgba(106, 161, 160, ${0.08 + (score / 5) * 0.38})`,
                      minHeight: dense ? 64 : 72,
                    }}
                  >
                    {score.toFixed(2)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SegmentTable({ rows }: { rows: CompanyView["segmentSnapshots"] }) {
  if (!rows.length) {
    return <p className="text-sm text-[var(--muted-foreground)]">Ainda não há recortes suficientes.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Segmento</TableHead>
          <TableHead>Base</TableHead>
          <TableHead>Mediana</TableHead>
          <TableHead>Faixa</TableHead>
          <TableHead>Maior atenção</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.segment}>
            <TableCell className="font-medium">{row.segment}</TableCell>
            <TableCell>{row.count}</TableCell>
            <TableCell>{row.median.toFixed(2)}</TableCell>
            <TableCell>{row.riskBand}</TableCell>
            <TableCell>{row.topDimension}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function getDefaultComparisonSelection(groups: ComparisonGroup[]) {
  if (groups.length < 2) return null;

  return {
    groupAId: groups[0].id,
    groupBId: groups[1].id,
  };
}

function getAvailableComparisonKinds(groups: ComparisonGroup[]) {
  const orderedKinds: ComparisonGroupKind[] = ["team", "role", "area"];
  return orderedKinds.filter((kind) => groups.filter((group) => group.kind === kind).length >= 2);
}

function getComparisonKindLabel(kind: ComparisonGroupKind) {
  if (kind === "team") return "Time";
  if (kind === "role") return "Função";
  return "Área";
}

function formatDelta(value: number, suffix = "") {
  const rounded = Number(value.toFixed(0));
  const prefix = rounded > 0 ? "+" : "";
  return `${prefix}${rounded}${suffix}`;
}

function GroupComparisonCard({
  groups,
  comparisonKind,
  availableKinds,
  groupAId,
  groupBId,
  onChangeComparisonKind,
  onChangeGroupA,
  onChangeGroupB,
}: {
  groups: CompanyView["comparisonGroups"];
  comparisonKind: ComparisonGroupKind;
  availableKinds: ComparisonGroupKind[];
  groupAId: string;
  groupBId: string;
  onChangeComparisonKind: (value: ComparisonGroupKind) => void;
  onChangeGroupA: (value: string) => void;
  onChangeGroupB: (value: string) => void;
}) {
  if (!availableKinds.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Comparação entre grupos</CardTitle>
          <CardDescription>
            A comparação direta aparece quando existem pelo menos dois grupos do mesmo tipo com respostas no recorte atual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            Ainda não há dois grupos distintos do mesmo tipo para comparar por time, função ou área neste recorte.
          </p>
        </CardContent>
      </Card>
    );
  }

  const scopedGroups = groups.filter((group) => group.kind === comparisonKind);
  const groupA = scopedGroups.find((group) => group.id === groupAId) ?? scopedGroups[0];
  const fallbackGroupB = scopedGroups.find((group) => group.id !== groupA.id) ?? scopedGroups[1];
  const groupB = scopedGroups.find((group) => group.id === groupBId && group.id !== groupA.id) ?? fallbackGroupB;
  const wellbeingDelta = groupA.wellbeingIndex - groupB.wellbeingIndex;
  const burnoutDelta = groupA.burnoutRiskShare - groupB.burnoutRiskShare;
  const anxietyDelta = groupA.anxietyRiskShare - groupB.anxietyRiskShare;
  const mostDivergentDimension = [...groupA.dimensionScores]
    .map((dimension) => {
      const otherDimension = groupB.dimensionScores.find((item) => item.dimension === dimension.dimension);
      return {
        dimension: dimension.dimension,
        delta: dimension.median - (otherDimension?.median ?? 0),
      };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];

  const leadingGroupForWellbeing = wellbeingDelta >= 0 ? groupA.shortLabel : groupB.shortLabel;
  const leadingGroupForBurnout = burnoutDelta >= 0 ? groupA.shortLabel : groupB.shortLabel;
  const leadingGroupForAnxiety = anxietyDelta >= 0 ? groupA.shortLabel : groupB.shortLabel;
  const hasSmallSample = groupA.count < 3 || groupB.count < 3;

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <CardTitle className="text-xl">Comparação entre grupos</CardTitle>
            <CardDescription>
              Escolha o tipo do recorte e compare grupos equivalentes para ler delta de bem-estar, burnout, ansiedade e a dimensão que mais separa os recortes.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit">{scopedGroups.length} grupos de {getComparisonKindLabel(comparisonKind).toLowerCase()} comparáveis</Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Tipo de comparação</span>
            <Select
              value={comparisonKind}
              onChange={(event) => onChangeComparisonKind(event.target.value as ComparisonGroupKind)}
            >
              {availableKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {getComparisonKindLabel(kind)}
                </option>
              ))}
            </Select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Grupo A</span>
            <Select value={groupA.id} onChange={(event) => onChangeGroupA(event.target.value)}>
              {scopedGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.shortLabel} ({group.count})
                </option>
              ))}
            </Select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Grupo B</span>
            <Select value={groupB.id} onChange={(event) => onChangeGroupB(event.target.value)}>
              {scopedGroups
                .filter((group) => group.id !== groupA.id)
                .map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.shortLabel} ({group.count})
                  </option>
                ))}
            </Select>
          </label>
        </div>

        {hasSmallSample ? (
          <div className="rounded-[1.2rem] border border-[var(--border)] bg-[rgba(255,255,255,0.72)] px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]">
            Comparação exibida com base pequena. Um ou ambos os grupos ainda têm menos de 3 respostas, então os deltas servem como sinal inicial e não como conclusão estatisticamente estável.
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-6">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="grid gap-4 md:grid-cols-2">
            {[groupA, groupB].map((group, index) => (
              <div
                key={group.id}
                className={cn(
                  "rounded-[1.6rem] border px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
                  index === 0
                    ? "border-[rgba(36,49,77,0.14)] bg-[rgba(36,49,77,0.06)]"
                    : "border-[rgba(94,138,136,0.18)] bg-[rgba(223,238,237,0.72)]"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                      Grupo {index === 0 ? "A" : "B"}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[var(--foreground)]">{group.shortLabel}</h3>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{group.label}</p>
                  </div>
                  <Badge variant="outline">{group.count} pessoas</Badge>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.1rem] border border-[var(--border)] bg-white/80 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Bem-estar</p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{group.wellbeingIndex.toFixed(0)}%</p>
                  </div>
                  <div className="rounded-[1.1rem] border border-[var(--border)] bg-white/80 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Burnout alto</p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{group.burnoutRiskShare.toFixed(0)}%</p>
                  </div>
                  <div className="rounded-[1.1rem] border border-[var(--border)] bg-white/80 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Ansiedade alta</p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{group.anxietyRiskShare.toFixed(0)}%</p>
                  </div>
                  <div className="rounded-[1.1rem] border border-[var(--border)] bg-white/80 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Dimensão sensível</p>
                    <p className="mt-2 text-base font-semibold leading-6 text-[var(--foreground)]">{group.weakestDimension}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-[1.7rem] border border-[var(--border)] bg-white/80 px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Delta A vs B</p>
            <div className="mt-4 grid gap-3">
              <ComparisonDeltaRow
                label="Bem-estar"
                delta={formatDelta(wellbeingDelta, " pts")}
                helper={`${leadingGroupForWellbeing} aparece melhor posicionado neste eixo.`}
                positive={wellbeingDelta >= 0}
              />
              <ComparisonDeltaRow
                label="Burnout alto"
                delta={formatDelta(burnoutDelta, " p.p.")}
                helper={`${leadingGroupForBurnout} concentra mais risco de burnout.`}
                positive={burnoutDelta <= 0}
              />
              <ComparisonDeltaRow
                label="Ansiedade alta"
                delta={formatDelta(anxietyDelta, " p.p.")}
                helper={`${leadingGroupForAnxiety} concentra mais risco de ansiedade.`}
                positive={anxietyDelta <= 0}
              />
            </div>

            <div className="mt-5 rounded-[1.3rem] border border-[var(--border)] bg-[var(--accent)] px-4 py-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">Maior distância dimensional</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                {mostDivergentDimension
                  ? `${mostDivergentDimension.dimension} é o eixo que mais separa os grupos, com ${formatDelta(mostDivergentDimension.delta, " pts")} na mediana do Grupo A em relação ao Grupo B.`
                  : "Não foi possível identificar uma distância dimensional relevante entre os grupos selecionados."}
              </p>
            </div>

            <div className="mt-4 rounded-[1.3rem] border border-[var(--border)] bg-[rgba(255,255,255,0.88)] px-4 py-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">Leitura rápida para RH e liderança</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                {groupA.shortLabel} vs {groupB.shortLabel}: o gap principal hoje aparece em{" "}
                {mostDivergentDimension?.dimension ?? "bem-estar geral"}, com {leadingGroupForBurnout} e {leadingGroupForAnxiety} exigindo
                mais atenção quando o foco for risco emocional sustentado.
              </p>
            </div>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

function ComparisonDeltaRow({
  label,
  delta,
  helper,
  positive,
}: {
  label: string;
  delta: string;
  helper: string;
  positive: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[1.2rem] border border-[var(--border)] bg-[rgba(248,250,250,0.92)] px-4 py-4">
      <div>
        <p className="text-sm font-semibold text-[var(--foreground)]">{label}</p>
        <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{helper}</p>
      </div>
      <span
        className={cn(
          "rounded-full px-3 py-1 text-sm font-semibold",
          positive
            ? "bg-[rgba(137,184,182,0.18)] text-[var(--foreground)]"
            : "bg-[rgba(36,49,77,0.10)] text-[var(--foreground)]"
        )}
      >
        {delta}
      </span>
    </div>
  );
}

function QuestionTable({ rows }: { rows: QuestionScore[] }) {
  const ordered = [...rows].sort((a, b) => a.median - b.median);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fator</TableHead>
          <TableHead>Dimensão</TableHead>
          <TableHead>Mediana</TableHead>
          <TableHead>Média</TableHead>
          <TableHead>Baixo escore</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ordered.map((row) => (
          <TableRow key={row.id}>
            <TableCell><p className="font-medium text-[var(--foreground)]">{row.text}</p></TableCell>
            <TableCell>
              <Badge variant="outline" className={cn("border", badgeByDimension[row.dimension])}>{row.dimension}</Badge>
            </TableCell>
            <TableCell>{row.median.toFixed(2)}</TableCell>
            <TableCell>{row.average.toFixed(2)}</TableCell>
            <TableCell>{row.lowShare.toFixed(0)}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ResponseTable({ rows }: { rows: CompanyView["technicalResponseRows"] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Respondente</TableHead>
          <TableHead>Estrutura</TableHead>
          <TableHead>Índice</TableHead>
          <TableHead>Faixa</TableHead>
          <TableHead>Sobrecarga</TableHead>
          <TableHead>Sono</TableHead>
          <TableHead>Pressão</TableHead>
          <TableHead>Mais sensível</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <p className="font-medium text-[var(--foreground)]">{row.pseudonymId ?? row.id}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{new Date(row.submittedAt).toLocaleDateString("pt-BR")}</p>
            </TableCell>
            <TableCell>
              {row.protectedGroup ? (
                <div>
                  <p className="font-medium text-[var(--foreground)]">Grupo protegido (&lt;3)</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Detalhes estruturais ocultados</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-[var(--foreground)]">{row.team || "Sem time"}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {row.role || "Sem função"} {row.area ? `· ${row.area}` : ""}
                  </p>
                </div>
              )}
            </TableCell>
            <TableCell>{row.overallAverage.toFixed(2)}</TableCell>
            <TableCell>{row.riskBand}</TableCell>
            <TableCell>{formatTriagedValue(row.recentOverload)}</TableCell>
            <TableCell>{formatTriagedValue(row.sleepQuality)}</TableCell>
            <TableCell>{formatTriagedValue(row.emotionalPressure)}</TableCell>
            <TableCell>{row.weakestDimension}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function buildTriagePills(individual: IndividualView) {
  const triage = individual.triage;
  const pills: string[] = [];

  if (triage.workModel) pills.push(triageLabels.workModel[triage.workModel]);
  if (triage.shift) pills.push(triageLabels.shift[triage.shift]);
  if (triage.leadership) pills.push(triageLabels.leadership[triage.leadership]);
  if (triage.publicExposure) pills.push(triageLabels.publicExposure[triage.publicExposure]);
  if (triage.recentOverload) pills.push(triageLabels.recentOverload[triage.recentOverload]);
  if (triage.sleepQuality) pills.push(triageLabels.sleepQuality[triage.sleepQuality]);
  if (triage.energyLevel) pills.push(triageLabels.energyLevel[triage.energyLevel]);
  if (triage.emotionalPressure) pills.push(triageLabels.emotionalPressure[triage.emotionalPressure]);
  if (triage.motivationLevel) pills.push(triageLabels.motivationLevel[triage.motivationLevel]);
  if (triage.socialIsolation) pills.push(triageLabels.socialIsolation[triage.socialIsolation]);
  if (triage.area) pills.push(`Área: ${triage.area}`);
  if (triage.tenureMonths) pills.push(`${triage.tenureMonths} meses de casa`);
  if (triage.weeklyHours) pills.push(`${triage.weeklyHours}h/semana`);

  return pills;
}

function buildActiveFilterChips(filters: CompanyFilters) {
  const chips: string[] = [];

  if (filters.team !== "all") chips.push(`Time: ${filters.team}`);
  if (filters.area !== "all") chips.push(`Área: ${filters.area}`);
  if (filters.tenureBand !== "all") chips.push(`Tempo: ${getTenureBandLabel(filters.tenureBand)}`);
  if (filters.workModel !== "all") chips.push(triageLabels.workModel[filters.workModel]);
  if (filters.leadership !== "all") chips.push(triageLabels.leadership[filters.leadership]);
  if (filters.publicExposure !== "all") chips.push(triageLabels.publicExposure[filters.publicExposure]);
  if (filters.recentOverload !== "all") chips.push(triageLabels.recentOverload[filters.recentOverload]);
  if (filters.sleepQuality !== "all") chips.push(triageLabels.sleepQuality[filters.sleepQuality]);
  if (filters.energyLevel !== "all") chips.push(triageLabels.energyLevel[filters.energyLevel]);
  if (filters.emotionalPressure !== "all") chips.push(triageLabels.emotionalPressure[filters.emotionalPressure]);
  if (filters.motivationLevel !== "all") chips.push(triageLabels.motivationLevel[filters.motivationLevel]);
  if (filters.socialIsolation !== "all") chips.push(triageLabels.socialIsolation[filters.socialIsolation]);

  return chips;
}

function formatTriagedValue(value?: string) {
  if (!value) return "--";
  for (const group of Object.values(triageLabels)) {
    if (value in group) {
      return group[value as keyof typeof group];
    }
  }
  return value;
}

type BlockedCardProps = {
  title: string;
  message: string;
  action: () => void;
};

function BlockedCard({ title, message, action }: BlockedCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-md shadow-xl shadow-[rgba(44,62,80,0.08)]">
        <CardHeader className="text-center">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={action}>Ir para o formulário</Button>
        </CardContent>
      </Card>
    </div>
  );
}
