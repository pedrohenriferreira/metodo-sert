import { NextRequest, NextResponse } from "next/server";
import { filterResponsesByCompanyFilters, parseCompanyFiltersFromParams } from "@/lib/dashboard-filters";
import { summarizeResponseRisk } from "@/lib/metrics";
import { auditLog, createAuditContext, getAdminPrincipal } from "@/lib/security";
import { listCompanies, readResponses, validateToken } from "@/lib/storage";

function buildCsv(rows: string[][]) {
  return rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const companyId = url.searchParams.get("companyId")?.trim();
  const accessToken = url.searchParams.get("accessToken")?.trim().toUpperCase();
  const activeFilters = parseCompanyFiltersFromParams(url.searchParams);
  const admin = getAdminPrincipal(request);
  const auditContext = createAuditContext(request);

  let resolvedCompanyId = companyId;

  if (!admin && !accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!resolvedCompanyId && accessToken) {
    const access = await validateToken(accessToken, { tokenType: "company", allowUsed: true });
    if (!access) {
      return NextResponse.json({ error: "Token institucional inválido" }, { status: 401 });
    }
    resolvedCompanyId = access.company.id;
  }

  if (!resolvedCompanyId) {
    return NextResponse.json({ error: "Informe a empresa para exportação." }, { status: 400 });
  }

  const [companies, responses] = await Promise.all([listCompanies(), readResponses()]);
  const company = companies.find((item) => item.id === resolvedCompanyId);

  if (!company) {
    return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
  }

  const companyResponses = responses.filter((response) => response.companyId === company.id);
  const filteredResponses = filterResponsesByCompanyFilters(companyResponses, activeFilters);
  const rows = [
    [
      "empresa",
      "participante_id",
      "respondido_em",
      "faixa_risco",
      "media_geral",
      "dimensao_mais_sensivel",
      "dimensao_mais_forte",
      "modelo_trabalho",
      "turno",
      "lideranca",
      "sobrecarga_recente",
      "qualidade_sono",
      "energia",
      "pressao_emocional",
      "motivacao",
      "isolamento_social",
    ],
    ...filteredResponses.map((response) => {
      const summary = summarizeResponseRisk(response);
      return [
        company.name,
        response.pseudonymId ?? response.id,
        response.submittedAt,
        summary.riskBand,
        summary.overallAverage.toFixed(2),
        summary.weakestDimension,
        summary.strongestDimension,
        response.triage?.workModel ?? "",
        response.triage?.shift ?? "",
        response.triage?.leadership ?? "",
        response.triage?.recentOverload ?? "",
        response.triage?.sleepQuality ?? "",
        response.triage?.energyLevel ?? "",
        response.triage?.emotionalPressure ?? "",
        response.triage?.motivationLevel ?? "",
        response.triage?.socialIsolation ?? "",
      ];
    }),
  ];

  auditLog("info", "report.company.export", {
    ...auditContext,
    principal: admin ? admin.kind : "company-token",
    companyId: company.id,
    responseCount: filteredResponses.length,
  });

  return new NextResponse(`\uFEFF${buildCsv(rows)}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio-${company.name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase() || "empresa"}.csv"`,
    },
  });
}
