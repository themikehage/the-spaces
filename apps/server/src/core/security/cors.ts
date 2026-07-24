// SPDX-License-Identifier: MIT

export interface CorsDecisionOptions {
  origin: string | undefined | null;
  allowedOrigins: string[];
  isProduction: boolean;
}

/**
 * Resolves the CORS origin header value according to environment rules.
 * - If origin is missing (same-origin / non-browser), returns null.
 * - If allowedOrigins is set, returns origin if allowed, otherwise null.
 * - In production without allowedOrigins, fails closed (returns null).
 * - In development without allowedOrigins, reflects origin for DX.
 */
export function resolveCorsOrigin(options: CorsDecisionOptions): string | null {
  const { origin, allowedOrigins, isProduction } = options;
  if (!origin) return null;

  if (allowedOrigins.length > 0) {
    return allowedOrigins.includes(origin) ? origin : null;
  }

  if (isProduction) {
    return null;
  }

  return origin;
}
