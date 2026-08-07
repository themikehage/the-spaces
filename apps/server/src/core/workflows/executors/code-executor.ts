import type { WorkflowRun, WorkflowStep, WorkflowStepState } from "shared";
import { codeSandbox } from "../isolated-vm-sandbox";
import { interpolateString } from "../variable-interpolator";

export async function executeCodeStep(
  step: WorkflowStep,
  run: WorkflowRun,
  scope: Record<string, unknown>,
  startedAt: string,
): Promise<WorkflowStepState> {
  const rawCode = step.codeSnippet || "return {};";
  const interpolated = interpolateString(rawCode, scope);
  const code = typeof interpolated === "string" ? interpolated : rawCode;
  const outputs = await codeSandbox.executeCode(code, scope, {
    timeoutMs: step.codeTimeout || 5000,
  });

  return {
    stepId: step.id,
    status: "success",
    startedAt,
    completedAt: new Date().toISOString(),
    outputs,
  };
}
