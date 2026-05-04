import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  buildPseudonymId,
  calculateRetentionUntil,
  getConsentDisclosureText,
  getLegalBasisLabel,
} from "@/lib/governance";
import { buildDashboardPayload, summarizeResponseRisk, ViewMode } from "@/lib/metrics";
import { captureServerError } from "@/lib/observability";
import { applyRateLimit, auditLog, createAuditContext, getAdminPrincipal } from "@/lib/security";
import {
  buildCompanyFilterOptions,
  filterResponsesByCompanyFilters,
  parseCompanyFiltersFromParams,
  type CompanyFilters,
} from "@/lib/dashboard-filters";
import {
  consumeToken,
  LikertValue,
  listCompanies,
  readResponses,
  ResponseRecord,
  saveResponse,
  validateToken,
} from "@/lib/storage";
import { getValidationMessage, submitResponseSchema, tokenSchema } from "@/lib/validation";

function isAdminAuthorized(request: NextRequest) {
  return getAdminPrincipal(request);
}

function withAllowedViews(allowedViews: ViewMode[], defaultView: ViewMode) {
  return { allowedViews, defaultView };
}

function normalizeToken(token: {
  value: string;
  used: boolean;
  active?: boolean;
  usedAt?: string;
  label?: string;
  reusable?: boolean;
  responseId?: string;
  tokenType?: "member" | "company";
}) {
  const tokenType = token.tokenType ?? (token.reusable ? "company" : "member");

  return {
    value: token.value,
    used: token.used,
    active: token.active ?? true,
    usedAt: token.usedAt,
    label: token.label ?? (tokenType === "company" ? "Acesso diretoria/RH" : "Avaliação individual"),
    reusable: token.reusable ?? tokenType === "company",
    responseId: token.responseId,
    tokenType,
  };
}

function buildCompanyAccessSnapshot(args: {
  company?: Awaited<ReturnType<typeof listCompanies>>[number];
  responses: ResponseRecord[];
}) {
  const { company, responses } = args;
  if (!company) return null;

  const normalizedTokens = company.tokens.map(normalizeToken);
  const memberTokens = normalizedTokens.filter((token) => token.tokenType === "member");
  const companyTokens = normalizedTokens.filter((token) => token.tokenType === "company");
  const alertCount = responses.filter((response) => {
    const { riskBand } = summarizeResponseRisk(response);
    return riskBand === "Atenção alta" || riskBand === "Crítico";
  }).length;

  return {
    totalTokens: memberTokens.length,
    usedTokens: memberTokens.filter((token) => token.used).length,
    availableTokens: memberTokens.filter((token) => !token.used).length,
    alertCount,
    memberTokens,
    companyTokens,
  };
}

function getTeamOptionsFromFilters(filters: CompanyFilters) {
  return filters.team;
}

