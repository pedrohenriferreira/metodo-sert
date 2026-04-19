import { describe, expect, it, vi, beforeEach } from "vitest";
import { questions } from "@/lib/questions";

const validateTokenMock = vi.fn();
const saveResponseMock = vi.fn();
const consumeTokenMock = vi.fn();

vi.mock("@/lib/storage", () => ({
  validateToken: validateTokenMock,
  saveResponse: saveResponseMock,
  consumeToken: consumeTokenMock,
  listCompanies: vi.fn(),
  readResponses: vi.fn(),
}));

vi.mock("@/lib/security", async () => {
  const actual = await vi.importActual<typeof import("@/lib/security")>("@/lib/security");
  return {
    ...actual,
    applyRateLimit: vi.fn(() => ({ allowed: true, remaining: 10, retryAfterSeconds: 60 })),
    auditLog: vi.fn(),
    getAdminPrincipal: vi.fn(() => null),
  };
});

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/responses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/responses", () => {
  beforeEach(() => {
    vi.resetModules();
    validateTokenMock.mockReset();
    saveResponseMock.mockReset();
    consumeTokenMock.mockReset();
  });

  it("rejects institutional token submission", async () => {
    validateTokenMock.mockResolvedValueOnce({
      token: { tokenType: "company" },
    });

    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({
        token: "company-token",
        consentAccepted: true,
        consentVersion: "2026-04",
        answers: questions.map((question) => ({ questionId: question.id, value: 3 })),
      })
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/Token institucional/);
  });

  it("saves a valid member response", async () => {
    validateTokenMock
      .mockResolvedValueOnce({
        token: { tokenType: "member" },
      })
      .mockResolvedValueOnce({
        company: { id: "company-1" },
        token: { tokenType: "member" },
      });

    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({
        token: "member-token",
        team: "Financeiro",
        role: "Analista",
        consentAccepted: true,
        consentVersion: "2026-04",
        answers: questions.map((question) => ({ questionId: question.id, value: 4 })),
      })
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.memberToken).toBe("MEMBER-TOKEN");
    expect(saveResponseMock).toHaveBeenCalledTimes(1);
    expect(consumeTokenMock).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid payloads", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({
        token: "member-token",
        consentAccepted: false,
        consentVersion: "2026-04",
        answers: [],
      })
    );

    expect(response.status).toBe(400);
  });
});
