import { describe, expect, it } from "vitest";
import { computeMetrics, summarizeResponseRisk } from "@/lib/metrics";
import { questions } from "@/lib/questions";
import type { ResponseRecord } from "@/lib/storage";

function createResponse(args: {
  id: string;
  submittedAt?: string;
  valueByQuestion: (questionId: string) => 1 | 2 | 3 | 4 | 5;
  team?: string;
  role?: string;
}): ResponseRecord {
  return {
    id: args.id,
    submittedAt: args.submittedAt ?? "2026-01-01T00:00:00.000Z",
    companyId: "company-1",
    team: args.team,
    role: args.role,
    answers: questions.map((question) => ({
      questionId: question.id,
      value: args.valueByQuestion(question.id),
    })),
  };
}

describe("metrics", () => {
  it("summarizes a high-risk response", () => {
    const response = createResponse({
      id: "response-1",
      team: "Operações",
      role: "Analista",
      valueByQuestion: () => 1,
    });

    const summary = summarizeResponseRisk(response);

    expect(summary.id).toBe("response-1");
    expect(summary.team).toBe("Operações");
    expect(summary.role).toBe("Analista");
    expect(summary.overallAverage).toBe(1);
    expect(summary.riskBand).toBe("Crítico");
    expect(summary.alerts.length).toBeGreaterThan(0);
  });

  it("computes aggregate metrics across responses", () => {
    const lowRisk = createResponse({
      id: "response-healthy",
      valueByQuestion: () => 5,
    });
    const highRisk = createResponse({
      id: "response-critical",
      valueByQuestion: () => 1,
    });

    const metrics = computeMetrics([lowRisk, highRisk]);

    expect(metrics.totalResponses).toBe(2);
    expect(metrics.overallAverage).toBe(3);
    expect(metrics.dimensionScores).toHaveLength(6);
    expect(metrics.questionScores).toHaveLength(questions.length);
  });
});
