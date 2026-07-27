// SPDX-License-Identifier: MIT
import { getDb } from "./db";
import { createProgrammaticSessionSync } from "./onboarding";

interface CachedToken {
  token: string;
  expiresAtMs: number;
}

const tokenCache = new Map<string, CachedToken>();

/**
 * Retrieves or creates a short-lived (ephemeral) session token for bash/tool invocation.
 * Caches tokens per username+sessionId to prevent flooding the database `session` table.
 * Refreshes if remaining validity is less than 60 seconds.
 */
export function getOrCreateToolSessionToken(
  username: string,
  sessionId: string,
  ttlSeconds = 600,
): string {
  const cacheKey = `${username}:${sessionId}`;
  const nowMs = Date.now();
  const cached = tokenCache.get(cacheKey);

  if (cached && cached.expiresAtMs - nowMs > 60 * 1000) {
    return cached.token;
  }

  const newToken = createProgrammaticSessionSync(username, ttlSeconds);
  tokenCache.set(cacheKey, {
    token: newToken,
    expiresAtMs: nowMs + ttlSeconds * 1000,
  });

  return newToken;
}

/**
 * Best-effort cleanup function to delete expired sessions from DB.
 */
export function purgeExpiredSessions(): void {
  try {
    const db = getDb();
    const nowIso = new Date().toISOString();
    db.query("DELETE FROM session WHERE expiresAt < ?").run(nowIso);
  } catch (err) {
    console.error("[EphemeralToolSession] Failed to purge expired sessions:", err);
  }
}

/**
 * Resets memory cache (primarily for tests).
 */
export function _resetTokenCacheForTest(): void {
  tokenCache.clear();
}
