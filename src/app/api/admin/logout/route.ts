import { NextRequest, NextResponse } from "next/server";
import { auditLog, createAuditContext, getSessionCookieName, readAdminSession } from "@/lib/security";

export async function POST(request: NextRequest) {
  const session = readAdminSession(request);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSessionCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  auditLog("info", "admin.logout", {
    ...createAuditContext(request),
    sessionId: session?.sessionId,
    user: session?.user,
  });
  return response;
}
