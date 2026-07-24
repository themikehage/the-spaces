import type { MiddlewareHandler } from "hono";

declare module "hono" {
  interface ContextVariableMap {
    requestId: string;
  }
}

export const requestIdMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    const existingId = c.req.header("X-Request-Id");
    const requestId = existingId || crypto.randomUUID();
    c.set("requestId", requestId);
    c.header("X-Request-Id", requestId);
    await next();
  };
};
