import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

type SessionPayload = {
  sub: string;
  role: "admin";
  exp: number;
  iat: number;
  sid: string;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type SessionPrincipal = {
  kind: "admin-session";
  user: string;
  sessionId: string;
  expiresAt: number;
};

type KeyPrincipal = {
  kind: "admin-key";
};

export type AdminPrincipal = SessionPrincipal | KeyPrincipal;

type AuditLevel = "info" | "warn" | "error";

const SESSION_COOKIE_NAME = "adminSession";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
const RATE_LIMIT_STORE = new Map<string, { count: number; resetAt: number }>();

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getAdminSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_KEY || "unsafe-dev-secret";
}

function sign(value: string) {
  return createHmac("sha256", getAdminSessionSecret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function createAdminSessionCookie(user: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: user,
    role: "admin",
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
    sid: randomUUID(),
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);

  return {
    cookieName: SESSION_COOKIE_NAME,
    cookieValue: `${encodedPayload}.${signature}`,
    maxAge: SESSION_MAX_AGE_SECONDS,
    payload,
  };
}

export function readAdminSession(request: NextRequest): SessionPrincipal | null {
  const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  const [encodedPayload, providedSignature] = raw.split(".");
  if (!encodedPayload || !providedSignature) return null;

  const expectedSignature = sign(encodedPayload);
  if (!safeEqual(expectedSignature, providedSignature)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;

    if (payload.role !== "admin" || !payload.sub || !payload.sid) {
      return null;
    }

    if (!Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      kind: "admin-session",
      user: payload.sub,
      sessionId: payload.sid,
      expiresAt: payload.exp,
    };
  } catch {
    return null;
  }
}

export function getAdminPrincipal(request: NextRequest): AdminPrincipal | null {
  const adminKey = request.headers.get("x-admin-key");
  if (adminKey && process.env.ADMIN_KEY && safeEqual(adminKey, process.env.ADMIN_KEY)) {
    return { kind: "admin-key" };
  }

  return readAdminSession(request);
}

export function getClientIp(request: Request | NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  return realIp?.trim() || "unknown";
}

export function applyRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const current = RATE_LIMIT_STORE.get(key);

  if (!current || current.resetAt <= now) {
    RATE_LIMIT_STORE.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: Math.max(limit - 1, 0),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
    };
  }

  current.count += 1;
  RATE_LIMIT_STORE.set(key, current);

  return {
    allowed: true,
    remaining: Math.max(limit - current.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
  };
}

export function createAuditContext(request: Request | NextRequest) {
  return {
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent") || "unknown",
    path: (() => {
      try {
        return new URL(request.url).pathname;
      } catch {
        return "unknown";
      }
    })(),
  };
}

export function auditLog(level: AuditLevel, action: string, details: Record<string, unknown>) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    action,
    ...details,
  };

  if (level === "error") {
    console.error("[audit]", JSON.stringify(payload));
  } else if (level === "warn") {
    console.warn("[audit]", JSON.stringify(payload));
  } else {
    console.info("[audit]", JSON.stringify(payload));
  }

  void import("@/lib/audit-store")
    .then(({ persistAuditEvent }) =>
      persistAuditEvent({
        level,
        action,
        actorType: typeof details.principal === "string" ? details.principal : undefined,
        actorId:
          typeof details.user === "string"
            ? details.user
            : typeof details.sessionId === "string"
              ? details.sessionId
              : undefined,
        ip: typeof details.ip === "string" ? details.ip : undefined,
        path: typeof details.path === "string" ? details.path : undefined,
        details,
      })
    )
    .catch((error) => {
      console.error("[audit-import-failed]", error);
    });
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}
