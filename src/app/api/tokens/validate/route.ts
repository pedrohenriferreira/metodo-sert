import { NextResponse } from "next/server";
import { validateToken } from "@/lib/storage";

export async function POST(request: Request) {
  const { token } = (await request.json()) as { token?: string };

  if (!token) {
    return NextResponse.json({ valid: false, error: "Token ausente" }, { status: 400 });
  }

  const found = await validateToken(token.trim().toUpperCase(), { tokenType: "member" });

  if (!found) {
    return NextResponse.json(
      { valid: false, error: "Token individual inválido ou utilizado" },
      { status: 404 }
    );
  }

  const { company, token: tokenData } = found;
  const memberTokens = company.tokens.filter((item) => item.tokenType === "member");

  return NextResponse.json({
    valid: true,
    company: { id: company.id, name: company.name },
    token: {
      value: tokenData.value,
      used: tokenData.used,
      tokenType: tokenData.tokenType,
      label: tokenData.label,
    },
    remaining: memberTokens.filter((item) => !item.used).length,
    total: memberTokens.length,
  });
}
