import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { questions } from "@/lib/questions";

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

const dataDir = path.join(process.cwd(), "data");
const responsesFile = path.join(dataDir, "responses.json");
const companiesFile = path.join(dataDir, "companies.json");

async function ensureFile(filePath: string, defaultValue: unknown) {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2), "utf-8");
  }
}

async function ensureDataFiles() {
  await ensureFile(responsesFile, []);
  await ensureFile(companiesFile, []);
}

export async function readResponses(): Promise<ResponseRecord[]> {
  await ensureDataFiles();
  const content = await fs.readFile(responsesFile, "utf-8");
  const parsed = JSON.parse(content) as ResponseRecord[];
  return parsed ?? [];
}

export async function saveResponse(response: ResponseRecord) {
  const responses = await readResponses();
  const validQuestionIds = new Set(questions.map((q) => q.id));

  const sanitizedAnswers = response.answers.filter((answer) => validQuestionIds.has(answer.questionId));

  const record: ResponseRecord = {
    ...response,
    answers: sanitizedAnswers,
  };

  responses.push(record);
  await fs.writeFile(responsesFile, JSON.stringify(responses, null, 2), "utf-8");
}

export async function listCompanies(): Promise<Company[]> {
  await ensureDataFiles();
  const content = await fs.readFile(companiesFile, "utf-8");
  const parsed = JSON.parse(content) as Company[];
  return parsed ?? [];
}

async function saveCompanies(companies: Company[]) {
  await fs.writeFile(companiesFile, JSON.stringify(companies, null, 2), "utf-8");
}

async function saveResponses(responses: ResponseRecord[]) {
  await fs.writeFile(responsesFile, JSON.stringify(responses, null, 2), "utf-8");
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

  const companies = await listCompanies();
  const existingTokens = new Set(companies.flatMap((company) => company.tokens.map((token) => token.value)));
  const companyId = randomUUID();

  const memberTokens: Token[] = Array.from({ length: seats }, () => {
    const value = generateTokenValue(existingTokens);
    existingTokens.add(value);
    return {
      value,
      companyId,
      tokenType: "member",
      label: "Avaliação individual",
      reusable: false,
      used: false,
    } satisfies Token;
  });

  const companyAccessToken: Token = {
    value: generateTokenValue(existingTokens),
    companyId,
    tokenType: "company",
    label: "Acesso diretoria/RH",
    reusable: true,
    used: false,
  };

  const company: Company = {
    id: companyId,
    name: name.trim(),
    seats,
    createdAt: new Date().toISOString(),
    tokens: [...memberTokens, companyAccessToken],
  };

  companies.push(company);
  await saveCompanies(companies);
  return company;
}

export async function findCompanyById(companyId: string): Promise<Company | null> {
  const companies = await listCompanies();
  return companies.find((company) => company.id === companyId) ?? null;
}

export async function findToken(tokenValue: string): Promise<{ company: Company; token: Token } | null> {
  const companies = await listCompanies();
  for (const company of companies) {
    const token = company.tokens.find((item) => item.value === tokenValue);
    if (token) return { company, token };
  }
  return null;
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

  if (!options?.allowUsed && found.token.used && !found.token.reusable) {
    return null;
  }

  return found;
}

export async function consumeToken(tokenValue: string, responseId: string) {
  const companies = await listCompanies();
  let updated = false;

  for (const company of companies) {
    const token = company.tokens.find((item) => item.value === tokenValue);
    if (!token) continue;
    if (token.reusable) {
      updated = true;
      break;
    }
    if (token.used) throw new Error("Token já utilizado");
    token.used = true;
    token.usedAt = new Date().toISOString();
    token.responseId = responseId;
    updated = true;
    break;
  }

  if (!updated) {
    throw new Error("Token não encontrado");
  }

  await saveCompanies(companies);
}

export async function deleteCompany(companyId: string) {
  const [companies, responses] = await Promise.all([listCompanies(), readResponses()]);
  const remainingCompanies = companies.filter((company) => company.id !== companyId);

  if (remainingCompanies.length === companies.length) {
    throw new Error("Empresa não encontrada");
  }

  const remainingResponses = responses.filter((response) => response.companyId !== companyId);

  await Promise.all([
    saveCompanies(remainingCompanies),
    saveResponses(remainingResponses),
  ]);
}

export async function deleteResponse(responseId: string) {
  const [companies, responses] = await Promise.all([listCompanies(), readResponses()]);
  const response = responses.find((item) => item.id === responseId);

  if (!response) {
    throw new Error("Resposta não encontrada");
  }

  const remainingResponses = responses.filter((item) => item.id !== responseId);

  for (const company of companies) {
    const token = company.tokens.find((item) => item.responseId === responseId);
    if (!token) continue;

    token.used = false;
    delete token.usedAt;
    delete token.responseId;
    break;
  }

  await Promise.all([
    saveCompanies(companies),
    saveResponses(remainingResponses),
  ]);
}
