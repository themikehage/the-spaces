// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";
import { getNestedValue, interpolateValue } from "../variable-interpolator";

describe("variable-interpolator", () => {
  const scope = {
    inputs: {
      user: "Alice",
      count: 42,
      active: true,
    },
    step1: {
      outputs: {
        summary: "Execution done",
        data: { id: 100, role: "admin" },
      },
    },
  };

  it("extracts nested values correctly", () => {
    expect(getNestedValue(scope, "inputs.user")).toBe("Alice");
    expect(getNestedValue(scope, "inputs.count")).toBe(42);
    expect(getNestedValue(scope, "step1.outputs.data.role")).toBe("admin");
    expect(getNestedValue(scope, "non.existent")).toBeUndefined();
  });

  it("replaces exact match preserving type", () => {
    expect(interpolateValue("{{inputs.user}}", scope)).toBe("Alice");
    expect(interpolateValue("{{inputs.count}}", scope)).toBe(42);
    expect(interpolateValue("{{inputs.active}}", scope)).toBe(true);
    expect(interpolateValue("{{step1.outputs.data}}", scope)).toEqual({ id: 100, role: "admin" });
  });

  it("interpolates string templates", () => {
    expect(interpolateValue("Hello {{inputs.user}}, count is {{inputs.count}}", scope)).toBe(
      "Hello Alice, count is 42",
    );
  });

  it("leaves unmatched placeholders intact", () => {
    expect(interpolateValue("Hello {{missing.var}}", scope)).toBe("Hello {{missing.var}}");
  });

  it("interpolates deep objects and arrays", () => {
    const input = {
      greeting: "Hi {{inputs.user}}",
      list: ["{{inputs.count}}", "static"],
      nested: {
        info: "{{step1.outputs.summary}}",
      },
    };

    expect(interpolateValue(input, scope)).toEqual({
      greeting: "Hi Alice",
      list: [42, "static"],
      nested: {
        info: "Execution done",
      },
    });
  });
});
