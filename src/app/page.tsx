"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, BellRing, Building2, CheckCircle2, KeyRound, LayoutDashboard, LockKeyhole, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { BrandLogo } from "@/components/branding/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const heroImpactData = [
  { month: "Jan", bemEstar: 58, desempenho: 42 },
  { month: "Fev", bemEstar: 62, desempenho: 46 },
  { month: "Mar", bemEstar: 68, desempenho: 53 },
  { month: "Abr", bemEstar: 74, desempenho: 63 },
  { month: "Mai", bemEstar: 81, desempenho: 76 },
  { month: "Jun", bemEstar: 87, desempenho: 91 },
];

const HERO_WELLBEING_COLOR = "#2f8f8a";
const HERO_PERFORMANCE_COLOR = "#18486f";

const heroImpactChartConfig = {
  bemEstar: { label: "Bem-estar do time", color: HERO_WELLBEING_COLOR },
  desempenho: { label: "Performance percebida", color: HERO_PERFORMANCE_COLOR },
} satisfies ChartConfig;

const benefits = [
  {
    icon: ShieldCheck,
    title: "Redução de afastamentos",
    text: "Quando sinais de risco aparecem cedo, a empresa ganha mais margem para agir antes que o problema vire afastamento, queda de desempenho ou ruptura na equipe.",
  },
  {
    icon: BarChart3,
    title: "Mais clareza para a liderança",
    text: "Cuidar da saúde mental com método ajuda gestores e Recursos Humanos a entender melhor o ambiente de trabalho e tomar decisões com mais contexto.",
  },
  {
    icon: Users,
    title: "Ambiente mais saudável",
    text: "Equipes que percebem escuta, cuidado e acompanhamento tendem a responder com mais confiança, vínculo e segurança psicológica.",
  },
  {
    icon: Building2,
    title: "Impacto que alcança a operação",
    text: "O cuidado com as pessoas melhora a experiência do colaborador sem se desconectar da realidade operacional da empresa.",
  },
];

