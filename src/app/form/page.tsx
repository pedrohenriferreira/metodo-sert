"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState, startTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, HeartPulse, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getConsentDisclosureText, getConsentVersion } from "@/lib/governance";
import { Dimension, questions } from "@/lib/questions";
import { cn } from "@/lib/utils";

const likertScale = [
  { value: 1, label: "Discordo totalmente" },
  { value: 2, label: "Discordo" },
  { value: 3, label: "Neutro" },
  { value: 4, label: "Concordo" },
  { value: 5, label: "Concordo totalmente" },
];

const badgeByDimension: Record<Dimension, string> = {
  "Demanda e Ritmo": "border-[var(--border)] bg-[var(--accent)] text-[var(--foreground)]",
  "Clareza e Autonomia": "border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)]",
  Reconhecimento: "border-[var(--border)] bg-[var(--accent)] text-[var(--foreground)]",
  Relacionamentos: "border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)]",
  "Segurança Psicológica": "border-[var(--border)] bg-[var(--accent)] text-[var(--foreground)]",
  "Suporte Organizacional": "border-[var(--border)] bg-[var(--accent)] text-[var(--foreground)]",
};

type AnswersState = Record<string, number>;

type SubmitResponse = {
  viewKey: string;
  memberToken: string;
};

type TokenValidation = {
  valid: boolean;
  company?: { id: string; name: string };
  token?: { value: string; used: boolean; tokenType?: "member" | "company"; label?: string };
  remaining?: number;
  total?: number;
  error?: string;
};

type TriageForm = {
  workModel: "presencial" | "remoto" | "hibrido" | "";
  shift: "diurno" | "noturno" | "turnos" | "";
  tenureMonths: number;
  area: string;
  leadership: "sim" | "nao" | "";
  publicExposure: "alta" | "media" | "baixa" | "";
  recentOverload: "sim" | "nao" | "";
  sleepQuality: "boa" | "regular" | "ruim" | "";
  weeklyHours: number;
  energyLevel: "preservada" | "oscilando" | "esgotada" | "";
  emotionalPressure: "baixa" | "media" | "alta" | "";
  motivationLevel: "preservada" | "oscilando" | "reduzida" | "";
  socialIsolation: "nao" | "pontual" | "frequente" | "";
};

const triageTopics = [
  {
    icon: Activity,
    title: "Burnout e fadiga",
    text: "Mapeamos energia, carga horária, sobrecarga e sono para estimar esgotamento ocupacional.",
  },
  {
    icon: HeartPulse,
    title: "Ansiedade e pressão",
    text: "Incluímos pressão emocional, exposição e segurança para identificar tensão sustentada.",
  },
  {
    icon: Users,
    title: "Humor e conexão",
    text: "Motivação e sensação de isolamento ajudam a revelar retração, tristeza e desconexão social.",
  },
];

const FORM_ACCESS_SESSION_KEY = "metodo-sert:validated-member-token";
const INITIAL_ANSWERS: AnswersState = Object.fromEntries(questions.map((q) => [q.id, 3]));
const INITIAL_TRIAGE: TriageForm = {
  workModel: "",
  shift: "",
  tenureMonths: 0,
  area: "",
  leadership: "",
  publicExposure: "",
  recentOverload: "",
  sleepQuality: "",
  weeklyHours: 40,
  energyLevel: "",
  emotionalPressure: "",
  motivationLevel: "",
  socialIsolation: "",
};

export default function FormPage() {
  return (
    <Suspense fallback={<FormLoadingState />}>
      <FormContent />
    </Suspense>
  );
}

function FormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenFromQuery = searchParams.get("token") ?? "";
  const stepParam = searchParams.get("step") ?? "token";
  const requestedStep =
    stepParam === "legal" || stepParam === "triage" || stepParam === "form" ? stepParam : "token";
  const [answers, setAnswers] = useState<AnswersState>(() => ({ ...INITIAL_ANSWERS }));
  const [token, setToken] = useState(() => tokenFromQuery);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [tokenValidated, setTokenValidated] = useState(false);
  const [phase, setPhase] = useState<"token" | "legal" | "triage" | "form">(
    tokenFromQuery && requestedStep !== "token" ? requestedStep : "token"
  );
  const [team, setTeam] = useState("");
  const [role, setRole] = useState("");
  const [tenureUnit, setTenureUnit] = useState<"months" | "years">("months");
  const [tenureValue, setTenureValue] = useState("");
  const [triage, setTriage] = useState<TriageForm>({ ...INITIAL_TRIAGE });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [hydratingToken, setHydratingToken] = useState(false);
  const [redirectingToDashboard, setRedirectingToDashboard] = useState(false);

  const consentDisclosure = getConsentDisclosureText();
  const consentVersion = getConsentVersion();

  const persistValidatedToken = useCallback((validatedToken: string) => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(FORM_ACCESS_SESSION_KEY, validatedToken);
  }, []);

  const clearValidatedToken = useCallback(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(FORM_ACCESS_SESSION_KEY);
  }, []);

  const resetAssessmentState = useCallback(() => {
    setAnswers({ ...INITIAL_ANSWERS });
    setTeam("");
    setRole("");
    setTenureUnit("months");
    setTenureValue("");
    setTriage({ ...INITIAL_TRIAGE });
    setConsentAccepted(false);
  }, []);

  const setFormUrlState = useCallback(
    (nextStep: "token" | "legal" | "triage" | "form", nextToken: string) => {
      const params = new URLSearchParams();
      if (nextToken) {
        params.set("token", nextToken);
      }
      if (nextStep !== "token") {
        params.set("step", nextStep);
      }

      const query = params.toString();
      router.replace(query ? `/form?${query}` : "/form");
    },
    [router]
  );

  const validateCurrentToken = useCallback(async (value?: string) => {
    const tokenValue = (value ?? token).trim();
    if (!tokenValue) {
      setStatus("Informe o token enviado pela consultoria.");
      setTokenValidated(false);
      return;
    }

    try {
      const response = await fetch("/api/tokens/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenValue }),
      });

      const data = (await response.json()) as TokenValidation;
      if (!response.ok || !data.valid) {
        setStatus(data.error ?? "Token inválido ou já utilizado.");
        setCompanyName(null);
        setTokenValidated(false);
        return;
      }

      if (data.token?.tokenType === "company") {
        setCompanyName(data.company?.name ?? null);
        setTokenValidated(false);
        setStatus(`Token institucional validado para ${data.company?.name ?? "empresa"}. Abrindo visão empresa...`);
        router.push(`/dashboard?accessToken=${tokenValue}`);
        return;
      }

      setCompanyName(data.company?.name ?? null);
      resetAssessmentState();
      setTokenValidated(true);
      persistValidatedToken(tokenValue);
      setStatus(
        `Token individual válido para ${data.company?.name ?? "empresa"} · revise os termos para seguir com a triagem. Saldo ${data.remaining}/${data.total}`
      );
      setPhase("legal");
      setFormUrlState("legal", tokenValue);
    } catch {
      setStatus("Não foi possível validar o token agora. Verifique sua conexão e tente novamente.");
      setCompanyName(null);
      setTokenValidated(false);
    }
  }, [persistValidatedToken, resetAssessmentState, router, setFormUrlState, token]);

  useEffect(() => {
    setToken(tokenFromQuery);
  }, [tokenFromQuery]);

  useEffect(() => {
    if (redirectingToDashboard) {
      return;
    }

    if (requestedStep !== "token") {
      const storedToken =
        typeof window !== "undefined" ? window.sessionStorage.getItem(FORM_ACCESS_SESSION_KEY) : null;

      if (!storedToken || storedToken !== token) {
        setToken("");
        resetAssessmentState();
        setTokenValidated(false);
        setCompanyName(null);
        setPhase("token");
        setStatus("Valide o token novamente para continuar com segurança.");
        setFormUrlState("token", "");
        return;
      }
    }

    if (!token || requestedStep === "token" || tokenValidated) {
      return;
    }

    let cancelled = false;

    async function hydrateValidatedToken() {
      setHydratingToken(true);

      try {
        const response = await fetch("/api/tokens/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = (await response.json()) as TokenValidation;
        if (cancelled) return;

        if (!response.ok || !data.valid || data.token?.tokenType !== "member") {
          setStatus(data.error ?? "Token inválido ou já utilizado.");
          setCompanyName(null);
          resetAssessmentState();
          setTokenValidated(false);
          clearValidatedToken();
          setPhase("token");
          setFormUrlState("token", "");
          return;
        }

        setCompanyName(data.company?.name ?? null);
        setTokenValidated(true);

        if (requestedStep === "legal") {
          resetAssessmentState();
          setPhase("legal");
          setStatus(
            `Token individual válido para ${data.company?.name ?? "empresa"} · revise os termos para seguir com a triagem. Saldo ${data.remaining}/${data.total}`
          );
          return;
        }

        if (requestedStep === "triage") {
          resetAssessmentState();
          setConsentAccepted(true);
          setPhase("triage");
          return;
        }

        if (requestedStep === "form") {
          resetAssessmentState();
          setConsentAccepted(true);
          setPhase("form");
        }
      } catch {
        if (cancelled) return;
        setStatus("Não foi possível restaurar seu acesso. Valide o token novamente.");
        clearValidatedToken();
        resetAssessmentState();
        setPhase("token");
        setFormUrlState("token", "");
      } finally {
        if (!cancelled) {
          setHydratingToken(false);
        }
      }
    }

    void hydrateValidatedToken();

    return () => {
      cancelled = true;
    };
  }, [clearValidatedToken, redirectingToDashboard, requestedStep, resetAssessmentState, setFormUrlState, token, tokenValidated]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    if (!tokenValidated) {
      setLoading(false);
      setStatus("Valide o token antes de enviar.");
      return;
    }

    if (!consentAccepted) {
      setLoading(false);
      setStatus("É necessário registrar o consentimento para concluir o envio.");
      return;
    }

    const payload = {
      answers: questions.map((q) => ({
        questionId: q.id,
        value: Number(answers[q.id]),
      })),
      team,
      role,
      token,
      triage,
      consentAccepted,
      consentVersion,
    };

    try {
      const response = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        setStatus(error?.error ?? "Não foi possível salvar. Tente novamente.");
        setLoading(false);
        return;
      }

      const data = (await response.json()) as SubmitResponse;
      setStatus("Resposta enviada. Redirecionando para o dashboard...");
      setLoading(false);
      setRedirectingToDashboard(true);
      clearValidatedToken();
      startTransition(() => {
        router.push(`/dashboard?view=${data.viewKey}&memberToken=${data.memberToken}`);
      });
    } catch {
      setStatus("Falha de rede ao enviar a resposta. Tente novamente em instantes.");
      setLoading(false);
    }
  }

  const triageReady =
    triage.workModel &&
    triage.shift &&
    triage.leadership &&
    triage.publicExposure &&
    triage.recentOverload &&
    triage.sleepQuality &&
    triage.energyLevel &&
    triage.emotionalPressure &&
    triage.motivationLevel &&
    triage.socialIsolation &&
    triage.weeklyHours > 0;

  const answeredCount = useMemo(
    () => questions.filter((question) => typeof answers[question.id] === "number").length,
    [answers]
  );

  function convertTenureToMonths(rawValue: string, unit: "months" | "years") {
    if (!rawValue.trim()) return 0;

    const parsed = Number(rawValue.replace(",", "."));
    if (Number.isNaN(parsed) || parsed < 0) return 0;

    return unit === "months" ? Math.round(parsed) : Math.round(parsed * 12);
  }

  function formatTenureValue(months: number, unit: "months" | "years") {
    if (!months) return "";
    if (unit === "months") return String(months);

    const years = months / 12;
    return Number.isInteger(years) ? String(years) : years.toFixed(1).replace(/\.0$/, "");
  }

  function handleTenureValueChange(nextValue: string) {
    setTenureValue(nextValue);
    setTriage((prev) => ({
      ...prev,
      tenureMonths: convertTenureToMonths(nextValue, tenureUnit),
    }));
  }

  function handleTenureUnitChange(nextUnit: "months" | "years") {
    const currentMonths = convertTenureToMonths(tenureValue, tenureUnit);
    setTenureUnit(nextUnit);
    setTenureValue(formatTenureValue(currentMonths, nextUnit));
    setTriage((prev) => ({
      ...prev,
      tenureMonths: currentMonths,
    }));
  }

  return (
    <div className="shell-page min-h-screen text-[var(--foreground)]">
      <main className="mx-auto max-w-7xl px-5 py-10 md:px-8 lg:px-10 lg:py-14">
        <section className="space-y-8 text-center">
          <div className="mx-auto flex max-w-4xl flex-col items-center space-y-5 pt-2">
            <span className="hero-pill">
              <ShieldCheck className="h-3.5 w-3.5" />
              Método Sert
            </span>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] md:text-6xl">
              Check-in Psicossocial
            </h1>
            <p className="mx-auto max-w-3xl text-base leading-8 text-[var(--muted-foreground)] md:text-[1.35rem]">
              Valide o token, preencha uma triagem breve e responda a escala. O dashboard libera uma
              leitura automática com foco em risco psicossocial e priorização de cuidado.
            </p>
          </div>

          <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-3">
            {triageTopics.map((topic) => (
              <Card key={topic.title} className="metric-card text-center lg:text-left">
                <CardContent className="space-y-4 p-0">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(106,161,160,0.10)] text-[var(--primary)] lg:mx-0">
                    <topic.icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-2xl font-semibold tracking-[-0.04em]">{topic.title}</p>
                    <p className="text-sm leading-7 text-[var(--muted-foreground)]">{topic.text}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mx-auto flex w-full max-w-6xl flex-col items-center space-y-8">
            <div className="w-full">
              <div className="grid grid-cols-4 gap-4 text-left">
                <StepBadge index={1} current={phase === "token"}>Token</StepBadge>
                <StepBadge index={2} current={phase === "legal"}>Termos</StepBadge>
                <StepBadge index={3} current={phase === "triage"}>Triagem ampliada</StepBadge>
                <StepBadge index={4} current={phase === "form"}>Escala</StepBadge>
              </div>
              <div className="mt-4 h-1.5 rounded-full bg-[rgba(136,163,191,0.16)]">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-all"
                  style={{
                    width:
                      phase === "token"
                        ? "18%"
                        : phase === "legal"
                          ? "42%"
                          : phase === "triage"
                            ? "72%"
                            : "100%",
                  }}
                />
              </div>
            </div>

            {!tokenValidated && !hydratingToken && phase === "token" && (
              <Card className="mx-auto w-full max-w-[34rem] px-2 py-3 shadow-[0_22px_60px_rgba(129,155,179,0.14)]">
                <CardHeader className="space-y-5 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(106,161,160,0.12)] text-[var(--primary)]">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <CardTitle className="text-4xl tracking-[-0.05em]">Acesso Seguro</CardTitle>
                    <CardDescription className="mx-auto mt-3 max-w-md text-base leading-7">
                      Seu preenchimento é protegido. Informe o token fornecido pela sua empresa para iniciar o fluxo.
                    </CardDescription>
                  </div>
                  <div className="flex justify-center">
                    <Badge variant="secondary" className="bg-[rgba(106,161,160,0.10)] text-[var(--primary)]">
                      Etapa inicial
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5">
                  <Field
                    htmlFor="token"
                    label="Token de acesso"
                    message={companyName ? `Token vinculado a ${companyName}` : undefined}
                  >
                    <Input
                      id="token"
                      value={token}
                    onChange={(e) => setToken(e.target.value.toUpperCase())}
                      placeholder="Ex: USR-1234"
                      className="text-center uppercase tracking-[0.16em] placeholder:tracking-[0.08em]"
                    />
                  </Field>

                  <Button onClick={() => validateCurrentToken()} className="w-full" size="lg">
                    Validar e continuar
                  </Button>

                  {status && (
                    <div className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--muted)] px-4 py-4 text-sm text-[var(--foreground)]">
                      {status}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {hydratingToken && requestedStep !== "token" && (
              <Card className="mx-auto w-full max-w-[34rem] px-2 py-3 shadow-[0_22px_60px_rgba(129,155,179,0.14)]">
                <CardContent className="p-6 text-center text-sm text-[var(--muted-foreground)]">
                  Restaurando a etapa atual com o token validado...
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        <section className="mt-10">
          {phase === "legal" && tokenValidated && (
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-[var(--border)]/60 pb-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="hero-pill w-fit">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Termos e privacidade
                    </p>
                    <CardTitle className="mt-5 text-3xl tracking-[-0.04em]">Revisão legal antes da triagem</CardTitle>
                    <CardDescription className="mt-3 max-w-3xl text-base leading-7">
                      Seu token individual foi validado para {companyName ?? "a empresa"}. Antes de continuar,
                      revise os termos de uso e a política de privacidade aplicáveis.
                    </CardDescription>
                  </div>
                  <Badge variant="outline">Etapa obrigatória</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 pt-8">
                <div className="rounded-[1.6rem] border border-[var(--border)] bg-[rgba(255,255,255,0.88)] p-5">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Consentimento e ciência de tratamento</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">{consentDisclosure}</p>
                  <p className="mt-3 text-xs font-mono uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                    Versão do termo: {consentVersion}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Link
                    href={token ? `/termos-de-uso?token=${encodeURIComponent(token)}` : "/termos-de-uso"}
                    className="rounded-[1.4rem] border border-[var(--border)] bg-white px-5 py-5 text-left shadow-[0_12px_24px_rgba(129,155,179,0.08)] transition-colors hover:bg-[var(--accent)]"
                  >
                    <p className="text-base font-semibold text-[var(--foreground)]">Ler Termos de Uso</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                      Regras de utilização da plataforma, acesso e responsabilidades.
                    </p>
                  </Link>
                  <Link
                    href={
                      token
                        ? `/politica-de-privacidade?token=${encodeURIComponent(token)}`
                        : "/politica-de-privacidade"
                    }
                    className="rounded-[1.4rem] border border-[var(--border)] bg-white px-5 py-5 text-left shadow-[0_12px_24px_rgba(129,155,179,0.08)] transition-colors hover:bg-[var(--accent)]"
                  >
                    <p className="text-base font-semibold text-[var(--foreground)]">Ler Política de Privacidade</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                      Finalidade, retenção, direitos do titular e proteção dos dados.
                    </p>
                  </Link>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <Button
                    size="lg"
                    onClick={() => {
                      setConsentAccepted(true);
                      setPhase("triage");
                      setFormUrlState("triage", token);
                      setStatus(null);
                    }}
                  >
                    Li e concordo para continuar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {phase === "triage" && tokenValidated && (
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-[var(--border)]/60 pb-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="hero-pill w-fit">
                      <HeartPulse className="h-3.5 w-3.5" />
                      Triagem ampliada
                    </p>
                    <CardTitle className="mt-5 text-3xl tracking-[-0.04em]">Contexto psicossocial inicial</CardTitle>
                    <CardDescription className="mt-3 max-w-3xl text-base leading-7">
                      Dados anônimos de contexto para melhorar a leitura de burnout, ansiedade,
                      depressão e isolamento social no dashboard.
                    </CardDescription>
                  </div>
                  <Badge variant="outline">12 sinais contextuais</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 pt-8">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <SelectField
                    label="Modelo de trabalho"
                    value={triage.workModel}
                    onChange={(value) =>
                      setTriage((prev) => ({ ...prev, workModel: value as TriageForm["workModel"] }))
                    }
                    options={[
                      ["presencial", "Presencial"],
                      ["remoto", "Remoto"],
                      ["hibrido", "Híbrido"],
                    ]}
                  />
                  <SelectField
                    label="Turno"
                    value={triage.shift}
                    onChange={(value) =>
                      setTriage((prev) => ({ ...prev, shift: value as TriageForm["shift"] }))
                    }
                    options={[
                      ["diurno", "Diurno"],
                      ["noturno", "Noturno"],
                      ["turnos", "Turnos/escala"],
                    ]}
                  />
                  <Field
                    htmlFor="tenureMonths"
                    label={
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <span>Tempo na empresa</span>
                        <span className="inline-flex items-center rounded-full border border-[rgba(136,163,191,0.14)] bg-[rgba(255,255,255,0.5)] p-px">
                          <button
                            type="button"
                            onClick={() => handleTenureUnitChange("months")}
                            className={cn(
                              "rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] leading-none transition-colors",
                              tenureUnit === "months"
                                ? "bg-[rgba(106,161,160,0.14)] text-[var(--foreground)]"
                                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                            )}
                          >
                            Meses
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTenureUnitChange("years")}
                            className={cn(
                              "rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] leading-none transition-colors",
                              tenureUnit === "years"
                                ? "bg-[rgba(106,161,160,0.14)] text-[var(--foreground)]"
                                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                            )}
                          >
                            Ano(s)
                          </button>
                        </span>
                      </span>
                    }
                  >
                    <Input
                      id="tenureMonths"
                      type="number"
                      min={0}
                      step={tenureUnit === "years" ? "0.1" : "1"}
                      value={tenureValue}
                      onChange={(e) => handleTenureValueChange(e.target.value)}
                      placeholder={tenureUnit === "years" ? "Ex: 2" : "Ex: 24"}
                    />
                  </Field>
                  <Field label="Área/segmento" htmlFor="area">
                    <Input
                      id="area"
                      value={triage.area}
                      onChange={(e) => setTriage((prev) => ({ ...prev, area: e.target.value }))}
                      placeholder="Ex: Operações, Comercial, Tech"
                    />
                  </Field>
                  <SelectField
                    label="Lidera pessoas?"
                    value={triage.leadership}
                    onChange={(value) =>
                      setTriage((prev) => ({ ...prev, leadership: value as TriageForm["leadership"] }))
                    }
                    options={[["sim", "Sim"], ["nao", "Não"]]}
                  />
                  <SelectField
                    label="Exposição a público/pressão"
                    value={triage.publicExposure}
                    onChange={(value) =>
                      setTriage((prev) => ({
                        ...prev,
                        publicExposure: value as TriageForm["publicExposure"],
                      }))
                    }
                    options={[["alta", "Alta"], ["media", "Média"], ["baixa", "Baixa"]]}
                  />
                  <SelectField
                    label="Sentiu sobrecarga nas últimas 2 semanas?"
                    value={triage.recentOverload}
                    onChange={(value) =>
                      setTriage((prev) => ({
                        ...prev,
                        recentOverload: value as TriageForm["recentOverload"],
                      }))
                    }
                    options={[["sim", "Sim"], ["nao", "Não"]]}
                  />
                  <SelectField
                    label="Qualidade do sono"
                    value={triage.sleepQuality}
                    onChange={(value) =>
                      setTriage((prev) => ({
                        ...prev,
                        sleepQuality: value as TriageForm["sleepQuality"],
                      }))
                    }
                    options={[["boa", "Boa"], ["regular", "Regular"], ["ruim", "Ruim"]]}
                  />
                  <Field label="Horas semanais de trabalho" htmlFor="weeklyHours">
                    <Input
                      id="weeklyHours"
                      type="number"
                      min={10}
                      value={triage.weeklyHours}
                      onChange={(e) =>
                        setTriage((prev) => ({ ...prev, weeklyHours: Number(e.target.value) }))
                      }
                    />
                  </Field>
                  <SelectField
                    label="Energia ao fim da maioria dos dias"
                    value={triage.energyLevel}
                    onChange={(value) =>
                      setTriage((prev) => ({ ...prev, energyLevel: value as TriageForm["energyLevel"] }))
                    }
                    options={[
                      ["preservada", "Preservada"],
                      ["oscilando", "Oscilando"],
                      ["esgotada", "Esgotada"],
                    ]}
                  />
                  <SelectField
                    label="Nível de tensão, irritação ou preocupação"
                    value={triage.emotionalPressure}
                    onChange={(value) =>
                      setTriage((prev) => ({
                        ...prev,
                        emotionalPressure: value as TriageForm["emotionalPressure"],
                      }))
                    }
                    options={[["baixa", "Baixa"], ["media", "Média"], ["alta", "Alta"]]}
                  />
                  <SelectField
                    label="Motivação para o trabalho nas últimas semanas"
                    value={triage.motivationLevel}
                    onChange={(value) =>
                      setTriage((prev) => ({
                        ...prev,
                        motivationLevel: value as TriageForm["motivationLevel"],
                      }))
                    }
                    options={[
                      ["preservada", "Preservada"],
                      ["oscilando", "Oscilando"],
                      ["reduzida", "Reduzida"],
                    ]}
                  />
                  <SelectField
                    label="Sentiu isolamento ou desconexão da equipe?"
                    value={triage.socialIsolation}
                    onChange={(value) =>
                      setTriage((prev) => ({
                        ...prev,
                        socialIsolation: value as TriageForm["socialIsolation"],
                      }))
                    }
                    options={[["nao", "Não"], ["pontual", "Pontual"], ["frequente", "Frequente"]]}
                  />
                </div>

                <div className="rounded-[1.65rem] border border-[var(--border)] bg-[rgba(106,161,160,0.07)] p-5 text-sm leading-7 text-[var(--muted-foreground)]">
                  Essa triagem não fecha diagnóstico clínico. Ela aumenta a sensibilidade do painel para
                  hipóteses como exaustão, ansiedade ocupacional, humor deprimido e isolamento.
                </div>

                <Button
                  onClick={() => {
                    if (!triageReady) {
                      setStatus("Preencha a triagem para continuar.");
                      return;
                    }
                    setPhase("form");
                    setFormUrlState("form", token);
                    setStatus(null);
                  }}
                  className="w-full sm:w-auto"
                  size="lg"
                >
                  Continuar para a escala
                </Button>
              </CardContent>
            </Card>
          )}

          {phase === "form" && tokenValidated && (
            <Form className="mt-6 space-y-6" onSubmit={handleSubmit}>
              <Card>
                <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="hero-pill w-fit">
                      <Activity className="h-3.5 w-3.5" />
                      Etapa final
                    </p>
                    <p className="mt-4 text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                      Escala Likert NR-1
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
                      De 1 (discordo totalmente) a 5 (concordo totalmente), com foco em fatores da NR-1.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{questions.length} perguntas</Badge>
                    <Badge variant="outline">{answeredCount}/{questions.length} respondidas</Badge>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4">
                {questions.map((question, index) => (
                  <Card key={question.id} className="overflow-hidden">
                    <CardContent className="space-y-5 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                            Fator {String(index + 1).padStart(2, "0")} · {question.dimension}
                          </p>
                          <p className="text-lg font-semibold text-[var(--foreground)]">
                            {question.text}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("shrink-0 border", badgeByDimension[question.dimension])}
                        >
                          NR-1
                        </Badge>
                      </div>

                      <div className="grid gap-2 md:grid-cols-5">
                        {likertScale.map((option) => {
                          const active = answers[question.id] === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                setAnswers((prev) => ({
                                  ...prev,
                                  [question.id]: option.value,
                                }))
                              }
                              className={cn(
                                "rounded-[1.1rem] border px-4 py-4 text-left transition-colors",
                                active
                                  ? "border-[var(--primary)] bg-[rgba(106,161,160,0.14)] text-[var(--foreground)] shadow-[0_10px_24px_rgba(106,161,160,0.12)]"
                                  : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--muted)]"
                              )}
                            >
                              <span className="block text-sm font-semibold">{option.value}</span>
                              <span
                                className={cn(
                                  "mt-1 block text-xs leading-5",
                                  active ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
                                )}
                              >
                                {option.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardContent className="space-y-5 p-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Time/Estrutura" htmlFor="team">
                      <Input
                        id="team"
                        value={team}
                        onChange={(e) => setTeam(e.target.value)}
                        placeholder="Ex: Operações · Squad A"
                      />
                    </Field>
                    <Field label="Função" htmlFor="role">
                      <Input
                        id="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="Ex: Coordenação, Analista"
                      />
                    </Field>
                  </div>

                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="max-w-3xl space-y-4">
                      <p className="text-sm leading-7 text-[var(--muted-foreground)]">
                      Ao enviar, você libera uma leitura individual e uma visão agregada para a empresa.
                    </p>
                      <div className="rounded-[1.35rem] border border-[var(--border)] bg-[rgba(255,255,255,0.88)] px-4 py-4 text-left">
                        <p className="text-sm font-semibold text-[var(--foreground)]">
                          Termos aceitos antes da triagem
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                          {consentDisclosure}
                        </p>
                        <p className="mt-2 text-xs font-mono uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                          Versão do termo: {consentVersion}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Button type="button" variant="outline" onClick={() => setPhase("triage")}>
                        Voltar para triagem
                      </Button>
                      <Button type="submit" disabled={loading} size="lg">
                        {loading ? "Enviando..." : "Registrar resposta"}
                      </Button>
                    </div>
                  </div>

                  {status && <p className="text-sm text-[var(--muted-foreground)]">{status}</p>}
                </CardContent>
              </Card>
            </Form>
          )}
        </section>
      </main>
    </div>
  );
}

function FormLoadingState() {
  return (
    <div className="min-h-screen px-6 py-10">
      <Card className="mx-auto w-full max-w-3xl border-[var(--border)] bg-[rgba(255,255,255,0.82)] shadow-sm">
        <CardContent className="p-6 text-sm text-[var(--muted-foreground)]">
          Preparando formulário...
        </CardContent>
      </Card>
    </div>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
};

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <Field htmlFor={id} label={label}>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Selecione</option>
        {options.map(([val, labelText]) => (
          <option key={val} value={val}>
            {labelText}
          </option>
        ))}
      </Select>
    </Field>
  );
}

type StepBadgeProps = {
  children: React.ReactNode;
  current?: boolean;
};

function StepBadge({ children, current = false, index }: StepBadgeProps & { index: number }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-full">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
          current
            ? "border-[var(--primary)] bg-[var(--primary)] text-white"
            : "border-[var(--border)] bg-[rgba(255,255,255,0.8)] text-[var(--muted-foreground)]"
        )}
      >
        {index}
      </div>
      <span className={cn("truncate text-sm", current ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]")}>
        {children}
      </span>
    </div>
  );
}
