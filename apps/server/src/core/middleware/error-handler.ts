import type { Context } from "hono";
import { AppError } from "../errors";

export const globalErrorHandler = (err: Error, c: Context) => {
  const requestId = c.get("requestId") || "unknown";
  const isDev = process.env.NODE_ENV !== "production";

  if (err instanceof AppError) {
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          requestId,
          ...(isDev && err.details ? { details: err.details } : {}),
        },
      },
      err.statusCode as any,
    );
  }

  console.error(`[UNHANDLED_ERROR] [Req: ${requestId}]`, err);

  return c.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: isDev
          ? err.message || "An unexpected error occurred"
          : "An unexpected error occurred",
        requestId,
        ...(isDev && err.stack ? { stack: err.stack } : {}),
      },
    },
    500,
  );
};
