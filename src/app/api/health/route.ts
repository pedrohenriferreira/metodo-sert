import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { captureServerError } from "@/lib/observability";

export async function GET() {
  try {
    await prisma.$queryRawUnsafe("select 1");

    return NextResponse.json({
      ok: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
      checks: {
        database: "up",
      },
    });
  } catch (error) {
    captureServerError(error, {
      route: "/api/health",
      operation: "database_check",
    });

    return NextResponse.json(
      {
        ok: false,
        status: "degraded",
        timestamp: new Date().toISOString(),
        checks: {
          database: "down",
        },
      },
      { status: 503 }
    );
  }
}
