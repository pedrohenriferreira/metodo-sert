import { NextRequest, NextResponse } from "next/server";
import { filterResponsesByCompanyFilters, parseCompanyFiltersFromParams } from "@/lib/dashboard-filters";
import { buildDashboardPayload, summarizeResponseRisk } from "@/lib/metrics";
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
  const format = url.searchParams.get("format") === "technical" ? "technical" : "executive";
  const pseudonymized = url.searchParams.get("pseudonymized") !== "0";
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
  const teamCounts = filteredResponses.reduce<Record<string, number>>((acc, response) => {
    const team = response.team?.trim();
    if (team) acc[team] = (acc[team] ?? 0) + 1;
    return acc;
  }, {});
  const roleCounts = filteredResponses.reduce<Record<string, number>>((acc, response) => {
    const role = response.role?.trim();
    if (role) acc[role] = (acc[role] ?? 0) + 1;
    return acc;
  }, {});
  const areaCounts = filteredResponses.reduce<Record<string, number>>((acc, response) => {
    const area = response.triage?.area?.trim();
    if (area) acc[area] = (acc[area] ?? 0) + 1;
    return acc;
  }, {});

  const rows =
    format === "technical"
      ? [
          [
            "empresa",
            "participante_id",
            "respondido_em",
            "faixa_risco",
            "media_geral",
            "dimensao_mais_sensivel",
            "dimensao_mais_forte",
            "time",
            "funcao",
            "area",
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
            const protectedGroup =
              (response.team ? (teamCounts[response.team.trim()] ?? 0) < 3 : false) ||
              (response.role ? (roleCounts[response.role.trim()] ?? 0) < 3 : false) ||
              (response.triage?.area ? (areaCounts[response.triage.area.trim()] ?? 0) < 3 : false);

            return [
              company.name,
              pseudonymized ? response.pseudonymId ?? response.id : response.id,
              response.submittedAt,
              summary.riskBand,
              summary.overallAverage.toFixed(2),
              summary.weakestDimension,
              summary.strongestDimension,
              protectedGroup ? "Grupo protegido (<3)" : response.team ?? "",
              protectedGroup ? "Grupo protegido (<3)" : response.role ?? "",
              protectedGroup ? "Grupo protegido (<3)" : response.triage?.area ?? "",
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
        ]
      : (() => {
          const payload = buildDashboardPayload({
            responses: filteredResponses,
            baselineResponses: companyResponses,
            companyLabel: company.name,
            seats: company.seats,
            activeFilters,
          });
          const view = payload.companyView;

          return [
            [
              "empresa",
              "pessoas_no_recorte",
              "base_total",
              "indice_bem_estar",
              "satisfacao",
              "burnout_alto",
              "ansiedade_alta",
              "alta_atencao_critico",
              "dimensao_mais_sensivel",
              "top_recorte_1",
              "top_recorte_2",
              "top_recorte_3",
              "resumo_1",
              "resumo_2",
              "resumo_3",
              "prioridade_1",
              "prioridade_2",
              "prioridade_3",
            ],
            [
              company.name,
              String(filteredResponses.length),
              String(companyResponses.length),
              view?.wellbeingIndex.toFixed(0) ?? "0",
              view?.satisfactionScore.toFixed(0) ?? "0",
              view?.burnoutRiskShare.toFixed(0) ?? "0",
              view?.anxietyRiskShare.toFixed(0) ?? "0",
              view?.highRiskShare.toFixed(0) ?? "0",
              view?.weakestDimension ?? "",
              view?.criticalSegments[0]?.label ?? "",
              view?.criticalSegments[1]?.label ?? "",
              view?.criticalSegments[2]?.label ?? "",
              view?.executiveSummary[0]?.detail ?? "",
              view?.executiveSummary[1]?.detail ?? "",
              view?.executiveSummary[2]?.detail ?? "",
              view?.priorityInsights[0]?.detail ?? "",
              view?.priorityInsights[1]?.detail ?? "",
              view?.priorityInsights[2]?.detail ?? "",
            ],
          ];
        })();

  auditLog("info", "report.company.export", {
    ...auditContext,
    principal: admin ? admin.kind : "company-token",
    companyId: company.id,
    responseCount: filteredResponses.length,
    format,
    pseudonymized,
  });

  return new NextResponse(`\uFEFF${buildCsv(rows)}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio-${format}-${company.name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase() || "empresa"}.csv"`,
    },
  });
}
