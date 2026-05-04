import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LegalReturnButton } from "@/components/legal-return-button";

export default async function TermosDeUsoPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; source?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? "";
  const source = params.source === "form" ? "form" : token ? "form" : "landing";
  const returnHref =
    source === "landing"
      ? "/"
      : token
        ? `/form?token=${encodeURIComponent(token)}&step=legal`
        : "/form";
  const siblingHref =
    source === "landing"
      ? "/politica-de-privacidade?source=landing"
      : token
        ? `/politica-de-privacidade?token=${encodeURIComponent(token)}&source=form`
        : "/politica-de-privacidade?source=form";

  return (
    <main className="shell-page min-h-screen px-5 py-10 md:px-8 lg:px-10 lg:py-14">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <LegalReturnButton fallbackHref={returnHref} label="Voltar" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-4xl tracking-[-0.05em]">Termos de Uso</CardTitle>
            <CardDescription>
              Regras gerais para utilização da plataforma Metodo Sert.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-sm leading-7 text-[var(--muted-foreground)]">
            <p>
              Esta plataforma destina-se ao registro, leitura e acompanhamento de dados ligados a riscos
              psicossociais em contexto organizacional.
            </p>
            <p>
              O uso depende de credenciais, tokens ou sessão administrativa válida. O usuário se compromete a
              utilizar os acessos apenas para finalidades autorizadas e a não compartilhar credenciais sem
              autorização formal.
            </p>
            <p>
              Relatórios, dashboards e exportações devem ser tratados conforme as políticas internas de
              confidencialidade e proteção de dados da organização contratante.
            </p>
            <p>
              O uso indevido de tokens, exportações ou dados individuais pode gerar bloqueio de acesso e
              revisão administrativa.
            </p>
            <p>
              Em caso de dúvidas sobre tratamento de dados, retenção, direitos do titular ou exclusão, consulte
              a Política de Privacidade e o canal responsável da sua organização.
            </p>
            <p>
              <Link
                href={siblingHref}
                className="font-semibold text-[var(--foreground)] underline-offset-4 hover:underline"
              >
                Ir para Política de Privacidade
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
