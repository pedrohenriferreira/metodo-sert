type ErrorContext = {
  route?: string;
  operation?: string;
  details?: Record<string, unknown>;
};

export function captureServerError(error: unknown, context: ErrorContext = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level: "error",
    route: context.route || "unknown",
    operation: context.operation || "unknown",
    details: context.details || {},
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : {
            message: String(error),
          },
  };

  console.error("[server-error]", JSON.stringify(payload));
}
