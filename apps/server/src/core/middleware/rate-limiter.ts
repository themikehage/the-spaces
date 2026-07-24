// SPDX-License-Identifier: MIT
import type { MiddlewareHandler } from "hono";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

export function createRateLimiter(options: RateLimitOptions): MiddlewareHandler {
  const hits = new Map<string, RequestRecord>();

  // Periodically clean up expired keys every minute
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, 60 * 1000);

  return async (c, next) => {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("x-real-ip") ||
      "unknown";
    const key = `${c.req.path}:${ip}`;
    const now = Date.now();

    let record = hits.get(key);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + options.windowMs };
      hits.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, options.max - record.count);
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);

    c.header("X-RateLimit-Limit", String(options.max));
    c.header("X-RateLimit-Remaining", String(remaining));
    c.header("X-RateLimit-Reset", String(Math.ceil(record.resetTime / 1000)));

    if (record.count > options.max) {
      c.header("Retry-After", String(retryAfter));
      return c.json(
        {
          error: options.message || "Too many requests, please try again later.",
        },
        429
      );
    }

    await next();
  };
}

export const authRateLimiter = () =>
  createRateLimiter({
    windowMs: 60 * 1000,
    max: 10,
    message: "Too many authentication attempts. Please try again after 1 minute.",
  });

export const generalRateLimiter = () =>
  createRateLimiter({
    windowMs: 60 * 1000,
    max: 300,
    message: "Rate limit exceeded. Please slow down your requests.",
  });
