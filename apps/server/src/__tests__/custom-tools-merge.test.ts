// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";
import { deepMerge, type EntityConfig } from "../core/config";

describe("Custom Tools Merging Logic", () => {
  it("should additively merge toolOverrides.add across base and child entity configs", () => {
    const baseConfig: EntityConfig = {
      toolOverrides: { add: ["read", "write", "bash"] },
    };
    const childConfig: EntityConfig = {
      toolOverrides: { add: ["my_custom_tool"] },
    };

    const merged = deepMerge(baseConfig, childConfig);

    expect(merged.toolOverrides?.add).toEqual(["read", "write", "bash", "my_custom_tool"]);
  });

  it("should respect remove overrides while preserving non-removed tools", () => {
    const baseConfig: EntityConfig = {
      toolOverrides: { add: ["read", "write", "bash"] },
    };
    const childConfig: EntityConfig = {
      toolOverrides: { add: ["my_custom_tool"], remove: ["bash"] },
    };

    const merged = deepMerge(baseConfig, childConfig);

    expect(merged.toolOverrides?.add).toEqual(["read", "write", "my_custom_tool"]);
    expect(merged.toolOverrides?.remove).toEqual(["bash"]);
  });
});
