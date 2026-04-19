import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export async function persistAuditEvent(entry: {
  level: string;
  action: string;
  actorType?: string;
  actorId?: string;
  ip?: string;
  path?: string;
  details?: Record<string, unknown>;
}) {
  try {
    await prisma.auditEvent.create({
      data: {
        id: randomUUID(),
        createdAt: new Date(),
        level: entry.level,
        action: entry.action,
        actorType: entry.actorType ?? null,
        actorId: entry.actorId ?? null,
        ip: entry.ip ?? null,
        path: entry.path ?? null,
        details: (entry.details ?? {}) as unknown as object,
      },
    });
  } catch (error) {
    console.error("[audit-persist-failed]", error);
  }
}
