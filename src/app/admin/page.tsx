"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowUpRight, Building2, LogOut, Plus, Shield, Siren, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TokenRow = {
  value: string;
  used: boolean;
  usedAt?: string;
  label: string;
  reusable: boolean;
  responseId?: string;
  tokenType: "member" | "company";
};

type HighRiskAlertRow = {
  id: string;
  companyId: string;
  companyName: string;
  submittedAt: string;
  team?: string;
  role?: string;
  overallAverage: number;
  riskBand: "Atenção alta" | "Crítico";
  weakestDimension: string;
  strongestDimension: string;
  alerts: string[];
  memberToken: string | null;
  analysisToken: string | null;
  viewKey: string;
};

type RespondentRow = {
  id: string;
  companyId: string;
  companyName: string;
  submittedAt: string;
  team?: string;
  role?: string;
  overallAverage: number;
  riskBand: "Saudável" | "Monitoramento" | "Atenção alta" | "Crítico";
  weakestDimension: string;
  strongestDimension: string;
  alerts: string[];
  memberToken: string | null;
  viewKey: string;
};

interface CompanyRow {
  id: string;
  name: string;
  seats: number;
  createdAt: string;
  totalTokens: number;
  usedTokens: number;
  responseCount: number;
  memberTokens: TokenRow[];
  companyTokens: TokenRow[];
  respondents: RespondentRow[];
  highRiskAlerts: HighRiskAlertRow[];
}

