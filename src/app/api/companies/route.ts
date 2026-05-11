import { NextRequest, NextResponse } from "next/server";
import { summarizeResponseRisk } from "@/lib/metrics";
import { applyRateLimit, auditLog, createAuditContext, getAdminPrincipal } from "@/lib/security";
import {
  createCompanySchema,
  deleteCompanyOrResponseSchema,
  getValidationMessage,
} from "@/lib/validation";
import { createCompany, deleteCompany, deleteResponse, listCompanies, readResponses } from "@/lib/storage";

function isAuthorized(request: NextRequest) {
  return getAdminPrincipal(request);
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
  const tokenType =
    token.tokenType ?? (token.reusable ? "company" : "member");

  return {
    value: token.value,
    used: token.used,
    active: token.active ?? true,
    usedAt: token.usedAt,
    label:
      token.label ??
      (tokenType === "company" ? "Acesso diretoria/RH" : "Avaliação individual"),
    reusable: token.reusable ?? tokenType === "company",
    responseId: token.responseId,
    tokenType,
  };
}

export async function GET(request: NextRequest) {
  const principal = isAuthorized(request);
  if (!principal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = applyRateLimit(`companies:get:${createAuditContext(request).ip}`, 120, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Muitas requisições." }, { status: 429 });
  }

  const companies = await listCompanies();
  const responses = await readResponses();
  const compact = companies.map((company) => {
    const normalizedTokens = company.tokens.map(normalizeToken);
    const memberTokens = normalizedTokens.filter((token) => token.tokenType === "member");
    const companyTokens = normalizedTokens.filter((token) => token.tokenType === "company");
    const companyResponses = responses.filter((response) => response.companyId === company.id);
    const respondents = companyResponses
      .map((response) => {
        const summary = summarizeResponseRisk(response);
        const memberToken = memberTokens.find((token) => token.responseId === response.id);

        return {
          id: response.id,
          companyId: company.id,
          companyName: company.name,
          submittedAt: response.submittedAt,
          team: response.team,
          role: response.role,
          overallAverage: summary.overallAverage,
          riskBand: summary.riskBand,
          weakestDimension: summary.weakestDimension,
          strongestDimension: summary.strongestDimension,
          alerts: summary.alerts,
          memberToken: memberToken?.value ?? null,
          viewKey: response.id,
        };
      })
      .sort((a, b) => a.overallAverage - b.overallAverage);
    const alerts = companyResponses
      .map((response) => {
        const summary = summarizeResponseRisk(response);
        if (summary.riskBand !== "Atenção alta" && summary.riskBand !== "Crítico") {
          return null;
        }

        const memberToken = memberTokens.find((token) => token.responseId === response.id);

        return {
          id: response.id,
          companyId: company.id,
          companyName: company.name,
          submittedAt: response.submittedAt,
          team: response.team,
          role: response.role,
          overallAverage: summary.overallAverage,
          riskBand: summary.riskBand,
          weakestDimension: summary.weakestDimension,
          strongestDimension: summary.strongestDimension,
          alerts: summary.alerts,
          memberToken: memberToken?.value ?? null,
          analysisToken: companyTokens[0]?.value ?? null,
          viewKey: response.id,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => {
        const scoreA = a.riskBand === "Crítico" ? 0 : 1;
        const scoreB = b.riskBand === "Crítico" ? 0 : 1;
        if (scoreA !== scoreB) return scoreA - scoreB;
        return a.overallAverage - b.overallAverage;
      });

    return {
      id: company.id,
      name: company.name,
      seats: company.seats,
      createdAt: company.createdAt,
      totalTokens: memberTokens.length,
      usedTokens: memberTokens.filter((token) => token.used).length,
      responseCount: companyResponses.length,
      memberTokens,
      companyTokens,
      respondents,
      highRiskAlerts: alerts,
    };
  });

  return NextResponse.json({ companies: compact });
}

export async function POST(request: NextRequest) {
  const principal = isAuthorized(request);
  const auditContext = createAuditContext(request);
  if (!principal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = applyRateLimit(`companies:post:${auditContext.ip}`, 20, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    auditLog("warn", "company.create.rate_limited", auditContext);
    return NextResponse.json({ error: "Muitas tentativas. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const { name, seats } = createCompanySchema.parse(await request.json());

    const company = await createCompany(name, Number(seats));
    auditLog("info", "company.create", {
      ...auditContext,
      principal: principal.kind,
      companyId: company.id,
      seats,
    });
    return NextResponse.json({ company });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: getValidationMessage(error as never) }, { status: 400 });
    }

    console.error("Erro ao criar empresa", error);
    return NextResponse.json({ error: "Falha ao criar empresa" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const principal = isAuthorized(request);
  const auditContext = createAuditContext(request);
  if (!principal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = applyRateLimit(`companies:delete:${auditContext.ip}`, 20, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    auditLog("warn", "company.delete.rate_limited", auditContext);
    return NextResponse.json({ error: "Muitas tentativas. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const body = deleteCompanyOrResponseSchema.parse(await request.json());

    if (body.companyId) {
      await deleteCompany(body.companyId);
      auditLog("warn", "company.delete", {
        ...auditContext,
        principal: principal.kind,
        companyId: body.companyId,
      });
      return NextResponse.json({ ok: true });
    }

    if (body.responseId) {
      await deleteResponse(body.responseId);
      auditLog("warn", "response.delete", {
        ...auditContext,
        principal: principal.kind,
        responseId: body.responseId,
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Informe companyId ou responseId" }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: getValidationMessage(error as never) }, { status: 400 });
    }

    console.error("Erro ao excluir registro", error);
    return NextResponse.json({ error: "Falha ao excluir registro" }, { status: 500 });
  }
}
