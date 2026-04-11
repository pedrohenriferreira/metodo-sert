import { randomUUID } from "crypto";
import { TokenType as PrismaTokenType, Prisma } from "@prisma/client";
import { questions } from "@/lib/questions";
import { prisma } from "@/lib/prisma";

export type LikertValue = 1 | 2 | 3 | 4 | 5;
export type TokenType = "member" | "company";

export type Answer = {
  questionId: string;
  value: LikertValue;
};

export type Token = {
  value: string;
  companyId: string;
  tokenType: TokenType;
  label: string;
  reusable: boolean;
  active?: boolean;
  used: boolean;
  usedAt?: string;
  responseId?: string;
};

export type Company = {
  id: string;
  name: string;
  seats: number;
  createdAt: string;
  tokens: Token[];
};

export type ResponseRecord = {
  id: string;
  submittedAt: string;
  answers: Answer[];
  team?: string;
  role?: string;
  companyId?: string;
  triage?: TriageData;
};

export type TriageData = {
  workModel?: "presencial" | "remoto" | "hibrido";
  shift?: "diurno" | "noturno" | "turnos";
  tenureMonths?: number;
  area?: string;
  leadership?: "sim" | "nao";
  publicExposure?: "alta" | "media" | "baixa";
  recentOverload?: "sim" | "nao";
  sleepQuality?: "boa" | "regular" | "ruim";
  weeklyHours?: number;
  energyLevel?: "preservada" | "oscilando" | "esgotada";
  emotionalPressure?: "baixa" | "media" | "alta";
  motivationLevel?: "preservada" | "oscilando" | "reduzida";
  socialIsolation?: "nao" | "pontual" | "frequente";
};

type PrismaCompany = Awaited<ReturnType<typeof prisma.company.findMany>>[number];
type PrismaResponse = Awaited<ReturnType<typeof prisma.response.findMany>>[number];
type PrismaToken = Awaited<ReturnType<typeof prisma.token.findMany>>[number];

function mapTokenType(tokenType: PrismaTokenType): TokenType {
  return tokenType === PrismaTokenType.company ? "company" : "member";
}

function toToken(token: PrismaToken): Token {
  return {
    value: token.value,
    companyId: token.companyId,
    tokenType: mapTokenType(token.tokenType),
    label: token.label,
    reusable: token.reusable,
    active: token.active,
    used: token.used,
    usedAt: token.usedAt?.toISOString(),
    responseId: token.responseId ?? undefined,
  };
}

function isAnswerArray(value: Prisma.JsonValue | null): value is Answer[] {
  if (!Array.isArray(value)) return false;

  return value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const answer = item as Record<string, unknown>;
    const numericValue = Number(answer.value);

    return (
      typeof answer.questionId === "string" &&
      Number.isInteger(numericValue) &&
      numericValue >= 1 &&
      numericValue <= 5
    );
  });
}

function toTriageData(value: Prisma.JsonValue | null): TriageData | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as unknown as TriageData;
}

function toResponse(record: PrismaResponse): ResponseRecord {
  return {
    id: record.id,
    submittedAt: record.submittedAt.toISOString(),
    answers: isAnswerArray(record.answers) ? record.answers : [],
    team: record.team ?? undefined,
    role: record.role ?? undefined,
    companyId: record.companyId ?? undefined,
    triage: toTriageData(record.triage),
  };
}

function toCompany(company: PrismaCompany & { tokens?: PrismaToken[] }): Company {
  return {
    id: company.id,
    name: company.name,
    seats: company.seats,
    createdAt: company.createdAt.toISOString(),
    tokens: (company.tokens ?? []).map(toToken),
  };
}

async function getValidQuestionIds() {
  return new Set(questions.map((question) => question.id));
}

export async function readResponses(): Promise<ResponseRecord[]> {
  const responses = await prisma.response.findMany({
    orderBy: { submittedAt: "asc" },
  });

  return responses.map(toResponse);
}

export async function saveResponse(response: ResponseRecord) {
  const validQuestionIds = await getValidQuestionIds();
  const sanitizedAnswers = response.answers
    .filter((answer) => validQuestionIds.has(answer.questionId))
    .map((answer) => ({
      questionId: answer.questionId,
      value: Number(answer.value) as LikertValue,
    }));

  const triage = response.triage
    ? (response.triage as unknown as Prisma.InputJsonValue)
    : Prisma.JsonNull;

  await prisma.response.create({
    data: {
      id: response.id,
      submittedAt: new Date(response.submittedAt),
      answers: sanitizedAnswers as unknown as Prisma.InputJsonValue,
      team: response.team?.trim() || null,
      role: response.role?.trim() || null,
      companyId: response.companyId ?? null,
      triage,
    },
  });
}

