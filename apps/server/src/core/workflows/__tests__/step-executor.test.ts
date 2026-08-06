// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";
import { StepExecutor } from "../step-executor";

describe("StepExecutor", () => {
  it("rejects unsupported step types", async () => {
    const executor = new StepExecutor({
      sessionManager: {} as any,
      delegationRegistry: {} as any,
    });

    const state = await executor.execute(
      { id: "step1", type: "invalid" as any, label: "Invalid Step" },
      {
        id: "run1",
        workflowId: "wf1",
        workflowName: "Test WF",
        inputs: {},
        status: "running",
        stepStates: {},
        startedAt: new Date().toISOString(),
        username: "testuser",
      },
      {},
      "/tmp",
    );

    expect(state.status).toBe("error");
    expect(state.error).toContain("Unsupported workflow step type");
  });
});

