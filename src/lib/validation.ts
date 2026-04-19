import { z } from "zod";
import { getConsentVersion } from "@/lib/governance";
import { questions } from "@/lib/questions";

const questionIds = new Set(questions.map((question) => question.id));

export const tokenSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .transform((value) => value.toUpperCase());

export const companyNameSchema = z
  .string()
  .trim()
  .min(2, "Nome da empresa é obrigatório")
  .max(120, "Nome da empresa é muito longo");

const boundedTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(60);

export const triageSchema = z
  .object({
    workModel: z.enum(["presencial", "remoto", "hibrido"]).optional(),
    shift: z.enum(["diurno", "noturno", "turnos"]).optional(),
    tenureMonths: z.number().int().min(0).max(600).optional(),
    area: z.string().trim().min(1).max(80).optional(),
    leadership: z.enum(["sim", "nao"]).optional(),
    publicExposure: z.enum(["alta", "media", "baixa"]).optional(),
    recentOverload: z.enum(["sim", "nao"]).optional(),
    sleepQuality: z.enum(["boa", "regular", "ruim"]).optional(),
    weeklyHours: z.number().int().min(1).max(168).optional(),
    energyLevel: z.enum(["preservada", "oscilando", "esgotada"]).optional(),
    emotionalPressure: z.enum(["baixa", "media", "alta"]).optional(),
    motivationLevel: z.enum(["preservada", "oscilando", "reduzida"]).optional(),
    socialIsolation: z.enum(["nao", "pontual", "frequente"]).optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    user: z.string().trim().min(1).max(120),
    password: z.string().min(1).max(256),
  })
  .strict();

export const createCompanySchema = z
  .object({
    name: companyNameSchema,
    seats: z.coerce.number().int().min(1).max(10000),
  })
  .strict();

export const deleteCompanyOrResponseSchema = z
  .object({
    companyId: z.string().trim().uuid().optional(),
    responseId: z.string().trim().uuid().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const filled = [value.companyId, value.responseId].filter(Boolean).length;
    if (filled !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe exatamente um alvo para exclusão.",
      });
    }
  });

export const tokenActionSchema = z
  .object({
    action: z.enum(["reset", "toggle-active", "delete"]),
    targetToken: tokenSchema,
    accessToken: tokenSchema.optional(),
  })
  .strict();

export const tokenValidationSchema = z
  .object({
    token: tokenSchema,
  })
  .strict();

export const answerSchema = z
  .object({
    questionId: z.string().trim(),
    value: z.coerce.number().int().min(1).max(5),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!questionIds.has(value.questionId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["questionId"],
        message: "Pergunta desconhecida.",
      });
    }
  });

export const submitResponseSchema = z
  .object({
    answers: z.array(answerSchema).length(questions.length, "Responda todas as perguntas da escala."),
    team: boundedTextSchema.optional(),
    role: boundedTextSchema.optional(),
    token: tokenSchema,
    triage: triageSchema.optional(),
    consentAccepted: z
      .boolean()
      .refine((value) => value === true, "É necessário registrar o consentimento para continuar."),
    consentVersion: z.string().trim().min(1).max(32).default(getConsentVersion()),
  })
  .strict()
  .superRefine((value, ctx) => {
    const uniqueIds = new Set(value.answers.map((answer) => answer.questionId));
    if (uniqueIds.size !== questions.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["answers"],
        message: "As respostas devem conter cada pergunta exatamente uma vez.",
      });
    }
  });

export function getValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message || "Dados inválidos.";
}