export async function listCompanies(): Promise<Company[]> {
  const companies = await prisma.company.findMany({
    include: {
      tokens: {
        orderBy: { value: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return companies.map(toCompany);
}

function generateTokenValue(existing: Set<string>): string {
  let token = "";
  do {
    token = randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
  } while (existing.has(token));
  return token;
}

export async function createCompany(name: string, seats: number): Promise<Company> {
  if (seats < 1) {
    throw new Error("Seats must be at least 1");
  }

  const existingTokens = await prisma.token.findMany({
    select: { value: true },
  });

  const tokenSet = new Set(existingTokens.map((token) => token.value));
  const companyId = randomUUID();

  const memberTokens = Array.from({ length: seats }, () => {
    const value = generateTokenValue(tokenSet);
    tokenSet.add(value);

    return {
      value,
      tokenType: PrismaTokenType.member,
      label: "Avaliação individual",
      reusable: false,
      active: true,
      used: false,
    };
  });

  const companyAccessTokenValue = generateTokenValue(tokenSet);
  tokenSet.add(companyAccessTokenValue);

  await prisma.company.create({
    data: {
      id: companyId,
      name: name.trim(),
      seats,
      createdAt: new Date(),
      tokens: {
        create: [
          ...memberTokens,
          {
            value: companyAccessTokenValue,
            tokenType: PrismaTokenType.company,
            label: "Acesso diretoria/RH",
            reusable: true,
            active: true,
            used: false,
          },
        ],
      },
    },
    include: {
      tokens: {
        orderBy: { value: "asc" },
      },
    },
  });

  const createdCompany = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    include: {
      tokens: {
        orderBy: { value: "asc" },
      },
    },
  });

  return toCompany(createdCompany);
}

export async function findCompanyById(companyId: string): Promise<Company | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      tokens: {
        orderBy: { value: "asc" },
      },
    },
  });

  return company ? toCompany(company) : null;
}

export async function findToken(tokenValue: string): Promise<{ company: Company; token: Token } | null> {
  const token = await prisma.token.findUnique({
    where: { value: tokenValue },
    include: {
      company: {
        include: {
          tokens: {
            orderBy: { value: "asc" },
          },
        },
      },
    },
  });

  if (!token) return null;

  return {
    company: toCompany(token.company),
    token: toToken(token),
  };
}

export async function validateToken(
  tokenValue: string,
  options?: { tokenType?: TokenType; allowUsed?: boolean }
): Promise<{ company: Company; token: Token } | null> {
  const found = await findToken(tokenValue);
  if (!found) return null;

  if (options?.tokenType && found.token.tokenType !== options.tokenType) {
    return null;
  }

  if (found.token.active === false) {
    return null;
  }

  if (!options?.allowUsed && found.token.used && !found.token.reusable) {
    return null;
  }

  return found;
}

export async function consumeToken(tokenValue: string, responseId: string) {
  const token = await prisma.token.findUnique({
    where: { value: tokenValue },
  });

  if (!token) {
    throw new Error("Token não encontrado");
  }

  if (token.reusable) {
    return;
  }

  if (token.used) {
    throw new Error("Token já utilizado");
  }

  await prisma.token.update({
    where: { value: tokenValue },
    data: {
      used: true,
      usedAt: new Date(),
      responseId,
    },
  });
}

export async function deleteCompany(companyId: string) {
  const existing = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Empresa não encontrada");
  }

  await prisma.company.delete({
    where: { id: companyId },
  });
}

export async function deleteResponse(responseId: string) {
  const response = await prisma.response.findUnique({
    where: { id: responseId },
    include: {
      token: true,
    },
  });

  if (!response) {
    throw new Error("Resposta não encontrada");
  }

  await prisma.$transaction(async (tx) => {
    if (response.token) {
      await tx.token.update({
        where: { value: response.token.value },
        data: {
          used: false,
          usedAt: null,
          responseId: null,
        },
      });
    }

    await tx.response.delete({
      where: { id: responseId },
    });
  });
}

export async function resetToken(tokenValue: string) {
  const token = await prisma.token.findUnique({
    where: { value: tokenValue },
  });

  if (!token) {
    throw new Error("Token não encontrado");
  }

  await prisma.$transaction(async (tx) => {
    if (token.responseId) {
      await tx.response.delete({
        where: { id: token.responseId },
      });
    }

    await tx.token.update({
      where: { value: tokenValue },
      data: {
        used: false,
        usedAt: null,
        responseId: null,
      },
    });
  });
}

export async function setTokenActive(tokenValue: string, active: boolean) {
  const token = await prisma.token.findUnique({
    where: { value: tokenValue },
    select: { value: true },
  });

  if (!token) {
    throw new Error("Token não encontrado");
  }

  await prisma.token.update({
    where: { value: tokenValue },
    data: { active },
  });
}

export async function deleteToken(tokenValue: string) {
  const token = await prisma.token.findUnique({
    where: { value: tokenValue },
  });

  if (!token) {
    throw new Error("Token não encontrado");
  }

  await prisma.$transaction(async (tx) => {
    if (token.responseId) {
      await tx.response.delete({
        where: { id: token.responseId },
      });
    }

    await tx.token.delete({
      where: { value: tokenValue },
    });
  });
}
