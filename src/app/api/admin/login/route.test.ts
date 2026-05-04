import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/audit-store", () => ({
  persistAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/login", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("/api/admin/login", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env.ADMIN_USER = "admin";
    process.env.ADMIN_PASS = "senha-inicial";
    process.env.ADMIN_SESSION_SECRET = "segredo-de-teste";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("reads admin credentials at request time", async () => {
    const { POST } = await import("./route");

    const firstResponse = await POST(
      makeRequest({
        user: "admin",
        password: "senha-inicial",
      })
    );

    expect(firstResponse.status).toBe(200);

    process.env.ADMIN_PASS = "senha-atualizada";

    const secondResponse = await POST(
      makeRequest({
        user: "admin",
        password: "senha-atualizada",
      })
    );

    expect(secondResponse.status).toBe(200);
  });
});
