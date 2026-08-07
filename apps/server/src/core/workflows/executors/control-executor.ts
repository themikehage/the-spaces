import type { WorkflowRun, WorkflowStep, WorkflowStepState } from "shared";
import { conditionEvaluator } from "../condition-evaluator";

export async function executeIfStep(
  step: WorkflowStep,
  run: WorkflowRun,
  scope: Record<string, unknown>,
  startedAt: string,
): Promise<WorkflowStepState> {
  const condition = step.condition || "true";
  const evaluated = await conditionEvaluator.evaluate(condition, scope);
  const activeBranch = Boolean(evaluated) ? "true" : "false";

  return {
    stepId: step.id,
    status: "success",
    startedAt,
    completedAt: new Date().toISOString(),
    activeBranch,
    outputs: { activeBranch, conditionResult: evaluated },
  };
}

export async function executeSwitchStep(
  step: WorkflowStep,
  run: WorkflowRun,
  scope: Record<string, unknown>,
  startedAt: string,
): Promise<WorkflowStepState> {
  const condition = step.condition || "";
  const evaluated = await conditionEvaluator.evaluate(condition, scope);
  const activeBranch = String(evaluated ?? "").trim();

  if (!activeBranch) {
    throw new Error(
      `Switch step '${step.label}' condition evaluated to an empty branch name. Condition: '${condition}'.`,
    );
  }

  const availableBranches = Object.keys(step.branches ?? {});
  const resolvedBranch = availableBranches.includes(activeBranch)
    ? activeBranch
    : availableBranches.includes("default")
      ? "default"
      : activeBranch;

  return {
    stepId: step.id,
    status: "success",
    startedAt,
    completedAt: new Date().toISOString(),
    activeBranch: resolvedBranch,
    outputs: { activeBranch: resolvedBranch, conditionResult: evaluated },
  };
}

export async function executeMergeStep(
  step: WorkflowStep,
  run: WorkflowRun,
  scope: Record<string, unknown>,
  startedAt: string,
): Promise<WorkflowStepState> {
  const outputs: Record<string, unknown> = { merged: true };
  const stepsState = (scope.$steps || {}) as Record<
    string,
    { status: string; outputs?: Record<string, unknown> }
  >;

  if (step.dependsOn && step.dependsOn.length > 0) {
    for (const depId of step.dependsOn) {
      const depState = stepsState[depId];
      if (
        depState &&
        (depState.status === "success" || depState.status === "pinned") &&
        depState.outputs
      ) {
        Object.assign(outputs, depState.outputs);
        outputs[depId] = depState.outputs;
        const snakeDep = depId.replace(/-/g, "_");
        outputs[snakeDep] = depState.outputs;
      }
    }
  }

  return {
    stepId: step.id,
    status: "success",
    startedAt,
    completedAt: new Date().toISOString(),
    outputs,
  };
}
