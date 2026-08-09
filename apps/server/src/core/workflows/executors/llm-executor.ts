// SPDX-License-Identifier: MIT
import type { WorkflowRun, WorkflowStep, WorkflowStepState } from "shared";
import type { ModelRegistry } from "../../model/model-registry";
import { ModelProviderAdapter } from "../../model/model-provider-adapter";
import type { IModelProvider } from "../../ports/model.port";
import { interpolateString } from "../variable-interpolator";
import { workflowRunStore } from "../workflow-run-store";

export interface LlmExecutorDeps {
  modelRegistry?: ModelRegistry;
  modelProvider?: IModelProvider;
}

export async function executeLlmStep(
  step: WorkflowStep,
  run: WorkflowRun,
  scope: Record<string, unknown>,
  startedAt: string,
  deps: LlmExecutorDeps,
  signal?: AbortSignal,
): Promise<WorkflowStepState> {
  const rawPrompt = step.llmPrompt ?? "";
  if (!rawPrompt) {
    throw new Error(`LLM step '${step.label}' requires a valid llmPrompt.`);
  }

  const prompt = String(interpolateString(rawPrompt, scope));
  const systemPrompt = step.llmSystemPrompt
    ? String(interpolateString(step.llmSystemPrompt, scope))
    : undefined;

  workflowRunStore.updateStepState(run.username, run.id, step.id, {
    status: "running",
    startedAt,
  });

  if (signal?.aborted) {
    return {
      stepId: step.id,
      status: "error",
      startedAt,
      completedAt: new Date().toISOString(),
      error: "Execution was aborted",
    };
  }

  const provider =
    deps.modelProvider ??
    (deps.modelRegistry ? new ModelProviderAdapter(deps.modelRegistry) : undefined);

  if (!provider || !provider.streamComplete) {
    throw new Error(`LLM step '${step.label}' failed: ModelProvider is not available.`);
  }

  const result = await provider.streamComplete({
    messages: [{ role: "user", content: prompt }],
    system: systemPrompt,
    modelId: step.llmModelId,
    temperature: step.llmTemperature,
    maxTokens: step.llmMaxTokens,
    signal,
  });

  const outputs: Record<string, unknown> = {
    text: result.content,
  };

  if (step.llmResponseFormat === "json") {
    try {
      outputs.json = JSON.parse(result.content);
    } catch {
      throw new Error(`LLM step '${step.label}' expected valid JSON output, received: ${result.content}`);
    }
  }

  if (step.captureOutputs && step.captureOutputs.length > 0) {
    const filtered: Record<string, unknown> = {};
    for (const key of step.captureOutputs) {
      if (outputs[key] !== undefined) {
        filtered[key] = outputs[key];
      }
    }
    return {
      stepId: step.id,
      status: "success",
      startedAt,
      completedAt: new Date().toISOString(),
      outputs: Object.keys(filtered).length > 0 ? filtered : outputs,
    };
  }

  return {
    stepId: step.id,
    status: "success",
    startedAt,
    completedAt: new Date().toISOString(),
    outputs,
  };
}