export async function GET(request: NextRequest) {
  const auditContext = createAuditContext(request);
  const rateLimit = applyRateLimit(`responses:get:${auditContext.ip}`, 120, 60 * 1000);

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Muitas requisições." }, { status: 429 });
  }

  const url = new URL(request.url);
  const viewKey = url.searchParams.get("viewKey");
  const memberToken = url.searchParams.get("memberToken");
  const accessToken = url.searchParams.get("accessToken");
  const companyId = url.searchParams.get("companyId");
  const adminScope = url.searchParams.get("adminScope");
  const companyFilters = parseCompanyFiltersFromParams(url.searchParams);
  const adminAuthorized = isAdminAuthorized(request);

  const responses = await readResponses();
  const companies = await listCompanies();

  if (adminAuthorized && viewKey) {
    const owner = responses.find((response) => response.id === viewKey);
    if (!owner?.companyId) {
      return NextResponse.json({ error: "Caso individual não encontrado" }, { status: 404 });
    }

    const company = companies.find((item) => item.id === owner.companyId);
    const companyResponses = responses.filter((response) => response.companyId === owner.companyId);
    const teamOptions = buildCompanyFilterOptions(companyResponses).team;
    const filterOptions = buildCompanyFilterOptions(companyResponses);
    const scopedCompanyResponses = filterResponsesByCompanyFilters(companyResponses, companyFilters);
    const scopedResponses = adminScope === "individual-complete" ? [owner] : companyResponses;
    const companyLabel =
      adminScope === "individual-complete"
        ? `${owner.team || owner.role || "Colaborador"} · ${company?.name ?? "Empresa"}`
        : company?.name ?? "Empresa";
    const companyAccess = buildCompanyAccessSnapshot({ company, responses: companyResponses });

    const payload = buildDashboardPayload({
      responses: scopedResponses,
      baselineResponses: companyResponses,
      companyLabel,
      seats: adminScope === "individual-complete" ? 1 : company?.seats,
      teamOptions,
      activeTeamFilter: getTeamOptionsFromFilters(companyFilters),
      filterOptions,
      activeFilters: companyFilters,
      ownerResponseId: owner.id,
      companyAccess: adminScope === "individual-complete" ? companyAccess : companyAccess,
      ...withAllowedViews(["individual", "company"], adminScope === "individual-complete" ? "company" : "individual"),
    });

    if (adminScope !== "individual-complete") {
      payload.companyView = buildDashboardPayload({
        responses: scopedCompanyResponses,
        baselineResponses: companyResponses,
        companyLabel,
        seats: company?.seats,
        teamOptions,
        activeTeamFilter: getTeamOptionsFromFilters(companyFilters),
        filterOptions,
        activeFilters: companyFilters,
        companyAccess,
        allowedViews: ["company"],
        defaultView: "company",
      }).companyView;
      payload.totalResponses = scopedCompanyResponses.length;
      payload.participationRate = company?.seats ? (scopedCompanyResponses.length / company.seats) * 100 : undefined;
    }

    return NextResponse.json(payload);
  }

  if (adminAuthorized && companyId) {
    const company = companies.find((item) => item.id === companyId);
    const companyResponses = responses.filter((response) => response.companyId === companyId);
    const filterOptions = buildCompanyFilterOptions(companyResponses);
    const teamOptions = filterOptions.team;
    const filteredResponses = filterResponsesByCompanyFilters(companyResponses, companyFilters);
    const companyAccess = buildCompanyAccessSnapshot({ company, responses: companyResponses });

    const payload = buildDashboardPayload({
      responses: filteredResponses,
      baselineResponses: companyResponses,
      companyLabel: company?.name ?? "Empresa",
      seats: company?.seats,
      teamOptions,
      activeTeamFilter: getTeamOptionsFromFilters(companyFilters),
      filterOptions,
      activeFilters: companyFilters,
      companyAccess,
      ...withAllowedViews(["company"], "company"),
    });

    return NextResponse.json(payload);
  }

  if (accessToken) {
    const parsedAccessToken = tokenSchema.safeParse(accessToken);
    if (!parsedAccessToken.success) {
      return NextResponse.json({ error: "Token de análise inválido" }, { status: 401 });
    }

    const tokenData = await validateToken(parsedAccessToken.data, { tokenType: "company" });
    if (!tokenData) {
      return NextResponse.json({ error: "Token de análise inválido" }, { status: 401 });
    }

    const companyResponses = responses.filter((response) => response.companyId === tokenData.company.id);
    const filterOptions = buildCompanyFilterOptions(companyResponses);
    const teamOptions = filterOptions.team;
    const filteredResponses = filterResponsesByCompanyFilters(companyResponses, companyFilters);
    const companyAccess = buildCompanyAccessSnapshot({ company: tokenData.company, responses: companyResponses });
    const payload = buildDashboardPayload({
      responses: filteredResponses,
      baselineResponses: companyResponses,
      companyLabel: tokenData.company.name,
      seats: tokenData.company.seats,
      teamOptions,
      activeTeamFilter: getTeamOptionsFromFilters(companyFilters),
      filterOptions,
      activeFilters: companyFilters,
      companyAccess,
      ...withAllowedViews(["company"], "company"),
    });

    return NextResponse.json(payload);
  }

  if (viewKey && memberToken) {
    const parsedMemberToken = tokenSchema.safeParse(memberToken);
    if (!parsedMemberToken.success) {
      return NextResponse.json({ error: "Acesso individual inválido" }, { status: 401 });
    }

    const tokenData = await validateToken(parsedMemberToken.data, {
      tokenType: "member",
      allowUsed: true,
    });

    if (!tokenData || tokenData.token.responseId !== viewKey) {
      return NextResponse.json({ error: "Acesso individual inválido" }, { status: 401 });
    }

    const owner = responses.find((response) => response.id === viewKey && response.companyId === tokenData.company.id);
    if (!owner) {
      return NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 });
    }

    const payload = buildDashboardPayload({
      responses: [owner],
      companyLabel: tokenData.company.name,
      seats: 1,
      teamOptions: [],
      activeTeamFilter: "all",
      filterOptions: buildCompanyFilterOptions([owner]),
      activeFilters: companyFilters,
      ownerResponseId: owner.id,
      includeCompanyView: false,
      ...withAllowedViews(["individual"], "individual"),
    });

    return NextResponse.json(payload);
  }

  if (adminAuthorized && !companyId) {
    return NextResponse.json({ error: "Selecione uma empresa no painel administrativo." }, { status: 400 });
  }

  return NextResponse.json(
    { error: "Acesso restrito: use token individual, token de análise ou sessão administrativa." },
    { status: 401 }
  );
}

