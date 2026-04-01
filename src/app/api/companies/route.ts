import { NextRequest, NextResponse } from "next/server";
import { summarizeResponseRisk } from "@/lib/metrics";
import { createCompany, deleteCompany, deleteResponse, listCompanies, readResponses } from "@/lib/storage";

const ADMIN_KEY = process.env.ADMIN_KEY;

function isAuthorized(request: NextRequest) {
  const header = request.headers.get("x-admin-key");
  const session = request.cookies.get("adminSession")?.value === "ok";
  const keyOk = ADMIN_KEY && header === ADMIN_KEY;
  return keyOk || session;
}

function normalizeToken(token: {
  value: string;
  used: boolean;
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
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [companies, responses] = await Promise.all([listCompanies(), readResponses()]);
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
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, seats } = body as { name: string; seats: number };

    if (!name || !seats) {
      return NextResponse.json({ error: "Nome e quantidade são obrigatórios" }, { status: 400 });
    }

    const company = await createCompany(name, Number(seats));
    return NextResponse.json({ company });
  } catch (error) {
    console.error("Erro ao criar empresa", error);
    return NextResponse.json({ error: "Falha ao criar empresa" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { companyId?: string; responseId?: string };

    if (body.companyId) {
      await deleteCompany(body.companyId);
      return NextResponse.json({ ok: true });
    }

    if (body.responseId) {
      await deleteResponse(body.responseId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Informe companyId ou responseId" }, { status: 400 });
  } catch (error) {
    console.error("Erro ao excluir registro", error);
    return NextResponse.json({ error: "Falha ao excluir registro" }, { status: 500 });
  }
}
