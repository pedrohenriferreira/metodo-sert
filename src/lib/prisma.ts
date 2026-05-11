import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não configurada. Defina a variável em .env.");
}

function getPoolMaxFromConnectionString(value: string) {
  try {
    const url = new URL(value);
    const declaredLimit = Number(url.searchParams.get("connection_limit"));

    if (Number.isInteger(declaredLimit) && declaredLimit > 0) {
      return declaredLimit;
    }
  } catch {
    // Fall back to the default pool size when DATABASE_URL is not a valid URL.
  }

  return 5;
}

const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 10_000,
  max: getPoolMaxFromConnectionString(connectionString),
});

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
