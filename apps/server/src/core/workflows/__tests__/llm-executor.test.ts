// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";
import type { WorkflowRun, WorkflowStep } from "shared";
import type { IModelProvider, StreamCompleteOptions, StreamCompleteResult } from "../../ports/model.port";
import { executeLlmStep } from "../executors/llm-executor";
import { StepExecutor } from "../step-executor";

class MockModelProvider implements IModelProvider {
  public lastOpts?: StreamCompleteOptions;
  constructor(private responseText: string = "Mocked LLM completion output") {}

  async streamComplete(opts: StreamCompleteOptions): Promise<StreamCompleteResult> {
    this.lastOpts = opts;
    return {
      content: this.responseText,
    };
  }
}

const fakeRun: WorkflowRun = {
  id: "run-1",
  workflowId: "wf-1",
  workflowName: "Test Workflow",
  username: "testuser",
  status: "running",
  startedAt: new Date().toISOString(),
  stepStates: {},
  inputs: {},
};

describe("llm-executor", () => {
  it("interpolates prompt and executes LLM step successfully", async () => {
    const mockProvider = new MockModelProvider("Generated summary text");
    const step: WorkflowStep = {
      id: "step_llm_1",
      type: "llm",
      label: "Summarize Text",
      llmPrompt: "Please summarize: {{ $inputs.text }}",
      llmSystemPrompt: "You are a concise assistant",
    };

    const scope = {
      $inputs: { text: "Hello world" },
    };

    const result = await executeLlmStep(
      step,
      fakeRun,
      scope,
      new Date().toISOString(),
      { modelProvider: mockProvider },
    );

    expect(result.status).toBe("success");
    expect(result.outputs?.text).toBe("Generated summary text");
    expect(mockProvider.lastOpts?.system).toBe("You are a concise assistant");
    expect(mockProvider.lastOpts?.messages[0].content).toBe("Please summarize: Hello world");
  });

  it("parses JSON output when llmResponseFormat is json", async () => {
    const mockProvider = new MockModelProvider('{"score": 95, "status": "passed"}');
    const step: WorkflowStep = {
      id: "step_llm_json",
      type: "llm",
      label: "Evaluate Input",
      llmPrompt: "Analyze {{ $inputs.query }} and return JSON",
      llmResponseFormat: "json",
    };

    const scope = { $inputs: { query: "Code review" } };

    const result = await executeLlmStep(
      step,
      fakeRun,
      scope,
      new Date().toISOString(),
      { modelProvider: mockProvider },
    );

    expect(result.status).toBe("success");
    expect(result.outputs?.json).toEqual({ score: 95, status: "passed" });
  });

  it("throws error if llmPrompt is missing", async () => {
    const step: WorkflowStep = {
      id: "step_invalid",
      type: "llm",
      label: "Invalid Step",
    };

    expect(
      executeLlmStep(step, fakeRun, {}, new Date().toISOString(), {}),
    ).rejects.toThrow("LLM step 'Invalid Step' requires a valid llmPrompt.");
  });

  it("skips llm step during dryRun in StepExecutor", async () => {
    const executor = new StepExecutor({
      sessionManager: {} as any,
      delegationRegistry: {} as any,
    });

    const step: WorkflowStep = {
      id: "step_llm_dry",
      type: "llm",
      label: "Dry Run LLM",
      llmPrompt: "Test prompt",
    };

    const state = await executor.execute(
      step,
      fakeRun,
      {},
      "/tmp",
      undefined,
      true,
    );

    expect(state.status).toBe("skipped");
  });

  it("resolves the per-user model registry via sessionManager.userConfig", async () => {
    const registryReached = new Error("registry reached");
    const fakeModelRegistry = {
      getAvailable: () => {
        throw registryReached;
      },
    } as any;

    const executor = new StepExecutor({
      sessionManager: {
        userConfig: {
          getUserContext: (username: string) => {
            expect(username).toBe(fakeRun.username);
            return { modelRegistry: fakeModelRegistry };
          },
        },
      } as any,
      delegationRegistry: {} as any,
    });

    const step: WorkflowStep = {
      id: "step_llm_registry",
      type: "llm",
      label: "Registry Resolution",
      llmPrompt: "Test prompt",
    };

    const state = await executor.execute(step, fakeRun, {}, "/tmp");

    expect(state.status).toBe("error");
    expect(state.error).toContain("registry reached");
    expect(state.error).not.toContain("ModelProvider is not available");
  });
});