export async function POST(request: Request) {
  const auditContext = createAuditContext(request);
  const rateLimit = applyRateLimit(`responses:post:${auditContext.ip}`, 30, 10 * 60 * 1000);

  if (!rateLimit.allowed) {
    auditLog("warn", "response.submit.rate_limited", auditContext);
    return NextResponse.json({ error: "Muitas tentativas. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const { answers, team, role, token: tokenValue, triage, consentAccepted, consentVersion } = submitResponseSchema.parse(await request.json());
    const genericToken = await validateToken(tokenValue, { allowUsed: true });
    if (genericToken?.token.tokenType === "company") {
      return NextResponse.json(
        { error: "Token institucional é reutilizável e serve apenas para abrir a visão empresa." },
        { status: 400 }
      );
    }

    const tokenData = await validateToken(tokenValue, { tokenType: "member" });

    if (!tokenData) {
      auditLog("warn", "response.submit.invalid_token", {
        ...auditContext,
        tokenSuffix: tokenValue.slice(-4),
      });
      return NextResponse.json({ error: "Token individual inválido ou já utilizado" }, { status: 401 });
    }

    const normalizedAnswers = answers.map((answer) => ({
      questionId: answer.questionId,
      value: answer.value as LikertValue,
    }));
    const responseId = randomUUID();
    const retentionUntil = calculateRetentionUntil(new Date().toISOString());

    const record: ResponseRecord = {
      id: responseId,
      pseudonymId: buildPseudonymId(responseId, tokenData.company.id),
      submittedAt: new Date().toISOString(),
      answers: normalizedAnswers,
      team,
      role,
      companyId: tokenData.company.id,
      triage,
      consent: consentAccepted
        ? {
            accepted: true,
            acceptedAt: new Date().toISOString(),
            version: consentVersion,
            text: getConsentDisclosureText(),
          }
        : undefined,
      legalBasis: getLegalBasisLabel(),
      retentionUntil,
    };

    await saveResponse(record);
    await consumeToken(tokenValue, record.id);
    auditLog("info", "response.submit", {
      ...auditContext,
      companyId: tokenData.company.id,
      responseId: record.id,
      pseudonymId: record.pseudonymId,
      retentionUntil,
    });

    return NextResponse.json({ viewKey: record.id, memberToken: tokenValue });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: getValidationMessage(error as never) }, { status: 400 });
    }

    captureServerError(error, {
      route: "/api/responses",
      operation: "submit_response",
      details: auditContext,
    });
    return NextResponse.json({ error: "Falha ao salvar resposta" }, { status: 500 });
  }
}
