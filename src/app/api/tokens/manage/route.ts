import { NextRequest, NextResponse } from "next/server";
import { deleteToken, findToken, resetToken, setTokenActive, validateToken } from "@/lib/storage";

type TokenAction = "reset" | "toggle-active" | "delete";

function isAdminAuthorized(request: NextRequest) {
  const adminKey = request.headers.get("x-admin-key");
  const ADMIN_KEY = process.env.ADMIN_KEY;
  const adminSession = request.cookies.get("adminSession")?.value === "ok";
  return Boolean((adminKey && ADMIN_KEY && adminKey === ADMIN_KEY) || adminSession);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action?: TokenAction;
      targetToken?: string;
      accessToken?: string;
    };

    const action = body.action;
    const targetToken = body.targetToken?.trim().toUpperCase();
    const accessToken = body.accessToken?.trim().toUpperCase();

    if (!action || !targetToken) {
      return NextResponse.json({ error: "Ação e token são obrigatórios." }, { status: 400 });
    }

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (action === "reset") {
      await resetToken(targetToken);
      return NextResponse.json({ ok: true });
    }

    if (action === "toggle-active") {
      await setTokenActive(targetToken, target.token.active === false);
      return NextResponse.json({ ok: true });
    }

    if (action === "delete") {
      await deleteToken(targetToken);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (error) {
    console.error("Erro ao atualizar token", error);
    return NextResponse.json({ error: "Falha ao atualizar token." }, { status: 500 });
  }
}
