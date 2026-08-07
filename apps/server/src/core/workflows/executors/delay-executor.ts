// SPDX-License-Identifier: MIT
import type { WorkflowRun, WorkflowStep, WorkflowStepState } from "shared";

export async function executeDelayStep(
  step: WorkflowStep,
  run: WorkflowRun,
  startedAt: string,
  signal?: AbortSignal,
): Promise<WorkflowStepState> {
  const durationMs = Math.min(Math.max(step.durationMs || 1000, 1), 900_000); // 1ms - 15 min max

  if (signal?.aborted) {
    return {
      stepId: step.id,
      status: "error",
      startedAt,
      completedAt: new Date().toISOString(),
      error: "Delay step aborted prior to execution",
    };
  }

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve();
    }, durationMs);

    if (signal) {
      const abortHandler = () => {
        clearTimeout(timer);
        reject(new Error("Delay step aborted during execution"));
      };
      if (signal.aborted) {
        abortHandler();
      } else {
        signal.addEventListener("abort", abortHandler, { once: true });
      }
    }
  });

  return {
    stepId: step.id,
    status: "success",
    startedAt,
    completedAt: new Date().toISOString(),
    outputs: {
      delayedMs: durationMs,
    },
  };
}
