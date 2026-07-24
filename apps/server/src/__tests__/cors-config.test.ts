// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";
import { resolveCorsOrigin } from "../core/security/cors";

describe("resolveCorsOrigin", () => {
  it("returns null when origin is missing (same-origin)", () => {
    expect(
      resolveCorsOrigin({
        origin: undefined,
        allowedOrigins: [],
        isProduction: false,
      }),
    ).toBeNull();
  });

  it("reflects origin in development mode when allowedOrigins is empty", () => {
    expect(
      resolveCorsOrigin({
        origin: "http://localhost:5173",
        allowedOrigins: [],
        isProduction: false,
      }),
    ).toBe("http://localhost:5173");
  });

  it("fails closed (returns null) in production mode when allowedOrigins is empty", () => {
    expect(
      resolveCorsOrigin({
        origin: "https://evil.com",
        allowedOrigins: [],
        isProduction: true,
      }),
    ).toBeNull();
  });

  it("honors allowedOrigins list in both dev and prod", () => {
    const allowed = ["https://app.example.com"];

    expect(
      resolveCorsOrigin({
        origin: "https://app.example.com",
        allowedOrigins: allowed,
        isProduction: true,
      }),
    ).toBe("https://app.example.com");

    expect(
      resolveCorsOrigin({
        origin: "https://evil.com",
        allowedOrigins: allowed,
        isProduction: true,
      }),
    ).toBeNull();
  });
});
