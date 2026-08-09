// SPDX-License-Identifier: MIT
import type { MiddlewareHandler } from "hono";
import type { ServerContext } from "../infra/server-context";

declare module "hono" {
  interface ContextVariableMap {
    serverContext: ServerContext;
  }
}

export function serverContextMiddleware(ctx: ServerContext): MiddlewareHandler {
  return async (c, next) => {
    c.set("serverContext", ctx);
    await next();
  };
}
