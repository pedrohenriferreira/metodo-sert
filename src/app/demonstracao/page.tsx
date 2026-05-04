"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { BrandLogo } from "@/components/branding/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { demoRequestPersonalizationSchema, demoRequestSchema } from "@/lib/validation";

const demoFormSchema = demoRequestSchema;
const successFormSchema = demoRequestPersonalizationSchema.omit({ requestId: true });

type DemoFormValues = z.infer<typeof demoFormSchema>;
type SuccessFormValues = z.infer<typeof successFormSchema>;

type DemoRequestResponse = {
  ok: true;
  requestId: string;
  corporateEmail: string;
};

const employeeRangeOptions = [
  { value: "1-50", label: "1-50" },
  { value: "51-200", label: "51-200" },
  { value: "201-500", label: "201-500" },
  { value: "500+", label: "500+" },
] as const;

const urgencyOptions = [
  { value: "imediato", label: "Imediato" },
  { value: "proximos-3-meses", label: "Próximos 3 meses" },
  { value: "explorando", label: "Explorando" },
] as const;

export default function DemonstracaoPage() {
  const [requestId, setRequestId] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "congrats" | "personalization" | "thanks">("form");

  const demoForm = useForm<DemoFormValues>({
    resolver: zodResolver(demoFormSchema),
    mode: "onChange",
    defaultValues: {
      companyName: "",
      fullName: "",
      corporateEmail: "",
      employeeRange: undefined,
    },
  });

  const successForm = useForm<SuccessFormValues>({
    resolver: zodResolver(successFormSchema),
    mode: "onChange",
    defaultValues: {
      hasPsychosocialAssessment: undefined,
      urgency: undefined,
    },
  });

  useEffect(() => {
    if (step !== "thanks") return;

    const timeout = window.setTimeout(() => {
      window.location.href = "/";
    }, 4200);

    return () => window.clearTimeout(timeout);
  }, [step]);

  async function handleDemoSubmit(values: DemoFormValues) {
    setRequestStatus(null);

    const response = await fetch("/api/demo-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const data = (await response.json()) as { error?: string } | DemoRequestResponse;

    if (!response.ok || !("requestId" in data)) {
      const errorMessage = "error" in data ? data.error : undefined;
      setRequestStatus(errorMessage ?? "Não foi possível preparar sua demonstração agora.");
      return;
    }

    setRequestId(data.requestId);
    setSubmittedEmail(data.corporateEmail);
    setRequestStatus(null);
    setStep("congrats");
  }

  async function handleSuccessSubmit(values: SuccessFormValues) {
    if (!requestId) return;

    setSuccessStatus(null);

    const response = await fetch("/api/demo-request", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId,
        ...values,
      }),
    });

    const data = (await response.json()) as { error?: string; ok?: boolean };

    if (!response.ok || !data.ok) {
      setSuccessStatus(data.error ?? "Não foi possível salvar suas respostas agora.");
      return;
    }

    setSuccessStatus(null);
    setStep("thanks");
  }

  return (
    <main className="shell-page min-h-screen bg-[linear-gradient(180deg,#fcfefe_0%,#f4f8f9_100%)] px-5 py-8 md:px-8 lg:px-10 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <BrandLogo />
          <Link href="/">
            <Button variant="outline" className="bg-white/88">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>

        {step === "form" ? (
          <section className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <div className="space-y-8 px-1 pt-6">
              <div className="space-y-6">
                <h1 className="max-w-xl text-5xl font-semibold leading-[0.92] tracking-[-0.075em] text-[var(--foreground)] md:text-6xl xl:text-7xl">
                  Veja o Método Sert em uma experiência simples de explorar.
                </h1>
                <p className="max-w-lg text-lg leading-8 text-[var(--muted-foreground)]">
                  Preencha seus dados para receber um acesso de demonstração e entender como a jornada
                  acontece para o colaborador, para Recursos Humanos e para a operação.
                </p>
              </div>

              <div className="space-y-4 text-[15px] leading-7 text-[var(--muted-foreground)]">
                <p>Você receberá um link de demonstração no seu email em poucos minutos.</p>
              </div>
            </div>

            <Card className="rounded-[2rem] border-white/90 bg-white shadow-[0_24px_60px_rgba(19,34,56,0.08)]">
              <CardHeader className="space-y-4 px-6 pt-7 md:px-8">
                <CardTitle className="text-3xl font-semibold tracking-[-0.06em] md:text-4xl">
                  Cadastro de demonstração
                </CardTitle>
                <CardDescription className="max-w-lg text-base leading-7 text-[var(--muted-foreground)]">
                  Informe os dados abaixo para receber seu acesso.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-7 md:px-8">
                <Form onSubmit={demoForm.handleSubmit(handleDemoSubmit)} className="space-y-5">
                  <Field
                    htmlFor="companyName"
                    label="Nome da empresa"
                    message={demoForm.formState.errors.companyName?.message}
                  >
                    <Input
                      id="companyName"
                      autoFocus
                      {...demoForm.register("companyName")}
                    />
                  </Field>

                  <Field
                    htmlFor="fullName"
                    label="Nome completo"
                    message={demoForm.formState.errors.fullName?.message}
                  >
                    <Input id="fullName" {...demoForm.register("fullName")} />
                  </Field>

                  <Field
                    htmlFor="corporateEmail"
                    label="Email corporativo"
                    message={demoForm.formState.errors.corporateEmail?.message}
                  >
                    <Input id="corporateEmail" type="email" {...demoForm.register("corporateEmail")} />
                  </Field>

                  <Field
                    htmlFor="employeeRange"
                    label="Número de colaboradores"
                    message={demoForm.formState.errors.employeeRange?.message}
                  >
                    <SelectFieldShell>
                      <Select
                        id="employeeRange"
                        defaultValue=""
                        className="appearance-none border-[rgba(19,34,56,0.1)] bg-[linear-gradient(180deg,rgba(248,251,252,0.98),rgba(255,255,255,0.98))] pr-11 shadow-[0_8px_24px_rgba(19,34,56,0.04),inset_0_1px_0_rgba(255,255,255,0.9)]"
                        {...demoForm.register("employeeRange")}
                      >
                        <option value="" disabled>
                          Selecione uma faixa
                        </option>
                        {employeeRangeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </SelectFieldShell>
                  </Field>

                  {requestStatus ? (
                    <p className="text-sm text-[var(--destructive)]">{requestStatus}</p>
                  ) : null}

                  <Button
                    type="submit"
                    size="lg"
                    className="mt-2 h-14 w-full rounded-[1.2rem]"
                    disabled={demoForm.formState.isSubmitting}
                  >
                    {demoForm.formState.isSubmitting ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Preparando acesso
                      </>
                    ) : (
                      <>
                        Receber acesso à demonstração
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </Form>
              </CardContent>
            </Card>
          </section>
        ) : step === "congrats" ? (
          <section className="mx-auto max-w-4xl rounded-[2.2rem] border border-white/90 bg-white px-6 py-8 shadow-[0_24px_60px_rgba(19,34,56,0.08)] md:px-10 md:py-10">
            <div className="space-y-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(21,159,117,0.12)] text-[var(--risk-low)]">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold leading-[0.96] tracking-[-0.06em] text-[var(--foreground)] md:text-6xl">
                  Parabéns, sua demonstração foi enviada para o email cadastrado.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
                  O acesso foi enviado para {submittedEmail ?? "seu e-mail"} e deve chegar em poucos minutos.
                </p>
              </div>

              <div className="rounded-[1.8rem] bg-[var(--accent)] px-5 py-5">
                <h2 className="text-2xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">
                  Personalize a demonstração
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-8 text-[var(--muted-foreground)]">
                  Esta etapa é opcional, mas pode nos ajudar a adaptar melhor a experiência ao momento da sua empresa.
                </p>

                <Button
                  type="button"
                  size="lg"
                  className="mt-6 h-14 rounded-[1.2rem]"
                  onClick={() => setStep("personalization")}
                >
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>
        ) : step === "personalization" ? (
          <section className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <div className="space-y-8 px-1 pt-6">
              <div className="space-y-6">
                <h1 className="max-w-xl text-4xl font-semibold leading-[0.95] tracking-[-0.07em] text-[var(--foreground)] md:text-6xl">
                  Agora vamos adaptar a demonstração ao momento da sua empresa.
                </h1>
                <p className="max-w-lg text-lg leading-8 text-[var(--muted-foreground)]">
                  Suas respostas ajudam a deixar a próxima conversa mais útil, com um contexto melhor sobre
                  maturidade, prioridade e cenário atual da operação.
                </p>
              </div>

              <div className="space-y-4 text-[15px] leading-7 text-[var(--muted-foreground)]">
                <p>Leva menos de um minuto para concluir.</p>
              </div>
            </div>

            <Card className="rounded-[2rem] border-white/90 bg-white shadow-[0_24px_60px_rgba(19,34,56,0.08)]">
              <CardHeader className="space-y-4 px-6 pt-7 md:px-8">
                <CardTitle className="text-3xl tracking-[-0.05em] md:text-4xl">
                  Personalizar demonstração
                </CardTitle>
                <CardDescription className="max-w-xl text-base leading-8 text-[var(--muted-foreground)]">
                  Compartilhe algumas respostas rápidas para personalizarmos melhor sua experiência:
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-7 md:px-8">
                <Form onSubmit={successForm.handleSubmit(handleSuccessSubmit)} className="space-y-5">
                  <Field
                    label="Já realiza alguma avaliação psicossocial?"
                    message={successForm.formState.errors.hasPsychosocialAssessment?.message}
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { label: "Sim", value: true },
                        { label: "Não", value: false },
                      ].map((option) => {
                        const selected = successForm.watch("hasPsychosocialAssessment") === option.value;

                        return (
                          <button
                            key={option.label}
                            type="button"
                            onClick={() => successForm.setValue("hasPsychosocialAssessment", option.value, { shouldValidate: true })}
                            className={cn(
                              "rounded-[1.2rem] border px-4 py-4 text-left text-sm transition-colors",
                              selected
                                ? "border-[var(--brand-teal)] bg-[var(--brand-teal-soft)] text-[var(--foreground)]"
                                : "border-[var(--input)] bg-white text-[var(--foreground)]"
                            )}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  <Field
                    htmlFor="urgency"
                    label="Urgência"
                    message={successForm.formState.errors.urgency?.message}
                  >
                    <SelectFieldShell>
                      <Select
                        id="urgency"
                        defaultValue=""
                        className="appearance-none border-[rgba(19,34,56,0.1)] bg-[linear-gradient(180deg,rgba(248,251,252,0.98),rgba(255,255,255,0.98))] pr-11 shadow-[0_8px_24px_rgba(19,34,56,0.04),inset_0_1px_0_rgba(255,255,255,0.9)]"
                        {...successForm.register("urgency")}
                      >
                        <option value="" disabled>
                          Selecione uma opção
                        </option>
                        {urgencyOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </SelectFieldShell>
                  </Field>

                  {successStatus ? (
                    <p className="text-sm text-[var(--destructive)]">
                      {successStatus}
                    </p>
                  ) : null}

                  <Button
                    type="submit"
                    size="lg"
                    className="mt-2 h-14 w-full rounded-[1.2rem]"
                    disabled={successForm.formState.isSubmitting}
                  >
                    {successForm.formState.isSubmitting ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Salvando respostas
                      </>
                    ) : (
                      "Personalizar demonstração"
                    )}
                  </Button>
                </Form>
              </CardContent>
            </Card>
          </section>
        ) : (
          <section className="mx-auto max-w-4xl rounded-[2.2rem] border border-white/90 bg-white px-6 py-10 shadow-[0_24px_60px_rgba(19,34,56,0.08)] md:px-10 md:py-12">
            <div className="space-y-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(21,159,117,0.12)] text-[var(--risk-low)]">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl font-semibold leading-[0.96] tracking-[-0.06em] text-[var(--foreground)] md:text-6xl">
                  Obrigado. Sua demonstração está pronta para seguir.
                </h1>
                <p className="mx-auto max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
                  Recebemos suas respostas e vamos usar esse contexto para deixar a experiência ainda mais aderente.
                </p>
              </div>

              <p className="text-sm leading-7 text-[var(--muted-foreground)]">
                Você será redirecionado para a landing page em instantes.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function SelectFieldShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[var(--muted-foreground)]">
        <ChevronDown className="h-4 w-4" />
      </div>
    </div>
  );
}
