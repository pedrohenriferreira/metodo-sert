"use client";

import type { ComponentType } from "react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Ban, Calendar, Copy, Download, KeyRound, Layers3, Lock, RotateCcw, Settings2, ShieldAlert, ShieldCheck, Sparkles, Trash2, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type {
  AreaBucket,
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
} from "@/lib/metrics";
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

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoadingState />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewMode>("company");
  const [blocked, setBlocked] = useState(false);
  const [teamFilter, setTeamFilter] = useState("all");

  const viewKey = searchParams.get("view") ?? "";
  const memberToken = searchParams.get("memberToken") ?? "";
  const accessToken = searchParams.get("accessToken") ?? "";
  const companyId = searchParams.get("companyId") ?? "";
  const adminScope = searchParams.get("adminScope") ?? "";
  const fromAdmin = searchParams.get("fromAdmin") === "1";

  async function loadDashboard() {
    const params = new URLSearchParams();
    if (viewKey) params.set("viewKey", viewKey);
    if (memberToken) params.set("memberToken", memberToken);
    if (accessToken) params.set("accessToken", accessToken);
    if (companyId) params.set("companyId", companyId);
    if (adminScope) params.set("adminScope", adminScope);
    if (teamFilter !== "all") params.set("team", teamFilter);

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
    setActiveView(data.defaultView);
    setTeamFilter(data.activeTeamFilter ?? "all");
    setBlocked(false);
    setStatus(null);
  }

  useEffect(() => {
    let cancelled = false;

    async function hydrateDashboard() {
      const params = new URLSearchParams();
      if (viewKey) params.set("viewKey", viewKey);
      if (memberToken) params.set("memberToken", memberToken);
      if (accessToken) params.set("accessToken", accessToken);
      if (companyId) params.set("companyId", companyId);
      if (adminScope) params.set("adminScope", adminScope);
      if (teamFilter !== "all") params.set("team", teamFilter);

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
      setActiveView(data.defaultView);
      setTeamFilter(data.activeTeamFilter ?? "all");
      setBlocked(false);
      setStatus(null);
    }

    void hydrateDashboard();

    return () => {
      cancelled = true;
    };
  }, [accessToken, adminScope, companyId, memberToken, teamFilter, viewKey]);

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
    <div className="shell-page min-h-screen text-[var(--foreground)]">
      {payload && (
        <div className="mx-auto w-full max-w-[1520px] space-y-8 px-4 py-6 lg:px-8 lg:py-8">
          <DashboardTopBar
            availableViews={availableViews}
            fromAdmin={fromAdmin}
            payload={payload}
            resolvedActiveView={resolvedActiveView}
            setActiveView={setActiveView}
            status={status}
          />

          <div className="w-full rounded-[2rem] border border-[var(--border)] bg-[rgba(255,255,255,0.5)] p-4 shadow-[0_24px_60px_rgba(129,155,179,0.12)] lg:p-7">
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
                teamFilter={teamFilter}
                teamOptions={payload.teamOptions}
                setTeamFilter={setTeamFilter}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardLoadingState() {
  return (
    <div className="shell-page min-h-screen px-6 py-10">
      <Card className="mx-auto w-full max-w-3xl border-[var(--border)] bg-[rgba(255,255,255,0.82)] shadow-sm">
        <CardContent className="p-6 text-sm text-[var(--muted-foreground)]">
          Carregando dashboard...
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardTopBar({
  availableViews,
  fromAdmin,
  payload,
  resolvedActiveView,
  setActiveView,
  status,
}: {
  availableViews: Array<{ id: ViewMode; label: string; description: string }>;
  fromAdmin: boolean;
  payload: DashboardPayload;
  resolvedActiveView: ViewMode;
  setActiveView: (view: ViewMode) => void;
  status: string | null;
}) {
  const router = useRouter();

  return (
    <>
      <div className="w-full px-1 py-1 lg:px-2">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="hero-pill">
                  <Sparkles className="h-3.5 w-3.5" />
                  Painel analitico NR-1
                </span>
                {fromAdmin && (
                  <Button variant="outline" size="sm" onClick={() => router.push("/admin")}>
                    <ArrowLeft className="h-4 w-4" />
                    Voltar ao painel
                  </Button>
                )}
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] lg:text-6xl">
                {resolvedActiveView === "individual"
                  ? "Leitura Psicossocial Individual"
                  : "Leitura Psicossocial Organizacional"}
              </h1>
              <p className="mt-3 max-w-4xl text-lg leading-8 text-[var(--muted-foreground)]">
                {payload.companyLabel} {resolvedActiveView === "company" ? "• visão consolidada" : "• leitura protegida"}
              </p>
            </div>
            <div className="flex flex-col gap-4 xl:items-end">
              {resolvedActiveView === "company" && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <MiniMetric icon={Users} label="Respostas" value={`${payload.totalResponses}`} />
                  <MiniMetric
                    icon={ShieldCheck}
                    label="Adesão"
                    value={typeof payload.participationRate === "number" ? `${payload.participationRate}%` : "--"}
                  />
                  <MiniMetric
                    icon={Calendar}
                    label="Atualização"
                    value={new Date(payload.generatedAt).toLocaleDateString("pt-BR")}
                  />
                </div>
              )}

              {!!availableViews.length && resolvedActiveView === "company" && (
                <div className="rounded-[1.7rem] border border-[var(--border)] bg-[rgba(255,255,255,0.9)] p-1.5 shadow-[0_12px_30px_rgba(129,155,179,0.10)]">
                  <div className="flex flex-wrap gap-1.5">
                    {availableViews.map((view) => (
                      <button
                        key={view.id}
                        type="button"
                        onClick={() => setActiveView(view.id)}
                        className={cn(
                          "inline-flex min-w-[180px] items-center justify-center gap-2 rounded-[1.3rem] px-5 py-4 text-sm font-semibold transition-all",
                          resolvedActiveView === view.id
                            ? "bg-[#24314d] text-white shadow-[0_10px_24px_rgba(36,49,77,0.20)]"
                            : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                        )}
                      >
                        {view.id === "individual" ? <Lock className="h-4 w-4" /> : <Layers3 className="h-4 w-4" />}
                        {view.id === "individual" ? "Sua Leitura" : "Visão Empresa"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {status && (
        <Card className="w-full rounded-[24px] border-[var(--border)] bg-[var(--accent)] text-[var(--foreground)] shadow-sm">
          <CardContent className="p-4 text-sm">{status}</CardContent>
        </Card>
      )}
    </>
  );
}

function IndividualSection({ individual }: { individual: IndividualView }) {
  const triagePills = buildTriagePills(individual);

  return (
    <div className="space-y-8 lg:space-y-10">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-[var(--border)] bg-[rgba(238,246,246,0.75)] px-5 py-5 shadow-[0_18px_40px_rgba(129,155,179,0.10)] lg:flex-row lg:items-start lg:justify-between lg:px-6">
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
      </div>

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
        <Card className="rounded-[2rem] border-[var(--border)] bg-[rgba(255,255,255,0.88)] shadow-[0_18px_45px_rgba(129,155,179,0.10)]">
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

        <Card className="rounded-[2rem] border-[var(--border)] bg-[rgba(255,255,255,0.88)] shadow-[0_18px_45px_rgba(129,155,179,0.10)]">
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
  teamFilter,
  teamOptions,
  setTeamFilter,
}: {
  companyView: CompanyView;
  companyAccess: DashboardPayload["companyAccess"];
  companyLabel: string;
  accessToken: string;
  onRefresh: () => Promise<void>;
  teamFilter: string;
  teamOptions: string[];
  setTeamFilter: (value: string) => void;
}) {
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("panorama");

  return (
    <div className="space-y-6">
      {!!teamOptions.length && activeTab !== "panorama" && (
        <div className="flex flex-col gap-3 rounded-[1.6rem] border border-[var(--border)] bg-[rgba(255,255,255,0.72)] px-4 py-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[var(--foreground)]">Filtro global por time</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              A visão empresa está mostrando os dados de {teamFilter === "all" ? "todos os times cadastrados" : `time: ${teamFilter}`}.
            </p>
          </div>
          <div className="w-full md:w-[320px]">
            <Select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)} aria-label="Filtrar visão empresa por time">
              <option value="all">Todos os times</option>
              {teamOptions.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 gap-2 lg:grid-cols-5">
        <TabsTrigger value="panorama">Panorama executivo</TabsTrigger>
        <TabsTrigger value="visao-geral">Visão geral</TabsTrigger>
        <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
        <TabsTrigger value="recortes">Recortes</TabsTrigger>
        <TabsTrigger value="tecnico">Camada técnica</TabsTrigger>
      </TabsList>

      <TabsContent value="panorama" className="space-y-8">
        <SectionHeader
          eyebrow="Panorama executivo"
          title="Resumo rápido da saúde psicossocial"
          description="Primeira leitura da base com KPIs centrais e o mapa visual mais importante para diretoria e RH."
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

            <Card className="rounded-[26px] border-[var(--border)] bg-[rgba(255,255,255,0.88)] shadow-[0_18px_45px_rgba(44,62,80,0.06)]">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl">Bloco de tokens</CardTitle>
                    <div className="group relative">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-full"
                        onClick={() => setTokenModalOpen(true)}
                        aria-label="Configurações do token"
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--muted-foreground)] shadow-[0_14px_30px_rgba(44,62,80,0.12)] group-hover:block group-focus-within:block">
                        Configurações do token
                      </div>
                    </div>
                  </div>
                  <CardDescription>
                    Tokens institucionais e individuais disponíveis para cópia rápida.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportTokensCsv(companyAccess, companyLabel)}
                >
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </CardHeader>
              <CardContent className="space-y-5">
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
              </CardContent>
            </Card>
            <TokenSettingsModal
              accessToken={accessToken}
              companyAccess={companyAccess}
              companyLabel={companyLabel}
              onClose={() => setTokenModalOpen(false)}
              onRefresh={onRefresh}
              open={tokenModalOpen}
            />
          </section>
        )}
      </TabsContent>

      <TabsContent value="visao-geral" className="space-y-8">
        <SectionHeader
          eyebrow="Visão geral"
          title="Indicadores centrais da base"
          description="KPIs executivos e gráficos principais para leitura rápida do risco e da incidência por categoria."
        />

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Índice de bem-estar" value={`${companyView.wellbeingIndex.toFixed(0)}%`} helper="Mediana convertida em índice executivo" />
          <KpiCard label="% risco de burnout" value={`${companyView.burnoutRiskShare.toFixed(0)}%`} helper="Base com intensidade alta para burnout" />
          <KpiCard label="Satisfação" value={`${companyView.satisfactionScore.toFixed(0)}%`} helper="Leitura agregada de satisfação percebida" />
          <KpiCard label="% ansiedade" value={`${companyView.anxietyRiskShare.toFixed(0)}%`} helper="Base com intensidade alta para ansiedade ocupacional" />
        </section>

        <section className="grid gap-10 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-[26px] border-[var(--border)] bg-[rgba(255,255,255,0.88)] shadow-[0_18px_45px_rgba(44,62,80,0.06)]">
            <CardHeader>
              <CardTitle className="text-xl">Indicadores por categoria</CardTitle>
              <CardDescription>
                Incidência média de ansiedade, burnout, depressão, estresse e satisfação percebida.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              <IndicatorBarChart items={companyView.indicatorBars} />
            </CardContent>
          </Card>

          <Card className="rounded-[26px] border-[var(--border)] bg-[rgba(255,255,255,0.88)] shadow-[0_18px_45px_rgba(44,62,80,0.06)]">
            <CardHeader>
              <CardTitle className="text-xl">Distribuição de risco</CardTitle>
              <CardDescription>
                Classificação por nível de bem-estar em baixo risco, risco moderado e alto risco.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              <RiskDonutChart slices={companyView.riskDonut} />
            </CardContent>
          </Card>
        </section>
      </TabsContent>

      <TabsContent value="diagnostico" className="space-y-8">
        <SectionHeader
          eyebrow="Diagnóstico"
          title="Leitura analítica da organização"
          description="Bloco para entender estrutura emocional, tendências prevalentes e os fatores que mais puxam risco na escala."
        />

        <section className="grid gap-10 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Card className="min-w-0 rounded-[26px] border-[var(--border)] bg-[rgba(255,255,255,0.88)] shadow-[0_18px_45px_rgba(44,62,80,0.06)]">
            <CardHeader>
              <CardTitle className="text-xl">Perfil psicológico organizacional</CardTitle>
              <CardDescription>
                Gráfico radar do mapeamento multidimensional da saúde organizacional.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              <RadarProfileChart dimensions={companyView.dimensionScores} />
            </CardContent>
          </Card>

          <Card className="min-w-0 rounded-[26px] border-[var(--border)] bg-[rgba(255,255,255,0.88)] shadow-[0_18px_45px_rgba(44,62,80,0.06)]">
            <CardHeader>
              <CardTitle className="text-xl">Distribuição de bem-estar</CardTitle>
              <CardDescription>
                Quantidade de colaboradores por faixa do índice de bem-estar.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              <WellbeingAreaChart buckets={companyView.wellbeingArea} />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-10 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-[26px] border-[var(--border)] bg-[rgba(255,255,255,0.88)] shadow-[0_18px_45px_rgba(44,62,80,0.06)]">
            <CardHeader>
              <CardTitle className="text-xl">Leitura guiada</CardTitle>
              <CardDescription>
                Principais interpretações executivas e sinais mais prováveis nesta base.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                {companyView.insights.map((insight) => (
                  <InsightCard key={insight.title} title={insight.title} detail={insight.detail} tone={insight.tone} />
                ))}
              </div>
              <ConditionGrid signals={companyView.tendencies.filter((signal) => !signal.name.includes("Satisfação"))} />
            </CardContent>
          </Card>

          <Card className="rounded-[26px] border-[var(--border)] bg-[rgba(255,255,255,0.88)] shadow-[0_18px_45px_rgba(44,62,80,0.06)]">
            <CardHeader>
              <CardTitle className="text-xl">Fatores críticos da escala</CardTitle>
              <CardDescription>
                Itens mais frágeis da escala, úteis para fechar plano de ação com liderança e RH.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QuestionTable rows={companyView.questionScores} />
            </CardContent>
          </Card>
        </section>
      </TabsContent>

      <TabsContent value="recortes" className="space-y-8">
        <SectionHeader
          eyebrow="Recortes"
          title="Onde o risco está concentrado"
          description="Recortes por grupo, dimensão e função para localizar pontos quentes e priorizar a ação organizacional."
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Heatmap de incidência por cargo / função / time</CardTitle>
            <CardDescription>
              Mapa das patologias identificadas por agrupamento disponível na base, usando time, função ou área quando presentes.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 overflow-hidden pt-2 pb-3">
            <PathologyHeatmapChart rows={companyView.pathologyHeatmap} />
          </CardContent>
        </Card>

        <section className="grid gap-10 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Card className="min-w-0 rounded-[26px] border-[var(--border)] bg-[rgba(255,255,255,0.88)] shadow-[0_18px_45px_rgba(44,62,80,0.06)]">
            <CardHeader>
              <CardTitle className="text-xl">Recortes relevantes</CardTitle>
              <CardDescription>
                Grupos que concentram mediana pior e merecem acompanhamento priorizado.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              <SegmentTable rows={companyView.segmentSnapshots} />
            </CardContent>
          </Card>

          <Card className="min-w-0 rounded-[26px] border-[var(--border)] bg-[rgba(255,255,255,0.88)] shadow-[0_18px_45px_rgba(44,62,80,0.06)]">
            <CardHeader>
              <CardTitle className="text-xl">Heatmap dimensional complementar</CardTitle>
              <CardDescription>
                Mediana por dimensão em segmentos críticos para aprofundar a leitura do radar.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-w-0 overflow-hidden pt-2 pb-3">
              <Heatmap rows={companyView.heatmap} />
            </CardContent>
          </Card>
        </section>
      </TabsContent>

      <TabsContent value="tecnico" className="space-y-8">
        <SectionHeader
          eyebrow="Camada técnica"
          title="Aprofundamento clínico-organizacional"
          description="Leitura ampliada da triagem para discussão técnica, acompanhamento interno e preparação de devolutivas."
        />

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Alta atenção" value={`${companyView.highRiskShare.toFixed(0)}%`} helper="Atenção alta + crítico" />
          <KpiCard label="Sobrecarga recente" value={`${companyView.overloadShare.toFixed(0)}%`} helper="Relato direto na triagem" />
          <KpiCard label="Sono comprometido" value={`${companyView.sleepRiskShare.toFixed(0)}%`} helper="Sono regular ou ruim" />
          <KpiCard label="Base técnica" value={`${companyView.technicalResponseRows.length}`} helper="Respondentes disponíveis" />
        </section>

        <section className="grid gap-10 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
          <Card className="min-w-0 rounded-[26px] border-[var(--border)] bg-[rgba(255,255,255,0.88)] shadow-[0_18px_45px_rgba(44,62,80,0.06)]">
            <CardHeader>
              <CardTitle className="text-xl">Prevalência técnica de sinais</CardTitle>
              <CardDescription>Ranking dos principais sinais psicossociais identificados na base atual.</CardDescription>
            </CardHeader>
            <CardContent>
              <ConditionGrid signals={companyView.conditionPrevalence} />
            </CardContent>
          </Card>

          <Card className="min-w-0 rounded-[26px] border-[var(--border)] bg-[rgba(255,255,255,0.88)] shadow-[0_18px_45px_rgba(44,62,80,0.06)]">
            <CardHeader>
              <CardTitle className="text-xl">Heatmap individual por dimensão</CardTitle>
              <CardDescription>Leitura individual, resposta por resposta, para discussão técnica e aprofundamento da devolutiva organizacional.</CardDescription>
            </CardHeader>
            <CardContent className="min-w-0 overflow-hidden">
              <Heatmap rows={companyView.technicalHeatmap} dense />
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-xl">Tabela técnica de respondentes</CardTitle>
              <CardDescription>Combina faixa de risco, triagem e dimensão mais sensível.</CardDescription>
            </div>
            <Button variant="outline" onClick={() => window.print()}>Exportar / imprimir</Button>
          </CardHeader>
          <CardContent>
            <ResponseTable rows={companyView.technicalResponseRows} />
          </CardContent>
        </Card>
      </TabsContent>
      </Tabs>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[2rem] border border-[var(--border)] bg-[rgba(255,255,255,0.76)] px-5 py-5 shadow-[0_14px_36px_rgba(129,155,179,0.08)] lg:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted-foreground)]">{eyebrow}</p>
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{title}</h2>
        <p className="max-w-4xl text-sm leading-7 text-[var(--muted-foreground)] md:text-base">{description}</p>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  helper,
  valueClassName,
  centered = false,
  variant = "default",
}: {
  label: string;
  value: string;
  helper: string;
  valueClassName?: string;
  centered?: boolean;
  variant?: "default" | "individual";
}) {
  if (variant === "individual") {
    return (
        <Card className="overflow-hidden rounded-[2rem] border-[rgba(191,211,226,0.9)] bg-[rgba(255,255,255,0.96)] shadow-[0_18px_42px_rgba(129,155,179,0.12)]">
          <CardContent className="flex min-h-[182px] flex-col justify-between p-0">
          <div className="space-y-5 px-6 pt-6">
            <div className="inline-flex w-fit rounded-full border border-[rgba(106,161,160,0.16)] bg-[rgba(238,246,246,0.92)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
              {label}
            </div>
            <p
              className={cn(
                "max-w-full pl-2 pr-2 text-left text-5xl font-semibold tracking-[-0.06em] text-[var(--foreground)]",
                valueClassName
              )}
            >
              {value}
            </p>
          </div>
          <div className="px-6 pb-5 pl-8 pr-3 text-left text-sm font-medium text-[var(--primary)]">
            {helper}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="metric-card">
      <CardContent className={cn("flex min-h-[204px] flex-col p-0", centered && "items-center text-center")}>
        <p className={cn("font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]", centered && "w-full text-left")}>
          {label}
        </p>
        <p
          className={cn(
            "mt-4 text-5xl font-semibold leading-[0.98] tracking-[-0.06em] text-[var(--foreground)]",
            valueClassName
          )}
        >
          {value}
        </p>
        <p className="mt-auto pt-3 text-sm text-[var(--primary)]">{helper}</p>
      </CardContent>
    </Card>
  );
}

function TokenChip({ value, used, active }: { value: string; used: boolean; active: boolean }) {
  async function handleCopy() {
    await navigator.clipboard.writeText(value);
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-left text-xs font-medium transition-colors",
        active === false
          ? "border-[rgba(136,163,191,0.2)] bg-[rgba(243,246,249,0.95)] text-[var(--muted-foreground)]"
          : used
          ? "border-[rgba(106,161,160,0.24)] bg-[rgba(238,246,246,0.92)] text-[var(--foreground)]"
          : "border-[var(--border)] bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      )}
    >
      <Copy className="h-3.5 w-3.5" />
      <span className="break-all">{value}</span>
      {active === false ? <span className="text-[10px] uppercase tracking-[0.12em]">inativo</span> : null}
      {active !== false && used ? <span className="text-[10px] uppercase tracking-[0.12em]">usado</span> : null}
    </button>
  );
}

function TokenSettingsModal({
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

  if (!open) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(36,49,77,0.34)] px-4 py-6">
      <div className="w-full max-w-5xl rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.97)] shadow-[0_30px_80px_rgba(36,49,77,0.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
          <div>
            <h3 className="text-xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">Configurações de tokens</h3>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {companyLabel}. O token institucional é fixo. Nos tokens individuais, resetar remove o vínculo atual; inativar bloqueia o uso; excluir remove o token do sistema.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-[72vh] space-y-6 overflow-y-auto px-6 py-6">
          {status ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--accent)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
              {status}
            </div>
          ) : null}

          {tokenGroups.map((group) => (
            <section key={group.title} className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                {group.title === "Visão empresa" ? <ShieldAlert className="h-4 w-4 text-[var(--primary)]" /> : <KeyRound className="h-4 w-4 text-[var(--primary)]" />}
                {group.title}
              </div>

              <div className="space-y-3">
                {group.tokens.map((token) => {
                  const busy = pendingToken === token.value;
                  const isInstitutionalToken = token.tokenType === "company";

                  return (
                    <div key={token.value} className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4 shadow-sm">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-[var(--foreground)]">{token.label}</p>
                            <span className="rounded-full border border-[var(--border)] bg-[var(--accent)] px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                              {token.tokenType === "company" ? "empresa" : "individual"}
                            </span>
                            <span className="rounded-full border border-[var(--border)] bg-[var(--accent)] px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                              {token.active ? (token.used ? "usado" : "ativo") : "inativo"}
                            </span>
                          </div>
                          <p className="break-all text-sm tracking-[0.08em] text-[var(--foreground)]">{token.value}</p>
                        </div>

                        {isInstitutionalToken ? (
                          <div className="rounded-full border border-[var(--border)] bg-[var(--accent)] px-3 py-2 text-xs font-medium text-[var(--muted-foreground)]">
                            Token institucional protegido
                          </div>
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
                      </div>
                    </div>
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
        "rounded-2xl border p-4",
        tone === "attention"
          ? "border-[rgba(255,91,127,0.18)] bg-[rgba(255,245,248,0.92)]"
          : tone === "positive"
            ? "border-[rgba(106,161,160,0.18)] bg-[rgba(241,248,247,0.92)]"
            : "border-[var(--border)] bg-white"
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

function DimensionBar({ dimension, score }: { dimension: Dimension; score: number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
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
        <div key={signal.name} className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
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
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-[var(--muted-foreground)]">
          <tr>
            <th className="px-3 py-2 font-medium">Segmento</th>
            <th className="px-3 py-2 font-medium">Base</th>
            <th className="px-3 py-2 font-medium">Mediana</th>
            <th className="px-3 py-2 font-medium">Faixa</th>
            <th className="px-3 py-2 font-medium">Maior atenção</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.segment} className="border-t border-[var(--border)]">
              <td className="px-3 py-3 font-medium">{row.segment}</td>
              <td className="px-3 py-3">{row.count}</td>
              <td className="px-3 py-3">{row.median.toFixed(2)}</td>
              <td className="px-3 py-3">{row.riskBand}</td>
              <td className="px-3 py-3">{row.topDimension}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuestionTable({ rows }: { rows: QuestionScore[] }) {
  const ordered = [...rows].sort((a, b) => a.median - b.median);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-[var(--muted-foreground)]">
          <tr>
            <th className="px-3 py-2 font-medium">Fator</th>
            <th className="px-3 py-2 font-medium">Dimensão</th>
            <th className="px-3 py-2 font-medium">Mediana</th>
            <th className="px-3 py-2 font-medium">Média</th>
            <th className="px-3 py-2 font-medium">Baixo escore</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((row) => (
            <tr key={row.id} className="border-t border-[var(--border)] align-top">
              <td className="px-3 py-3"><p className="font-medium text-[var(--foreground)]">{row.text}</p></td>
              <td className="px-3 py-3">
                <Badge variant="outline" className={cn("border", badgeByDimension[row.dimension])}>{row.dimension}</Badge>
              </td>
              <td className="px-3 py-3">{row.median.toFixed(2)}</td>
              <td className="px-3 py-3">{row.average.toFixed(2)}</td>
              <td className="px-3 py-3">{row.lowShare.toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResponseTable({ rows }: { rows: CompanyView["technicalResponseRows"] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-[var(--muted-foreground)]">
          <tr>
            <th className="px-3 py-2 font-medium">Respondente</th>
            <th className="px-3 py-2 font-medium">Índice</th>
            <th className="px-3 py-2 font-medium">Faixa</th>
            <th className="px-3 py-2 font-medium">Sobrecarga</th>
            <th className="px-3 py-2 font-medium">Sono</th>
            <th className="px-3 py-2 font-medium">Pressão</th>
            <th className="px-3 py-2 font-medium">Mais sensível</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-[var(--border)] align-top">
              <td className="px-3 py-3">
                <p className="font-medium text-[var(--foreground)]">{row.team || "Sem time"}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{row.role || "Sem função"} · {new Date(row.submittedAt).toLocaleDateString("pt-BR")}</p>
              </td>
              <td className="px-3 py-3">{row.overallAverage.toFixed(2)}</td>
              <td className="px-3 py-3">{row.riskBand}</td>
              <td className="px-3 py-3">{formatTriagedValue(row.recentOverload)}</td>
              <td className="px-3 py-3">{formatTriagedValue(row.sleepQuality)}</td>
              <td className="px-3 py-3">{formatTriagedValue(row.emotionalPressure)}</td>
              <td className="px-3 py-3">{row.weakestDimension}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
