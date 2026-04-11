import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, auditLog, createAuditContext, getAdminPrincipal } from "@/lib/security";
import { getValidationMessage, tokenActionSchema } from "@/lib/validation";
import { deleteToken, findToken, resetToken, setTokenActive, validateToken } from "@/lib/storage";

type TokenAction = "reset" | "toggle-active" | "delete";

function isAdminAuthorized(request: NextRequest) {
  return getAdminPrincipal(request);
}

export async function POST(request: NextRequest) {
  const auditContext = createAuditContext(request);
  const rateLimit = applyRateLimit(`tokens:manage:${auditContext.ip}`, 40, 15 * 60 * 1000);

  if (!rateLimit.allowed) {
    auditLog("warn", "token.manage.rate_limited", auditContext);
    return NextResponse.json({ error: "Muitas tentativas. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const body = tokenActionSchema.parse(await request.json());
    const action = body.action as TokenAction;
    const targetToken = body.targetToken;
    const accessToken = body.accessToken;

    const target = await findToken(targetToken);
    if (!target) {
      return NextResponse.json({ error: "Token não encontrado." }, { status: 404 });
    }

    const adminAuthorized = isAdminAuthorized(request);
    let accessAuthorized = false;

    if (accessToken) {
      const access = await validateToken(accessToken, { tokenType: "company", allowUsed: true });
      accessAuthorized = Boolean(access && access.company.id === target.company.id);
    }

    if (!adminAuthorized && !accessAuthorized) {
      auditLog("warn", "token.manage.unauthorized", {
        ...auditContext,
        action,
        targetTokenSuffix: targetToken.slice(-4),
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!adminAuthorized) {
      if (action === "delete") {
        return NextResponse.json({ error: "Exclusão de token requer sessão administrativa." }, { status: 403 });
      }

      if (target.token.tokenType === "company") {
        return NextResponse.json({ error: "Token institucional só pode ser alterado pela administração." }, { status: 403 });
      }
    }

    if (action === "reset") {
      await resetToken(targetToken);
      auditLog("warn", "token.reset", {
        ...auditContext,
        principal: adminAuthorized ? adminAuthorized.kind : "company-token",
        targetTokenSuffix: targetToken.slice(-4),
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "toggle-active") {
      await setTokenActive(targetToken, target.token.active === false);
      auditLog("warn", "token.toggle_active", {
        ...auditContext,
        principal: adminAuthorized ? adminAuthorized.kind : "company-token",
        targetTokenSuffix: targetToken.slice(-4),
        nextActive: target.token.active === false,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "delete") {
      await deleteToken(targetToken);
      auditLog("warn", "token.delete", {
        ...auditContext,
        principal: adminAuthorized ? adminAuthorized.kind : "company-token",
        targetTokenSuffix: targetToken.slice(-4),
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: getValidationMessage(error as never) }, { status: 400 });
    }

    console.error("Erro ao atualizar token", error);
    return NextResponse.json({ error: "Falha ao atualizar token." }, { status: 500 });
  }
}
