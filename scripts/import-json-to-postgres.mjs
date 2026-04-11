import fs from "fs/promises";
import path from "path";
import { loadEnvConfig } from "@next/env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, TokenType } from "@prisma/client";

loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não configurada. Defina a variável antes de importar os dados.");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function readJsonFile(filePath, fallback) {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

async function main() {
  const dataDir = path.join(process.cwd(), "data");
  const companiesPath = path.join(dataDir, "companies.json");
  const responsesPath = path.join(dataDir, "responses.json");

  const [companies, responses] = await Promise.all([
    readJsonFile(companiesPath, []),
    readJsonFile(responsesPath, []),
  ]);

  await prisma.token.deleteMany();
  await prisma.response.deleteMany();
  await prisma.company.deleteMany();

  for (const company of companies) {
    await prisma.company.create({
      data: {
        id: company.id,
        name: company.name,
        seats: Number(company.seats),
        createdAt: new Date(company.createdAt),
      },
    });
  }

  for (const response of responses) {
    await prisma.response.create({
      data: {
        id: response.id,
        submittedAt: new Date(response.submittedAt),
        answers: response.answers ?? [],
        team: response.team?.trim() || null,
        role: response.role?.trim() || null,
        companyId: response.companyId ?? null,
        triage: response.triage ?? null,
      },
    });
  }

  for (const company of companies) {
    for (const token of company.tokens ?? []) {
      await prisma.token.create({
        data: {
          value: token.value,
          companyId: company.id,
          tokenType: token.tokenType === "company" ? TokenType.company : TokenType.member,
          label:
            token.label ??
            (token.tokenType === "company" ? "Acesso diretoria/RH" : "Avaliação individual"),
          reusable: Boolean(token.reusable),
          active: token.active ?? true,
          used: Boolean(token.used),
          usedAt: token.usedAt ? new Date(token.usedAt) : null,
          responseId: token.responseId ?? null,
        },
      });
    }
  }

  const companyCount = await prisma.company.count();
  const responseCount = await prisma.response.count();
  const tokenCount = await prisma.token.count();

  console.log(`Importação concluída: ${companyCount} empresas, ${responseCount} respostas, ${tokenCount} tokens.`);
}

main()
  .catch((error) => {
    console.error("Falha ao importar JSON para PostgreSQL.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
