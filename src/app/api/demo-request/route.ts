import { NextRequest, NextResponse } from "next/server";
import { dispatchDemoAccess } from "@/lib/demo-access";
import { captureServerError } from "@/lib/observability";
import { auditLog, applyRateLimit, createAuditContext } from "@/lib/security";
import { createCompany } from "@/lib/storage";
import {
  demoRequestPersonalizationSchema,
  demoRequestSchema,
  getValidationMessage,
} from "@/lib/validation";

function getBaseUrl(request: NextRequest) {
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (publicUrl) {
    return publicUrl.replace(/\/$/, "");
  }

  return new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
  const auditContext = createAuditContext(request);
  const rateLimit = applyRateLimit(`demo-request:create:${auditContext.ip}`, 12, 15 * 60 * 1000);

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const body = demoRequestSchema.parse(await request.json());
    const company = await createCompany(body.companyName, 5);
    const memberTokens = company.tokens.filter((token) => token.tokenType === "member").map((token) => token.value);
    const companyToken = company.tokens.find((token) => token.tokenType === "company")?.value;

    if (!companyToken) {
      throw new Error("Token corporativo não foi gerado.");
    }

    const baseUrl = getBaseUrl(request);
    const delivery = await dispatchDemoAccess({
      companyName: body.companyName,
      fullName: body.fullName,
      corporateEmail: body.corporateEmail,
      employeeRange: body.employeeRange,
      requestId: company.id,
      memberTokens,
      companyToken,
      landingUrl: `${baseUrl}/`,
      methodUrl: `${baseUrl}/form`,
    });

    auditLog("info", "demo.request.created", {
      ...auditContext,
      companyId: company.id,
      companyName: body.companyName,
      fullName: body.fullName,
      corporateEmail: body.corporateEmail,
      employeeRange: body.employeeRange,
      deliveryMode: delivery.mode,
      seatsCreated: 5,
    });

    return NextResponse.json({
      ok: true,
      requestId: company.id,
      corporateEmail: body.corporateEmail,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: getValidationMessage(error as never) }, { status: 400 });
    }

    captureServerError(error, {
      route: "/api/demo-request",
      operation: "create-demo-request",
      details: auditContext,
    });
    return NextResponse.json({ error: "Não foi possível preparar sua demonstração agora." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auditContext = createAuditContext(request);
  const rateLimit = applyRateLimit(`demo-request:patch:${auditContext.ip}`, 30, 15 * 60 * 1000);

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const body = demoRequestPersonalizationSchema.parse(await request.json());

    auditLog("info", "demo.request.personalized", {
      ...auditContext,
      requestId: body.requestId,
      hasPsychosocialAssessment: body.hasPsychosocialAssessment,
      urgency: body.urgency,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: getValidationMessage(error as never) }, { status: 400 });
    }

    captureServerError(error, {
      route: "/api/demo-request",
      operation: "personalize-demo-request",
      details: auditContext,
    });
    return NextResponse.json({ error: "Não foi possível salvar suas respostas agora." }, { status: 500 });
  }
}