export default function HomePage() {
  return (
    <main className="shell-page brand-shell min-h-screen overflow-x-hidden text-[var(--foreground)]">
      <section className="bg-white/92 text-[var(--foreground)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8 lg:px-10">
          <BrandLogo />
          <div className="hidden items-center gap-8 text-sm text-[var(--muted-foreground)] md:flex">
            <a href="#beneficios" className="transition-colors hover:text-[var(--foreground)]">Benefícios</a>
            <a href="#como-funciona" className="transition-colors hover:text-[var(--foreground)]">Como funciona</a>
            <a href="#seguranca" className="transition-colors hover:text-[var(--foreground)]">Confiabilidade</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/form">
              <Button variant="outline">
                <KeyRound className="h-4 w-4" />
                Acessar Método
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="brand-grid">
        <div className="mx-auto max-w-7xl px-5 py-14 md:px-8 lg:px-10 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)] lg:items-center">
            <div className="space-y-8">
              <Badge variant="outline" className="bg-white/80 px-4 py-2 text-[var(--brand-teal)]">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Plataforma para triagem psicossocial corporativa
              </Badge>
              <div className="space-y-6">
                <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.07em] md:text-7xl">
                  Clareza para agir sobre
                  <span className="block text-[var(--primary)]">riscos psicossociais com confiança.</span>
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-[var(--muted-foreground)] md:text-xl">
                O Método Sert ajuda sua empresa a acompanhar adesão, sinais de risco e prioridades de cuidado em uma experiência que conversa melhor com Recursos Humanos, liderança e colaborador.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/demonstracao">
                  <Button size="lg">
                    Solicitar demonstração
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/form">
                  <Button size="lg" variant="outline">
                    <KeyRound className="h-4 w-4" />
                    Acessar Método
                  </Button>
                </Link>
              </div>
            </div>

            <HeroAreaChart />
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Metric
              label="Queda no absenteísmo"
              value="-27%"
              helper="quando sinais de sobrecarga são acompanhados mais cedo"
            />
            <Metric
              label="Engajamento do time"
              value="+18%"
              helper="em ambientes com mais escuta, cuidado e previsibilidade"
            />
            <Metric
              label="Performance sustentada"
              value="+22%"
              helper="com mais foco, segurança psicológica e estabilidade na rotina"
            />
          </div>
        </div>
      </section>

      <section id="beneficios" className="mx-auto max-w-7xl px-5 py-18 md:px-8 lg:px-10">
        <SectionIntro
          kicker="Por que isso importa"
          title="Cuidar da saúde mental dos colaboradores melhora o ambiente e fortalece a empresa."
          description="Quando a empresa acompanha sinais de sobrecarga com mais cuidado, ela protege pessoas, melhora a qualidade das relações e cria bases mais saudáveis para a operação."
        />

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {benefits.map((item) => (
            <Card key={item.title} className="metric-card border-white/70">
              <CardContent className="space-y-5 p-0">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-teal-soft)] text-[var(--brand-teal)]">
                  <item.icon className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold tracking-[-0.04em]">{item.title}</h3>
                  <p className="text-sm leading-7 text-[var(--muted-foreground)]">{item.text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer
        id="seguranca"
        className="mt-10 bg-[radial-gradient(circle_at_top_left,rgba(47,143,138,0.18),transparent_28%),linear-gradient(135deg,#173a5a_0%,#132d47_45%,#10263f_100%)] text-white"
      >
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 lg:px-10">
          <div className="space-y-10 border-b border-white/10 pb-12">
            <div className="space-y-6">
              <Badge className="w-fit bg-white/10 text-white shadow-none">Por que funciona</Badge>
              <h2 className="max-w-3xl text-4xl font-semibold tracking-[-0.06em] md:text-5xl">
                Uma solução desenhada para unir cuidado, leitura operacional e confiança institucional.
              </h2>
              <p className="max-w-2xl text-base leading-8 text-white/72">
                O Método Sert organiza a jornada de ponta a ponta para que o colaborador tenha uma experiência clara, enquanto Recursos Humanos e liderança recebem visibilidade para agir com mais segurança.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  "Fluxo simples para quem responde e mais adesão para a operação.",
                  "Indicadores claros para priorizar ações sem depender de leitura manual.",
                  "Privacidade, rastreabilidade e acessos organizados em toda a jornada.",
                  "Uma experiência que conversa bem com Recursos Humanos, liderança e colaborador.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-[1.4rem] glass-outline px-4 py-4">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-teal)]" />
                    <p className="text-sm leading-7 text-white/80">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-[0_26px_60px_rgba(0,0,0,0.16)] lg:p-8">
              <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
                <div className="space-y-6">
                  <Badge className="w-fit bg-white/12 text-white shadow-none">Preparado para avançar</Badge>
                  <div className="space-y-4">
                    <h3 className="max-w-2xl text-3xl font-semibold tracking-[-0.05em] md:text-4xl">
                      Uma experiência que transmite confiança logo nos primeiros minutos de uso.
                    </h3>
                    <p className="max-w-2xl text-base leading-8 text-white/74">
                      Quando tudo parece simples de entender, seguro de operar e fácil de acompanhar, a percepção de valor cresce para quem avalia, para quem implanta e para quem utiliza no dia a dia.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {[
                      ["Jornada simples para começar", "O fluxo de entrada é claro para o colaborador e reduz atrito na ativação."],
                      ["Valor perceptível para Recursos Humanos", "Cobertura, risco e prioridades aparecem em uma leitura prática para acompanhamento."],
                      ["Estrutura pronta para crescer", "A solução ganha base para expandir com consistência em novas unidades e empresas."],
                    ].map(([title, text]) => (
                      <div key={title} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-teal)]" />
                        <div>
                          <p className="text-base font-medium text-white">{title}</p>
                          <p className="mt-1 text-sm leading-7 text-white/68">{text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <SecurityTile icon={KeyRound} title="Entrada guiada" text="Acesso validado para iniciar a jornada com clareza." />
                  <SecurityTile icon={ShieldCheck} title="Privacidade organizada" text="Permissões e rastreabilidade para trabalhar com mais segurança." />
                  <SecurityTile icon={LayoutDashboard} title="Leitura executiva" text="Dados apresentados de forma clara para apoiar decisão." />
                  <SecurityTile icon={BellRing} title="Operação escalável" text="Fluxo pensado para ativar, acompanhar e evoluir com consistência." />
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/demonstracao">
                  <Button size="lg" className="bg-white text-[var(--primary)] shadow-[0_18px_40px_rgba(255,255,255,0.16)] hover:bg-white/92">
                    Solicitar demonstração
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/form">
                  <Button size="lg" variant="outline" className="border-white/18 bg-white/8 text-white hover:bg-white/12 hover:text-white">
                    <KeyRound className="h-4 w-4" />
                    Acessar Método
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <section className="border-t border-white/10 bg-[linear-gradient(135deg,rgba(10,24,39,0.34),rgba(7,18,30,0.5))]">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 text-sm text-white/62 md:flex-row md:items-center md:justify-between md:px-8 lg:px-10">
            <div className="space-y-3">
              <BrandLogo theme="dark" />
              <p className="max-w-md text-sm leading-7 text-white/58">
                Plataforma para triagem psicossocial corporativa com leitura clara da operação e experiência mais humana para quem responde.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-5">
              <Link href="/politica-de-privacidade?source=landing" className="transition-colors hover:text-white">Política de privacidade</Link>
              <Link href="/termos-de-uso?source=landing" className="transition-colors hover:text-white">Termos de uso</Link>
              <Link href="/demonstracao" className="transition-colors hover:text-white">Solicitar demonstração</Link>
            </div>
          </div>
        </section>
      </footer>
    </main>
  );
}

function HeroAreaChart() {
  return (
    <div className="overflow-hidden rounded-[2.2rem]">
          <ChartContainer
        config={heroImpactChartConfig}
        className="h-[320px] w-full [&_.recharts-cartesian-axis-tick]:hidden [&_.recharts-cartesian-axis-line]:stroke-transparent [&_.recharts-cartesian-grid_line]:stroke-[rgba(255,255,255,0.06)]"
      >
        <AreaChart data={heroImpactData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="heroWellbeingFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={HERO_WELLBEING_COLOR} stopOpacity={0.3} />
              <stop offset="100%" stopColor={HERO_WELLBEING_COLOR} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="heroPerformanceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={HERO_PERFORMANCE_COLOR} stopOpacity={0.2} />
              <stop offset="100%" stopColor={HERO_PERFORMANCE_COLOR} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} hide />
          <YAxis tickLine={false} axisLine={false} hide />
          <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${value}%`} />} />
          <Area
            type="monotone"
            dataKey="desempenho"
            stroke={HERO_PERFORMANCE_COLOR}
            fill="url(#heroPerformanceFill)"
            strokeWidth={1.5}
          />
          <Area
            type="monotone"
            dataKey="bemEstar"
            stroke={HERO_WELLBEING_COLOR}
            fill="url(#heroWellbeingFill)"
            strokeWidth={1.8}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

function Metric({
  label,
  value,
  helper,
  labelClassName = "",
  valueClassName = "",
}: {
  label: string;
  value: string;
  helper: string;
  labelClassName?: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-h-[176px] flex-col rounded-[1.8rem] border border-[var(--border)] bg-white px-5 py-5 shadow-[0_18px_40px_rgba(19,34,56,0.06)]">
      <div className="min-w-0 space-y-4">
        <p className={`max-w-none whitespace-nowrap text-base font-medium leading-[1.3] text-[var(--foreground)] ${labelClassName}`}>
          {label}
        </p>
        <p
          className={`max-w-[10ch] text-[clamp(1.9rem,3vw,2.75rem)] font-semibold tracking-[-0.055em] text-[var(--foreground)] [text-wrap:balance] ${
            valueClassName || "leading-none"
          }`}
        >
          {value}
        </p>
      </div>
      <div className="mt-5 min-w-0">
        <p className="max-w-[26ch] text-sm leading-6 text-[var(--muted-foreground)]">
          {helper}
        </p>
      </div>
    </div>
  );
}

function SectionIntro({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-4xl space-y-4">
      <Badge variant="outline">{kicker}</Badge>
      <h2 className="text-4xl font-semibold tracking-[-0.06em] md:text-5xl">{title}</h2>
      <p className="max-w-3xl text-base leading-8 text-[var(--muted-foreground)] md:text-lg">{description}</p>
    </div>
  );
}

function SecurityTile({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof ShieldCheck;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[1.8rem] glass-outline p-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[var(--brand-teal)]">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-5 text-2xl font-semibold tracking-[-0.04em]">{title}</p>
      <p className="mt-2 text-sm leading-7 text-white/68">{text}</p>
    </div>
  );
}
