import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const findTokenMock = vi.fn();
const validateTokenMock = vi.fn();

vi.mock("@/lib/storage", () => ({
  findToken: findTokenMock,
  validateToken: validateTokenMock,
}));

vi.mock("@/lib/security", async () => {
  const actual = await vi.importActual<typeof import("@/lib/security")>("@/lib/security");
  return {
    ...actual,
    applyRateLimit: vi.fn(() => ({ allowed: true, remaining: 10, retryAfterSeconds: 60 })),
    auditLog: vi.fn(),
  };
});

describe("/api/tokens/validate", () => {
  beforeEach(() => {
    vi.resetModules();
    findTokenMock.mockReset();
    validateTokenMock.mockReset();
  });

  it("returns 404 for an unknown token", async () => {
    findTokenMock.mockResolvedValue(null);
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/tokens/validate", {
      method: "POST",
      body: JSON.stringify({ token: "missing-token" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.valid).toBe(false);
  });

  it("returns token metadata for a valid member token", async () => {
    findTokenMock.mockResolvedValue({
      company: {
        id: "company-1",
        name: "Empresa Teste",
        seats: 2,
        createdAt: "2026-01-01T00:00:00.000Z",
        tokens: [
          {
            value: "ABC123",
            tokenType: "member",
            used: false,
            active: true,
            label: "Avaliação individual",
            reusable: false,
            companyId: "company-1",
          },
          {
            value: "XYZ999",
            tokenType: "member",
            used: true,
            active: true,
            label: "Avaliação individual",
            reusable: false,
            companyId: "company-1",
          },
        ],
      },
      token: {
        value: "ABC123",
        used: false,
        active: true,
        tokenType: "member",
        label: "Avaliação individual",
        reusable: false,
        companyId: "company-1",
      },
    });
    validateTokenMock.mockResolvedValue({ ok: true });

    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/tokens/validate", {
      method: "POST",
      body: JSON.stringify({ token: "abc123" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.valid).toBe(true);
    expect(body.company.name).toBe("Empresa Teste");
    expect(body.remaining).toBe(1);
    expect(validateTokenMock).toHaveBeenCalledWith("ABC123", { tokenType: "member" });
  });
});
