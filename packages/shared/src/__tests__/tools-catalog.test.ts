// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import {
  AVAILABLE_TOOLS,
  DEFAULT_ALWAYS_ON_TOOLS,
  TOOL_GROUPS,
  getAlwaysOnTools,
  isKnownTool,
  toolsInGroup,
} from "../tools-catalog";

describe("tools-catalog", () => {
  it("should have unique tool names in AVAILABLE_TOOLS", () => {
    const uniqueTools = new Set(AVAILABLE_TOOLS);
    expect(uniqueTools.size).toBe(AVAILABLE_TOOLS.length);
  });

  it("should ensure all DEFAULT_ALWAYS_ON_TOOLS are included in AVAILABLE_TOOLS", () => {
    for (const tool of DEFAULT_ALWAYS_ON_TOOLS) {
      expect(AVAILABLE_TOOLS).toContain(tool);
    }
  });

  it("should ensure all tools in TOOL_GROUPS are included in AVAILABLE_TOOLS", () => {
    for (const [group, tools] of Object.entries(TOOL_GROUPS)) {
      for (const tool of tools) {
        expect(AVAILABLE_TOOLS).toContain(tool);
      }
    }
  });

  it("should validate helper functions", () => {
    expect(isKnownTool("read")).toBe(true);
    expect(isKnownTool("bash")).toBe(true);
    expect(isKnownTool("invalid_tool_name")).toBe(false);

    expect(toolsInGroup("filesystem")).toEqual([
      "read",
      "write",
      "edit",
      "bash",
      "grep",
      "find",
      "ls",
    ]);

    expect(getAlwaysOnTools()).toEqual(DEFAULT_ALWAYS_ON_TOOLS);
  });
});
