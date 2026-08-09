// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";
import { CascadeConfigLoader, deepMerge, type EntityConfig } from "../core/config";
import type { WorkspaceConfigPort } from "../core/ports/workspace-config.port";

describe("deepMerge", () => {
  it("should merge base and override configs correctly", () => {
    const base: EntityConfig = {
      defaultModel: "gpt-4o",
      skills: ["skill-a"],
      permissionOverrides: { bash: "allow" },
      toolOverrides: { add: ["tool-1"] },
    };

    const override: EntityConfig = {
      defaultModel: "claude-3-5-sonnet",
      skills: ["skill-b"],
      permissionOverrides: { web_fetch: "deny" },
      toolOverrides: { add: ["tool-2"], remove: ["tool-1"] },
    };

    const merged = deepMerge(base, override);

    expect(merged.defaultModel).toBe("claude-3-5-sonnet");
    expect(merged.skills).toEqual(["skill-a", "skill-b"]);
    expect(merged.permissionOverrides).toEqual({
      bash: "allow",
      web_fetch: "deny",
    });
    expect(merged.toolOverrides?.add).toEqual(["tool-2"]);
  });
});

describe("CascadeConfigLoader", () => {
  it("should load global config and merge entity config", async () => {
    const mockLoader: WorkspaceConfigPort = {
      async load(dir: string) {
        if (dir.includes("agents")) {
          return { defaultModel: "agent-model", skills: ["agent-skill"] };
        }
        return { defaultModel: "global-model", skills: ["global-skill"] };
      },
    };

    const loader = new CascadeConfigLoader(mockLoader);
    const config = await loader.load("testuser", { type: "custom", id: "agent-123" });

    expect(config.defaultModel).toBe("agent-model");
    expect(config.skills).toEqual(["global-skill", "agent-skill"]);
  });
});
