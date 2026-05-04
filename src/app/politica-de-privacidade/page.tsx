import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LegalReturnButton } from "@/components/legal-return-button";

export default async function PoliticaDePrivacidadePage({
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
      ? "/termos-de-uso?source=landing"
      : token
        ? `/termos-de-uso?token=${encodeURIComponent(token)}&source=form`
        : "/termos-de-uso?source=form";

  return (
    <main className="shell-page min-h-screen px-5 py-10 md:px-8 lg:px-10 lg:py-14">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <LegalReturnButton fallbackHref={returnHref} label="Voltar" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-4xl tracking-[-0.05em]">Política de Privacidade</CardTitle>
            <CardDescription>
              Resumo operacional sobre coleta, uso, retenção e proteção dos dados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-sm leading-7 text-[var(--muted-foreground)]">
            <p>
              Os dados coletados nesta plataforma são utilizados para avaliação de riscos psicossociais,
              geração de indicadores agregados e priorização de cuidado em contexto organizacional.
            </p>
            <p>
              O sistema pode registrar respostas da escala, triagem contextual, consentimento, metadados de
              retenção e trilha de auditoria de ações administrativas.
            </p>
            <p>
              Sempre que aplicável, relatórios operacionais devem priorizar pseudonimização e minimização de
              exposição de dados.
            </p>
            <p>
              O acesso aos dados é controlado por perfil, token ou sessão administrativa, e deve respeitar a
              finalidade autorizada pela organização contratante.
            </p>
            <p>
              O prazo de retenção segue a configuração operacional vigente da plataforma e as políticas da
              organização contratante. Solicitações de exclusão, revisão ou atendimento LGPD devem seguir o
              canal oficial definido pela organização.
            </p>
            <p>
              <Link
                href={siblingHref}
                className="font-semibold text-[var(--foreground)] underline-offset-4 hover:underline"
              >
                Ir para Termos de Uso
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
