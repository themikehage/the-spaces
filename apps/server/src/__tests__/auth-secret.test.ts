// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";

describe("Auth Secret Resolution", () => {
  it("resolves SPACES_AUTH_SECRET if BETTER_AUTH_SECRET is absent", () => {
    const prevBetter = process.env.BETTER_AUTH_SECRET;
    const prevSpaces = process.env.SPACES_AUTH_SECRET;

    try {
      delete process.env.BETTER_AUTH_SECRET;
      process.env.SPACES_AUTH_SECRET = "spaces-test-secret-123";

      const resolved = process.env.BETTER_AUTH_SECRET || process.env.SPACES_AUTH_SECRET;
      expect(resolved).toBe("spaces-test-secret-123");
    } finally {
      if (prevBetter) process.env.BETTER_AUTH_SECRET = prevBetter;
      else delete process.env.BETTER_AUTH_SECRET;
      if (prevSpaces) process.env.SPACES_AUTH_SECRET = prevSpaces;
      else delete process.env.SPACES_AUTH_SECRET;
    }
  });
});
