import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildDashboardPayload, ViewMode } from "@/lib/metrics";
import { questions } from "@/lib/questions";
import {
  Answer,
  consumeToken,
  LikertValue,
  listCompanies,
  readResponses,
  ResponseRecord,
  saveResponse,
  TriageData,
  validateToken,
} from "@/lib/storage";

function isAdminAuthorized(request: NextRequest) {
  const adminKey = request.headers.get("x-admin-key");
  const ADMIN_KEY = process.env.ADMIN_KEY;
  const adminSession = request.cookies.get("adminSession")?.value === "ok";
  return Boolean((adminKey && ADMIN_KEY && adminKey === ADMIN_KEY) || adminSession);
}

function withAllowedViews(allowedViews: ViewMode[], defaultView: ViewMode) {
  return { allowedViews, defaultView };
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const viewKey = url.searchParams.get("viewKey");
  const memberToken = url.searchParams.get("memberToken");
  const accessToken = url.searchParams.get("accessToken");
  const companyId = url.searchParams.get("companyId");
  const adminScope = url.searchParams.get("adminScope");
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
    const scopedResponses = adminScope === "individual-complete" ? [owner] : companyResponses;
    const companyLabel =
      adminScope === "individual-complete"
        ? `${owner.team || owner.role || "Colaborador"} · ${company?.name ?? "Empresa"}`
        : company?.name ?? "Empresa";

    const payload = buildDashboardPayload({
      responses: scopedResponses,
      companyLabel,
      seats: adminScope === "individual-complete" ? 1 : company?.seats,
      ownerResponseId: owner.id,
      ...withAllowedViews(["individual", "company"], adminScope === "individual-complete" ? "company" : "individual"),
    });

    return NextResponse.json(payload);
  }

  if (adminAuthorized && companyId) {
    const company = companies.find((item) => item.id === companyId);
    const companyResponses = responses.filter((response) => response.companyId === companyId);

    const payload = buildDashboardPayload({
      responses: companyResponses,
      companyLabel: company?.name ?? "Empresa",
      seats: company?.seats,
      ...withAllowedViews(["company"], "company"),
    });

    return NextResponse.json(payload);
  }

  if (accessToken) {
    const tokenData = await validateToken(accessToken.trim().toUpperCase(), { tokenType: "company" });
    if (!tokenData) {
      return NextResponse.json({ error: "Token de análise inválido" }, { status: 401 });
    }

    const companyResponses = responses.filter((response) => response.companyId === tokenData.company.id);
    const payload = buildDashboardPayload({
      responses: companyResponses,
      companyLabel: tokenData.company.name,
      seats: tokenData.company.seats,
      ...withAllowedViews(["company"], "company"),
    });

    return NextResponse.json(payload);
  }

  if (viewKey && memberToken) {
    const tokenData = await validateToken(memberToken.trim().toUpperCase(), {
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

    const companyResponses = responses.filter((response) => response.companyId === tokenData.company.id);
    const payload = buildDashboardPayload({
      responses: companyResponses,
      companyLabel: tokenData.company.name,
      seats: tokenData.company.seats,
      ownerResponseId: owner.id,
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
  try {
    const body = await request.json();
    const { answers, team, role, token, triage } = body as {
      answers: Answer[];
      team?: string;
      role?: string;
      token?: string;
      triage?: TriageData;
    };

    if (!token) {
      return NextResponse.json({ error: "Token obrigatório" }, { status: 401 });
    }

    const tokenValue = String(token).trim().toUpperCase();
    const tokenData = await validateToken(tokenValue, { tokenType: "member" });

    if (!tokenData) {
      return NextResponse.json({ error: "Token individual inválido ou já utilizado" }, { status: 401 });
    }

    const questionIds = new Set(questions.map((question) => question.id));
    if (!Array.isArray(answers) || answers.length !== questions.length) {
      return NextResponse.json({ error: "Responda todas as perguntas da escala." }, { status: 400 });
    }

    const invalid = answers.some((answer) => {
      const inRange = [1, 2, 3, 4, 5].includes(answer.value);
      return !questionIds.has(answer.questionId) || !inRange;
    });

    if (invalid) {
      return NextResponse.json({ error: "Respostas inválidas ou pergunta desconhecida." }, { status: 400 });
    }

    const normalizedAnswers = answers.map((answer) => ({
      questionId: answer.questionId,
      value: Number(answer.value) as LikertValue,
    }));

    const record: ResponseRecord = {
      id: randomUUID(),
      submittedAt: new Date().toISOString(),
      answers: normalizedAnswers,
      team: team?.slice(0, 60),
      role: role?.slice(0, 60),
      companyId: tokenData.company.id,
      triage,
    };

    await saveResponse(record);
    await consumeToken(tokenValue, record.id);

    return NextResponse.json({ viewKey: record.id, memberToken: tokenValue });
  } catch (error) {
    console.error("Erro ao salvar resposta", error);
    return NextResponse.json({ error: "Falha ao salvar resposta" }, { status: 500 });
  }
}
