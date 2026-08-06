// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";
import { evaluateCondition } from "../step-executor";

describe("evaluateCondition", () => {
  const scope = {
    inputs: { count: 10, status: "active" },
    step1: { outputs: { success: true, total: 100 } },
  };

  it("evaluates boolean true/false strings", () => {
    expect(evaluateCondition("true", scope)).toBe(true);
    expect(evaluateCondition("false", scope)).toBe(false);
  });

  it("evaluates numeric comparisons", () => {
    expect(evaluateCondition("{{inputs.count}} > 5", scope)).toBe(true);
    expect(evaluateCondition("{{inputs.count}} <= 10", scope)).toBe(true);
    expect(evaluateCondition("{{step1.outputs.total}} == 100", scope)).toBe(true);
    expect(evaluateCondition("{{step1.outputs.total}} != 100", scope)).toBe(false);
  });

  it("evaluates string equality", () => {
    expect(evaluateCondition("{{inputs.status}} == 'active'", scope)).toBe(true);
    expect(evaluateCondition("{{inputs.status}} != 'inactive'", scope)).toBe(true);
  });
});
