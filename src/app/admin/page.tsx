"use client";

import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { useMemo, useState } from "react";
import { Activity, Building2, LogOut, Plus, Shield, Siren } from "lucide-react";
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
  const [user, setUser] = useState("admin");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
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

  async function loadCompanies() {
    setStatus("Carregando...");
    const res = await fetch("/api/companies");
    if (!res.ok) {
      setStatus("Falha ao carregar empresas. Refaça login.");
      setAuthed(false);
      return;
    }
    const data = (await res.json()) as CompaniesResponse;
    setCompanies(data.companies);
    setStatus(null);
  }

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
      <div className="mx-auto mb-10 flex max-w-7xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="hero-pill hero-pill--dark">
            <Shield className="h-3.5 w-3.5" />
            Painel operacional
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] md:text-5xl">Gestão Método Sert</h1>
          <p className="mt-3 max-w-3xl text-base leading-8 text-[var(--muted-foreground)]">
            Gere tokens individuais, distribua o token de análise para diretoria/RH e reabra os dashboards da empresa no admin.
          </p>
        </div>
        <Button variant="ghost" onClick={logout} className="justify-start px-0 text-base shadow-none">
          <LogOut className="h-4 w-4" />
          Sair do sistema
        </Button>
      </div>

      <div className="mx-auto mb-8 grid max-w-7xl gap-5 md:grid-cols-3">
        <SummaryCard label="Empresas ativas" value={`${companies.length}`} helper="Bases disponíveis no admin" icon={Building2} />
        <SummaryCard label="Leituras processadas" value={`${respondents.length}`} helper="Volumetria total respondida" icon={Activity} />
        <SummaryCard label="Casos alta atenção" value={`${criticalCount + highAttentionCount}`} helper="Crítico + atenção alta" icon={Siren} critical />
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.35fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl tracking-[-0.04em]">Nova empresa</CardTitle>
            <CardDescription>
              Cada empresa recebe tokens individuais para membros e 1 token separado para visão empresa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field htmlFor="companyName" label="Empresa">
              <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nome da empresa" />
            </Field>
            <Field htmlFor="seats" label="Quantidade de colaboradores (tokens individuais)">
              <Input id="seats" type="number" min={1} value={seats} onChange={(e) => setSeats(Number(e.target.value))} />
            </Field>
            <Button onClick={createCompany}>
              <Plus className="h-4 w-4" />
              Gerar acessos
            </Button>
            {status && <p className="text-sm text-[var(--muted-foreground)]">{status}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-2xl tracking-[-0.04em]">Painel operacional</CardTitle>
              <CardDescription>
                Administre acessos por empresa e acompanhe em separado os casos com risco alto para atuação clínica.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadCompanies}>Atualizar</Button>
          </CardHeader>
          <CardContent className="space-y-5">
            <Tabs defaultValue="companies" className="space-y-5">
              <TabsList className="grid w-full grid-cols-2 gap-2 lg:grid-cols-3">
                <TabsTrigger value="companies">Empresas e tokens</TabsTrigger>
                <TabsTrigger value="alerts">Monitor de alertas</TabsTrigger>
                <TabsTrigger value="people">Base de dados</TabsTrigger>
              </TabsList>

              <TabsContent value="companies">
                <div className="space-y-4 overflow-y-auto pr-1 md:max-h-[720px]">
                  {companies.map((company) => {
                    const analysisToken = company.companyTokens[0];
                    return (
                      <div key={company.id} className="space-y-4 rounded-[1.8rem] border border-[var(--border)] bg-[rgba(255,255,255,0.8)] p-5 shadow-[0_14px_34px_rgba(129,155,179,0.10)]">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="text-lg font-semibold tracking-[-0.03em] text-[var(--foreground)]">{company.name}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              {company.responseCount} respostas · {company.usedTokens}/{company.totalTokens} tokens individuais usados · {company.highRiskAlerts.length} alerta(s) de risco alto · criado em {new Date(company.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/dashboard?accessToken=${analysisToken?.value ?? ""}`}>
                              <Button size="sm" variant="outline">Abrir visão empresa</Button>
                            </Link>
                            <Link href={`/dashboard?companyId=${company.id}`}>
                              <Button size="sm">Abrir dashboard no admin</Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={removingKey === `company:${company.id}`}
                              onClick={() => void removeCompany(company)}
                            >
                              {removingKey === `company:${company.id}` ? "Excluindo..." : "Excluir empresa"}
                            </Button>
                          </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                          <div className="space-y-3 rounded-[1.5rem] border border-[var(--border)] bg-white p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold">Token da diretoria / RH</p>
                                <p className="text-xs text-[var(--muted-foreground)]">Acesso exclusivo à visão empresa.</p>
                              </div>
                              {analysisToken && (
                                <Button size="sm" variant="outline" onClick={() => copyToken(analysisToken.value)}>
                                  Copiar
                                </Button>
                              )}
                            </div>
                            {analysisToken ? (
                              <Badge variant="secondary" className="break-all text-left">{analysisToken.value}</Badge>
                            ) : (
                              <p className="text-sm text-[var(--muted-foreground)]">Nenhum token de análise disponível.</p>
                            )}
                          </div>

                          <div className="space-y-3 rounded-[1.5rem] border border-[var(--border)] bg-white p-4">
                            <p className="text-sm font-semibold">Tokens de membros</p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              O token individual fica mapeado ao caso respondido e agora também alimenta a aba de alertas quando o risco sobe.
                            </p>
                            <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto pr-1 text-xs">
                              {company.memberTokens.map((token) => (
                                <button
                                  key={token.value}
                                  type="button"
                                  onClick={() => copyToken(token.value)}
                                  className="rounded-full border border-[var(--border)] bg-[var(--accent)] px-3 py-2 text-left"
                                >
                                  {token.value} {token.used ? "(usado)" : ""}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {!companies.length && <p className="text-sm text-[var(--muted-foreground)]">Nenhuma empresa cadastrada ainda.</p>}
                </div>
              </TabsContent>

              <TabsContent value="alerts">
                <div className="mb-4 grid gap-4 md:grid-cols-[minmax(0,280px)_1fr] md:items-end">
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
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {filteredAlerts.length} caso(s) exibido(s) na aba de alertas.
                  </p>
                </div>

                <div className="space-y-4 overflow-y-auto pr-1 md:max-h-[720px]">
                  {filteredAlerts.map((alert) => (
                    <div key={alert.id} className="space-y-4 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={alert.riskBand === "Crítico" ? "default" : "secondary"}>{alert.riskBand}</Badge>
                            <Badge variant="outline">{alert.companyName}</Badge>
                            <Badge variant="outline">Índice {alert.overallAverage.toFixed(2)}</Badge>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--foreground)]">{alert.team || "Sem time"} · {alert.role || "Sem função"}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              Respondido em {new Date(alert.submittedAt).toLocaleString("pt-BR")} · dimensão mais sensível: {alert.weakestDimension}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link href={`/dashboard?view=${alert.viewKey}`}>
                            <Button size="sm">Abrir dashboard do caso</Button>
                          </Link>
                          <Link href={`/dashboard?view=${alert.viewKey}&adminScope=individual-complete`}>
                            <Button size="sm" variant="outline">Abrir dashboard completo</Button>
                          </Link>
                          <Link href={`/dashboard?companyId=${alert.companyId}`}>
                            <Button size="sm" variant="outline">Abrir visão empresa</Button>
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

                      <div className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
                        <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--accent)] p-4">
                          <p className="text-sm font-semibold">Mapeamento do acesso</p>
                          <div className="space-y-2 text-xs text-[var(--muted-foreground)]">
                            <p>Token do colaborador: {alert.memberToken ?? "não localizado"}</p>
                            <p>Dashboard individual: liberado pela sessão do admin para avaliação clínica.</p>
                          </div>
                        </div>

                        <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-white p-4">
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

                  {!filteredAlerts.length && (
                    <div className="rounded-2xl border border-[var(--border)] bg-white p-5 text-sm text-[var(--muted-foreground)] shadow-sm">
                      Nenhum caso encontrado para o filtro selecionado.
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="people">
                <div className="mb-4 grid gap-4 md:grid-cols-[minmax(0,280px)_1fr] md:items-end">
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
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {filteredRespondents.length} colaborador(es) com resposta disponível no filtro atual.
                  </p>
                </div>

                <div className="space-y-4 overflow-y-auto pr-1 md:max-h-[720px]">
                  {filteredRespondents.map((respondent) => (
                    <div key={respondent.id} className="space-y-4 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{respondent.companyName}</Badge>
                            <Badge variant="secondary">{respondent.riskBand}</Badge>
                            <Badge variant="outline">Índice {respondent.overallAverage.toFixed(2)}</Badge>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--foreground)]">
                              {respondent.team || "Sem time"} · {respondent.role || "Sem função"}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              Respondido em {new Date(respondent.submittedAt).toLocaleString("pt-BR")} · mais sensível: {respondent.weakestDimension}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link href={`/dashboard?view=${respondent.viewKey}`}>
                            <Button size="sm" variant="outline">Visão membro</Button>
                          </Link>
                          <Link href={`/dashboard?view=${respondent.viewKey}&adminScope=individual-complete`}>
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

                      <div className="grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
                        <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--accent)] p-4">
                          <p className="text-sm font-semibold">Acesso do psicólogo</p>
                          <div className="space-y-2 text-xs text-[var(--muted-foreground)]">
                            <p>Visão membro: leitura individual protegida.</p>
                            <p>Dashboard completo: mesma linguagem da visão empresa, porém focada em um único colaborador.</p>
                          </div>
                        </div>

                        <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-white p-4">
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

                  {!filteredRespondents.length && (
                    <div className="rounded-2xl border border-[var(--border)] bg-white p-5 text-sm text-[var(--muted-foreground)] shadow-sm">
                      Nenhum colaborador encontrado para o filtro selecionado.
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
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
      <CardContent className="p-0">
        {Icon ? (
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ${
              critical
                ? "bg-[rgba(255,91,127,0.12)] text-[var(--destructive)]"
                : "bg-[rgba(106,161,160,0.10)] text-[var(--primary)]"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">{label}</p>
        <p className="mt-2 text-5xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">{value}</p>
        <p className={`mt-2 text-sm ${critical ? "text-[var(--destructive)]" : "text-[var(--primary)]"}`}>{helper}</p>
      </CardContent>
    </Card>
  );
}
