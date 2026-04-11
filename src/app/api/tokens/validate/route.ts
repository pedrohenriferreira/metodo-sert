import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, auditLog, createAuditContext } from "@/lib/security";
import { getValidationMessage, tokenValidationSchema } from "@/lib/validation";
import { findToken, validateToken } from "@/lib/storage";

export async function POST(request: NextRequest) {
  const auditContext = createAuditContext(request);
  const rateLimit = applyRateLimit(`tokens:validate:${auditContext.ip}`, 60, 10 * 60 * 1000);

  if (!rateLimit.allowed) {
    auditLog("warn", "token.validate.rate_limited", auditContext);
    return NextResponse.json({ valid: false, error: "Muitas tentativas. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  let token: string;
  try {
    token = tokenValidationSchema.parse(await request.json()).token;
  } catch (error) {
    return NextResponse.json({ valid: false, error: getValidationMessage(error as never) }, { status: 400 });
  }

  const found = await findToken(token);

  if (!found) {
    auditLog("warn", "token.validate.not_found", {
      ...auditContext,
      tokenSuffix: token.slice(-4),
    });
    return NextResponse.json(
      { valid: false, error: "Token inválido ou não encontrado" },
      { status: 404 }
    );
  }

  if (found.token.tokenType === "member") {
    const availableMemberToken = await validateToken(token, { tokenType: "member" });
    if (!availableMemberToken) {
      return NextResponse.json(
        { valid: false, error: "Token individual inválido ou utilizado" },
        { status: 404 }
      );
    }
  }

  const { company, token: tokenData } = found;
  const memberTokens = company.tokens.filter((item) => item.tokenType === "member");

  return NextResponse.json({
    valid: true,
    company: { id: company.id, name: company.name },
    token: {
      value: tokenData.value,
      used: tokenData.used,
      active: tokenData.active ?? true,
      tokenType: tokenData.tokenType,
      label: tokenData.label,
    },
    remaining: memberTokens.filter((item) => !item.used).length,
    total: memberTokens.length,
  });
}