type CompaniesResponse = {
  companies: CompanyRow[];
};

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState("admin");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [seats, setSeats] = useState(10);
  const [status, setStatus] = useState<string | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [alertCompanyFilter, setAlertCompanyFilter] = useState("all");
  const [respondentCompanyFilter, setRespondentCompanyFilter] = useState("all");
  const alerts = useMemo(
    () =>
      companies
        .flatMap((company) => company.highRiskAlerts)
        .sort((a, b) => {
          const severityA = a.riskBand === "Crítico" ? 0 : 1;
          const severityB = b.riskBand === "Crítico" ? 0 : 1;
          if (severityA !== severityB) return severityA - severityB;
          return a.overallAverage - b.overallAverage;
        }),
    [companies]
  );
  const filteredAlerts = useMemo(
    () =>
      alertCompanyFilter === "all"
        ? alerts
        : alerts.filter((alert) => alert.companyId === alertCompanyFilter),
    [alertCompanyFilter, alerts]
  );
  const respondents = useMemo(
    () =>
      companies
        .flatMap((company) => company.respondents)
        .sort((a, b) => a.overallAverage - b.overallAverage),
    [companies]
  );
  const filteredRespondents = useMemo(
    () =>
      respondentCompanyFilter === "all"
        ? respondents
        : respondents.filter((respondent) => respondent.companyId === respondentCompanyFilter),
    [respondentCompanyFilter, respondents]
  );
  const criticalCount = alerts.filter((alert) => alert.riskBand === "Crítico").length;
  const highAttentionCount = alerts.filter((alert) => alert.riskBand === "Atenção alta").length;

  async function fetchCompanies() {
    const res = await fetch("/api/companies");
    if (!res.ok) {
      return { ok: false as const };
    }
    const data = (await res.json()) as CompaniesResponse;
    return { ok: true as const, companies: data.companies };
  }

  async function loadCompanies() {
    setStatus("Carregando...");
    const result = await fetchCompanies();
    if (!result.ok) {
      setStatus("Falha ao carregar empresas. Refaça login.");
      setAuthed(false);
      setCheckingSession(false);
      return;
    }

    setCompanies(result.companies);
    setStatus(null);
    setAuthed(true);
    setCheckingSession(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function hydrateCompanies() {
      setStatus("Carregando...");
      const result = await fetchCompanies();
      if (cancelled) return;

      if (!result.ok) {
        setStatus("Falha ao carregar empresas. Refaça login.");
        setAuthed(false);
        setCheckingSession(false);
        return;
      }

      setCompanies(result.companies);
      setStatus(null);
      setAuthed(true);
      setCheckingSession(false);
    }

    void hydrateCompanies();

    return () => {
      cancelled = true;
    };
  }, []);

  async function login() {
    setAuthError(null);
    setLoading(true);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      setAuthError(data.error ?? "Falha ao autenticar");
      setLoading(false);
      return;
    }
    setAuthed(true);
    setLoading(false);
    setPassword("");
    await loadCompanies();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setCompanies([]);
  }

  async function createCompany() {
    setStatus("Gerando tokens...");
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: companyName, seats }),
    });
    if (!res.ok) {
      const data = await res.json();
      setStatus(data.error ?? "Erro ao criar empresa");
      return;
    }
    setCompanyName("");
    setSeats(10);
    await loadCompanies();
    setStatus("Empresa criada, tokens emitidos e acesso de análise liberado.");
  }

  async function copyToken(value: string) {
    await navigator.clipboard.writeText(value);
    setStatus(`Token ${value} copiado.`);
  }

  async function removeCompany(company: CompanyRow) {
    const confirmed = window.confirm(
      `Excluir a empresa ${company.name}? Isso removerá tokens, dashboards, alertas e respostas vinculadas.`
    );
    if (!confirmed) return;

    setRemovingKey(`company:${company.id}`);
    setStatus(`Excluindo ${company.name}...`);

    const res = await fetch("/api/companies", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: company.id }),
    });

    if (!res.ok) {
      const data = await res.json();
      setStatus(data.error ?? "Erro ao excluir empresa");
      setRemovingKey(null);
      return;
    }

    await loadCompanies();
    setStatus(`Empresa ${company.name} excluída.`);
    setRemovingKey(null);
  }

  async function removeResponse(responseId: string, label: string) {
    const confirmed = window.confirm(
      `Excluir o registro de ${label}? Isso removerá o dashboard individual e liberará o token para reutilização.`
    );
    if (!confirmed) return;

    setRemovingKey(`response:${responseId}`);
    setStatus(`Excluindo registro de ${label}...`);

    const res = await fetch("/api/companies", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responseId }),
    });

    if (!res.ok) {
      const data = await res.json();
      setStatus(data.error ?? "Erro ao excluir colaborador");
      setRemovingKey(null);
      return;
    }

    await loadCompanies();
    setStatus(`Registro de ${label} excluído e token liberado.`);
    setRemovingKey(null);
  }

  function openCompanyDashboard(companyId: string) {
    router.push(`/dashboard?companyId=${companyId}&fromAdmin=1`);
  }

  if (checkingSession) {
    return (
      <div className="shell-page flex min-h-screen items-center justify-center px-6">
        <Card className="w-full max-w-md px-2 py-3 shadow-[0_24px_64px_rgba(129,155,179,0.18)]">
          <CardContent className="p-6 text-center text-sm text-[var(--muted-foreground)]">
            Verificando sessão administrativa...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="shell-page flex min-h-screen items-center justify-center px-6">
        <Card className="w-full max-w-md px-2 py-3 shadow-[0_24px_64px_rgba(129,155,179,0.18)]">
          <CardHeader>
            <div className="flex justify-center">
              <span className="hero-pill hero-pill--dark">
                <Shield className="h-3.5 w-3.5" />
                Painel operacional
              </span>
            </div>
            <CardTitle className="mt-4 text-center text-4xl tracking-[-0.05em]">Acesso Administrativo</CardTitle>
            <CardDescription className="mt-3 text-center text-base leading-7">
              Acesso ao painel de geração de tokens e dashboards organizacionais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field htmlFor="user" label="E-mail corporativo">
              <Input id="user" value={user} onChange={(e) => setUser(e.target.value)} />
            </Field>
            <Field htmlFor="password" label="Senha master">
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            {authError && <p className="text-sm text-[var(--foreground)]">{authError}</p>}
            <Button disabled={loading} onClick={login} className="w-full" size="lg">
              {loading ? "Autenticando..." : "Autenticar"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="shell-page min-h-screen px-6 py-10 text-[var(--foreground)]">
      <div className="mx-auto max-w-7xl space-y-8">
        <Card className="overflow-hidden border-[rgba(106,161,160,0.18)] bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(238,246,246,0.88))] shadow-[0_24px_60px_rgba(129,155,179,0.14)]">
          <CardContent className="grid gap-8 p-6 xl:grid-cols-[minmax(0,1.2fr)_auto] xl:items-start lg:p-8">
            <div className="space-y-5">
              <span className="hero-pill hero-pill--dark">
                <Shield className="h-3.5 w-3.5" />
                Painel operacional
              </span>
              <div className="space-y-3">
                <h1 className="text-4xl font-semibold tracking-[-0.05em] md:text-5xl">Gestão Método Sert</h1>
                <p className="max-w-3xl text-base leading-8 text-[var(--muted-foreground)]">
                  Centralize a operação das empresas, gere acessos, distribua o token de análise para diretoria e RH e acompanhe os casos que pedem leitura clínica mais rápida.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 xl:min-w-[220px] xl:items-end">
              <Button variant="outline" onClick={loadCompanies} className="w-full xl:w-auto">
                Atualizar base
              </Button>
              <Button variant="ghost" onClick={logout} className="w-full justify-center text-base shadow-none xl:w-auto xl:justify-start">
                <LogOut className="h-4 w-4" />
                Sair do sistema
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 md:grid-cols-3">
          <SummaryCard label="Empresas ativas" value={`${companies.length}`} helper="Bases disponíveis no painel" icon={Building2} />
          <SummaryCard label="Leituras processadas" value={`${respondents.length}`} helper="Volumetria total respondida" icon={Activity} />
          <SummaryCard label="Casos de alta atenção" value={`${criticalCount + highAttentionCount}`} helper="Crítico + atenção alta" icon={Siren} critical />
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden border-[rgba(106,161,160,0.16)]">
            <CardHeader className="space-y-3">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(106,161,160,0.18)] bg-[rgba(106,161,160,0.08)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                <Plus className="h-3.5 w-3.5" />
                Nova empresa
              </div>
              <div>
                <CardTitle className="text-2xl tracking-[-0.04em]">Gerar acessos</CardTitle>
                <CardDescription>
                  Cadastre a empresa, defina a base de colaboradores e libere o pacote inicial de tokens.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_auto] lg:items-end">
              <Field htmlFor="companyName" label="Empresa">
                <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nome da empresa" />
              </Field>
              <Field htmlFor="seats" label="Quantidade de colaboradores (tokens individuais)">
                <Input id="seats" type="number" min={1} value={seats} onChange={(e) => setSeats(Number(e.target.value))} />
              </Field>
              <Button onClick={createCompany} className="w-full justify-center lg:w-auto">
                <Plus className="h-4 w-4" />
                Gerar acessos
              </Button>
              {status && (
                <p className="rounded-2xl border border-[var(--border)] bg-[var(--accent)] px-4 py-3 text-sm text-[var(--muted-foreground)] lg:col-span-3">
                  {status}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-[rgba(136,163,191,0.18)] shadow-[0_22px_54px_rgba(129,155,179,0.12)]">
            <CardHeader className="space-y-4 border-b border-[var(--border)] bg-[rgba(255,255,255,0.55)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl tracking-[-0.04em]">Operação por empresa e casos</CardTitle>
                  <CardDescription className="max-w-3xl">
                    Navegue entre empresas, alertas e colaboradores com uma estrutura mais enxuta para acesso, acompanhamento e ação.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-[var(--muted-foreground)]">
                  <MiniStat value={`${companies.length}`} label="empresas" />
                  <MiniStat value={`${alerts.length}`} label="alertas" />
                  <MiniStat value={`${respondents.length}`} label="colaboradores" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-4 md:p-6">
              <Tabs defaultValue="companies" className="space-y-6">
                <TabsList className="grid w-full grid-cols-1 gap-2 md:grid-cols-3">
                  <TabsTrigger value="companies">
                    <TabLabel icon={Building2} title="Empresas e tokens" meta={`${companies.length} empresa(s)`} />
                  </TabsTrigger>
                  <TabsTrigger value="alerts">
                    <TabLabel icon={Siren} title="Monitor de alertas" meta={`${filteredAlerts.length} caso(s)`} />
                  </TabsTrigger>
                  <TabsTrigger value="people">
                    <TabLabel icon={Users} title="Base de colaboradores" meta={`${filteredRespondents.length} pessoa(s)`} />
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="companies" className="space-y-6 pt-2">
                  <PanelIntro
                    title="Empresas e acessos"
                    description="Cada empresa fica em um card clicável. Toque no card para abrir a visão da empresa e use os controles apenas para ações secundárias."
                    meta={`${companies.length} empresa(s) cadastrada(s)`}
                  />

                  <div className="rounded-[2rem] border border-[rgba(129,155,179,0.14)] bg-[rgba(255,255,255,0.5)] p-3 md:p-4">
                    <div className="grid gap-5 md:max-h-[760px] md:grid-cols-2 md:overflow-y-auto md:pr-2 xl:grid-cols-3">
                      {companies.map((company) => {
                        const analysisToken = company.companyTokens[0];
                        const availableTokens = company.memberTokens.filter((token) => !token.used).length;
                        return (
                          <Card
                            key={company.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => openCompanyDashboard(company.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                openCompanyDashboard(company.id);
                              }
                            }}
                            className="group flex h-full cursor-pointer overflow-hidden rounded-[2rem] border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(247,250,251,0.88))] shadow-[0_14px_30px_rgba(129,155,179,0.10)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(129,155,179,0.16)]"
                          >
                            <CardContent className="flex h-full flex-1 flex-col gap-6 p-6">
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <p className="text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{company.name}</p>
                                    <ArrowUpRight className="h-4 w-4 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                  </div>
                                  <p className="text-sm text-[var(--muted-foreground)]">
                                    Criada em {new Date(company.createdAt).toLocaleDateString("pt-BR")}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void removeCompany(company);
                                    }}
                                    aria-label={`Excluir empresa ${company.name}`}
                                    disabled={removingKey === `company:${company.id}`}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(255,91,127,0.16)] bg-[rgba(255,245,248,0.92)] text-[var(--destructive)] transition-colors hover:bg-[rgba(255,235,242,0.92)] disabled:opacity-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <DataPoint label="Respostas" value={`${company.responseCount}`} />
                                <DataPoint label="Tokens totais" value={`${company.totalTokens}`} />
                                <DataPoint label="Disponíveis" value={`${availableTokens}`} tone="soft" />
                                <DataPoint
                                  label="Alertas"
                                  value={`${company.highRiskAlerts.length}`}
                                  tone={company.highRiskAlerts.length ? "attention" : "soft"}
                                />
                              </div>

                              <div className="mt-auto rounded-[1.4rem] border border-[rgba(106,161,160,0.16)] bg-[rgba(238,246,246,0.62)] p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                                      Token institucional
                                    </p>
                                    <p className="mt-2 break-all text-sm font-semibold tracking-[0.06em] text-[var(--foreground)]">
                                      {analysisToken?.value ?? "Indisponível"}
                                    </p>
                                  </div>
                                  {analysisToken ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void copyToken(analysisToken.value);
                                      }}
                                    >
                                      Copiar
                                    </Button>
                                  ) : null}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2 pt-1 text-xs">
                                <InlineMetric label="usados" value={`${company.usedTokens}`} tone={company.usedTokens ? "attention" : "soft"} />
                                <InlineMetric label="totais" value={`${company.memberTokens.length}`} />
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                      {!companies.length && <EmptyState message="Nenhuma empresa cadastrada ainda." />}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="alerts" className="space-y-5">
                  <PanelIntro
                    title="Monitor de alertas"
                    description="Concentre a triagem dos casos com maior urgência clínica e reabra o dashboard certo com poucos cliques."
                    meta={`${filteredAlerts.length} caso(s) exibido(s)`}
                  />

                  <div className="grid gap-4 md:grid-cols-[minmax(0,280px)_1fr] md:items-end">
                    <Field htmlFor="alert-company-filter" label="Filtrar por empresa">
                      <Select
                        id="alert-company-filter"
                        value={alertCompanyFilter}
                        onChange={(e) => setAlertCompanyFilter(e.target.value)}
                      >
                        <option value="all">Todas as empresas</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--accent)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                      Casos ordenados por gravidade e índice geral para facilitar priorização.
                    </div>
                  </div>

                  <div className="space-y-4 overflow-y-auto pr-1 md:max-h-[760px]">
                    {filteredAlerts.map((alert) => (
                      <div key={alert.id} className="space-y-4 rounded-[1.8rem] border border-[var(--border)] bg-white p-5 shadow-[0_14px_30px_rgba(129,155,179,0.10)]">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={alert.riskBand === "Crítico" ? "default" : "secondary"}>{alert.riskBand}</Badge>
                              <Badge variant="outline">{alert.companyName}</Badge>
                              <Badge variant="outline">Índice {alert.overallAverage.toFixed(2)}</Badge>
                            </div>
                            <div>
                              <p className="text-base font-semibold text-[var(--foreground)]">{alert.team || "Sem time"} · {alert.role || "Sem função"}</p>
                              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                                Respondido em {new Date(alert.submittedAt).toLocaleString("pt-BR")} · dimensão mais sensível: {alert.weakestDimension}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 xl:justify-end">
                            <Link href={`/dashboard?view=${alert.viewKey}&fromAdmin=1`}>
                              <Button size="sm">Abrir dashboard do caso</Button>
                            </Link>
                            <Link href={`/dashboard?view=${alert.viewKey}&adminScope=individual-complete&fromAdmin=1`}>
                              <Button size="sm" variant="outline">Abrir dashboard completo</Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={removingKey === `response:${alert.id}`}
                              onClick={() => void removeResponse(alert.id, `${alert.team || "Sem time"} · ${alert.role || "Sem função"}`)}
                            >
                              {removingKey === `response:${alert.id}` ? "Excluindo..." : "Excluir alerta"}
                            </Button>
                            {alert.memberToken && (
                              <Button size="sm" variant="outline" onClick={() => copyToken(alert.memberToken!)}>
                                Copiar token do colaborador
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
                          <div className="space-y-3 rounded-2xl border border-[rgba(106,161,160,0.18)] bg-[rgba(238,246,246,0.62)] p-4">
                            <p className="text-sm font-semibold">Mapeamento do acesso</p>
                            <div className="space-y-2 text-sm text-[var(--muted-foreground)]">
                              <p>Token do colaborador: {alert.memberToken ?? "não localizado"}</p>
                              <p>Dashboard individual liberado para leitura clínica pela sessão administrativa.</p>
                            </div>
                          </div>

                          <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-white p-4">
                            <p className="text-sm font-semibold">Sinais de alerta</p>
                            {alert.alerts.slice(0, 4).map((item) => (
                              <p key={item} className="rounded-xl border border-[var(--border)] bg-[var(--accent)] px-3 py-3 text-sm leading-6">
                                {item}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}

                    {!filteredAlerts.length && <EmptyState message="Nenhum caso encontrado para o filtro selecionado." />}
                  </div>
                </TabsContent>

                <TabsContent value="people" className="space-y-5">
                  <PanelIntro
                    title="Base de colaboradores"
                    description="Reabra casos, consulte o token individual e revise rapidamente os principais sinais associados a cada resposta."
                    meta={`${filteredRespondents.length} colaborador(es) exibido(s)`}
                  />

                  <div className="grid gap-4 md:grid-cols-[minmax(0,280px)_1fr] md:items-end">
                    <Field htmlFor="respondent-company-filter" label="Filtrar colaboradores por empresa">
                      <Select
                        id="respondent-company-filter"
                        value={respondentCompanyFilter}
                        onChange={(e) => setRespondentCompanyFilter(e.target.value)}
                      >
                        <option value="all">Todas as empresas</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--accent)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                      Lista ordenada pelo índice geral para leitura operacional e clínica mais rápida.
                    </div>
                  </div>

                  <div className="space-y-4 overflow-y-auto pr-1 md:max-h-[760px]">
                    {filteredRespondents.map((respondent) => (
                      <div key={respondent.id} className="space-y-4 rounded-[1.8rem] border border-[var(--border)] bg-white p-5 shadow-[0_14px_30px_rgba(129,155,179,0.10)]">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{respondent.companyName}</Badge>
                              <Badge variant="secondary">{respondent.riskBand}</Badge>
                              <Badge variant="outline">Índice {respondent.overallAverage.toFixed(2)}</Badge>
                            </div>
                            <div>
                              <p className="text-base font-semibold text-[var(--foreground)]">
                                {respondent.team || "Sem time"} · {respondent.role || "Sem função"}
                              </p>
                              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                                Respondido em {new Date(respondent.submittedAt).toLocaleString("pt-BR")} · dimensão mais sensível: {respondent.weakestDimension}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 xl:justify-end">
                            <Link href={`/dashboard?view=${respondent.viewKey}&fromAdmin=1`}>
                              <Button size="sm" variant="outline">Visão membro</Button>
                            </Link>
                            <Link href={`/dashboard?view=${respondent.viewKey}&adminScope=individual-complete&fromAdmin=1`}>
                              <Button size="sm">Dashboard completo</Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={removingKey === `response:${respondent.id}`}
                              onClick={() => void removeResponse(respondent.id, `${respondent.team || "Sem time"} · ${respondent.role || "Sem função"}`)}
                            >
                              {removingKey === `response:${respondent.id}` ? "Excluindo..." : "Excluir colaborador"}
                            </Button>
                            {respondent.memberToken && (
                              <Button size="sm" variant="outline" onClick={() => copyToken(respondent.memberToken!)}>
                                Copiar token
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.74fr)_minmax(0,1.26fr)]">
                          <div className="space-y-3 rounded-2xl border border-[rgba(106,161,160,0.18)] bg-[rgba(238,246,246,0.62)] p-4">
                            <p className="text-sm font-semibold">Acesso do psicólogo</p>
                            <div className="space-y-2 text-sm text-[var(--muted-foreground)]">
                              <p>Visão membro: leitura individual protegida.</p>
                              <p>Dashboard completo: mesma linguagem da visão empresa, focada em um único colaborador.</p>
                            </div>
                          </div>

                          <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-white p-4">
                            <p className="text-sm font-semibold">Principais sinais</p>
                            {respondent.alerts.slice(0, 3).map((item) => (
                              <p key={item} className="rounded-xl border border-[var(--border)] bg-[var(--accent)] px-3 py-3 text-sm leading-6">
                                {item}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}

                    {!filteredRespondents.length && <EmptyState message="Nenhum colaborador encontrado para o filtro selecionado." />}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

type FieldProps = {
  children: ReactNode;
  htmlFor: string;
  label: string;
};

function Field({ children, htmlFor, label }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  icon: Icon,
  critical = false,
}: {
  label: string;
  value: string;
  helper: string;
  icon?: ComponentType<{ className?: string }>;
  critical?: boolean;
}) {
  return (
    <Card className="metric-card">
      <CardContent className="flex min-h-[216px] flex-col p-0">
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">{label}</p>
          {Icon ? (
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                critical
                  ? "bg-[rgba(255,91,127,0.12)] text-[var(--destructive)]"
                  : "bg-[rgba(106,161,160,0.10)] text-[var(--primary)]"
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
        </div>
        <p className="mt-8 text-5xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">{value}</p>
        <p className={`mt-auto pt-4 text-sm ${critical ? "text-[var(--destructive)]" : "text-[var(--primary)]"}`}>{helper}</p>
      </CardContent>
    </Card>
  );
}

function PanelIntro({ title, description, meta }: { title: string; description: string; meta: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-[1.6rem] border border-[var(--border)] bg-[rgba(255,255,255,0.65)] px-4 py-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1">
        <p className="text-lg font-semibold tracking-[-0.03em] text-[var(--foreground)]">{title}</p>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
      </div>
      <div className="text-xs font-mono uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{meta}</div>
    </div>
  );
}

function InlineMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "attention" | "soft";
}) {
  return (
    <div
      className={`rounded-full border px-3 py-2 text-sm ${
        tone === "attention"
          ? "border-[rgba(255,91,127,0.18)] bg-[rgba(255,245,248,0.92)] text-[var(--destructive)]"
          : tone === "soft"
            ? "border-[rgba(106,161,160,0.16)] bg-[rgba(238,246,246,0.92)] text-[var(--primary)]"
          : "border-[var(--border)] bg-[var(--accent)] text-[var(--muted-foreground)]"
      }`}
    >
      <span className="font-medium text-[var(--foreground)]">{value}</span> {label}
    </div>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-full border border-[var(--border)] bg-[var(--accent)] px-3 py-2">
      <span className="font-semibold text-[var(--foreground)]">{value}</span> {label}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-5 text-sm text-[var(--muted-foreground)] shadow-sm">
      {message}
    </div>
  );
}

function TabLabel({
  icon: Icon,
  title,
  meta,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  meta: string;
}) {
  return (
    <span className="flex w-full items-center justify-between gap-3 text-left">
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span>{title}</span>
      </span>
      <span className="rounded-full bg-[rgba(255,255,255,0.48)] px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.14em]">
        {meta}
      </span>
    </span>
  );
}

function DataPoint({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "soft" | "attention";
}) {
  return (
    <div
      className={`rounded-[1.2rem] border px-4 py-3 ${
        tone === "attention"
          ? "border-[rgba(255,91,127,0.18)] bg-[rgba(255,245,248,0.92)]"
          : tone === "soft"
            ? "border-[rgba(106,161,160,0.16)] bg-[rgba(238,246,246,0.82)]"
            : "border-[var(--border)] bg-[rgba(255,255,255,0.72)]"
      }`}
    >
      <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{value}</p>
    </div>
  );
}
