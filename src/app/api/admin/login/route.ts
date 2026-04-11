import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, auditLog, createAdminSessionCookie, createAuditContext } from "@/lib/security";
import { getValidationMessage, loginSchema } from "@/lib/validation";

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || process.env.ADMIN_KEY || "changeme";

export async function POST(request: NextRequest) {
  const auditContext = createAuditContext(request);
  const rateLimit = applyRateLimit(`admin-login:${auditContext.ip}`, 5, 15 * 60 * 1000);

  if (!rateLimit.allowed) {
    auditLog("warn", "admin.login.rate_limited", auditContext);
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde antes de tentar novamente." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  let parsedBody;
  try {
    parsedBody = loginSchema.parse(await request.json());
  } catch (error) {
    auditLog("warn", "admin.login.invalid_payload", auditContext);
    return NextResponse.json({ error: getValidationMessage(error as never) }, { status: 400 });
  }

  const { user, password } = parsedBody;

  if (user !== ADMIN_USER || password !== ADMIN_PASS) {
    auditLog("warn", "admin.login.failed", { ...auditContext, user });
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const session = createAdminSessionCookie(user);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(session.cookieName, session.cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: session.maxAge,
  });
  auditLog("info", "admin.login.succeeded", {
    ...auditContext,
    user,
    sessionId: session.payload.sid,
  });
  return response;
}
