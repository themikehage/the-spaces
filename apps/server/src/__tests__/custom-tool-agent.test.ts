// SPDX-License-Identifier: MIT
import { describe, expect, it, mock } from "bun:test";
import { createCustomToolRuntime } from "../core/custom-tools/runtime";
import { type CustomToolDefinition } from "../core/custom-tools/schemas";

mock.module("../core/session/spawn-subagent", () => ({
  spawnSubagent: async () => ({
    status: "success",
    executive_summary: "Subagent completed task successfully",
    artifacts: "none",
    risks: "None",
    outputs: { fileCount: 42, avgLines: 150 },
  }),
}));

describe("CustomTool Runtime - Agent execution type", () => {
  it("should execute agent custom tool and return executive summary and scope update", async () => {
    const definition: CustomToolDefinition = {
      name: "analyze_codebase",
      description: "Spawns explorer subagent to analyze codebase",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
        },
      },
      execute: {
        type: "agent",
        subagentType: "explorer",
        taskTemplate: "Analiza el directorio {path}",
        captureOutputAs: "analysisResult",
        maxSteps: 10,
        waitForCompletion: true,
      },
      enabled: true,
    };

    const context: any = {
      cwd: "/test/dir",
      username: "testuser",
      sessionId: "parent-session-123",
    };

    const runtime = createCustomToolRuntime(definition, context);
    const result = await runtime.execute("tool-call-1", { path: "./src" });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toBe("Subagent completed task successfully");
    expect(result.details.capturedAs).toBe("analysisResult");
    expect(result.details.value).toEqual({ fileCount: 42, avgLines: 150 });
    expect(result.pipelineScopeUpdate).toEqual({
      analysisResult: "Subagent completed task successfully",
      fileCount: 42,
      avgLines: 150,
    });
  });
});
