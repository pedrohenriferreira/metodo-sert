import { NextResponse } from "next/server";

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || process.env.ADMIN_KEY || "changeme";

export async function POST(request: Request) {
  const { user, password } = (await request.json()) as {
    user?: string;
    password?: string;
  };

  if (!user || !password) {
    return NextResponse.json({ error: "Credenciais obrigatórias" }, { status: 400 });
  }

  if (user !== ADMIN_USER || password !== ADMIN_PASS) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("adminSession", "ok", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8h
  });
  return response;
}
