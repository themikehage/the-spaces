// SPDX-License-Identifier: MIT
import type { WorkflowStep } from "shared";

export class DagValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DagValidationError";
  }
}

export function detectCycles(steps: WorkflowStep[]): string | null {
  const stepMap = new Map<string, WorkflowStep>();
  for (const step of steps) {
    if (stepMap.has(step.id)) {
      return `Duplicate step ID found: ${step.id}`;
    }
    stepMap.set(step.id, step);
  }

  for (const step of steps) {
    if (step.dependsOn) {
      for (const depId of step.dependsOn) {
        if (!stepMap.has(depId)) {
          return `Step '${step.id}' depends on non-existent step '${depId}'`;
        }
      }
    }
  }

  const visited = new Map<string, "unvisited" | "visiting" | "visited">();
  for (const step of steps) {
    visited.set(step.id, "unvisited");
  }

  function dfs(stepId: string, path: string[]): string | null {
    visited.set(stepId, "visiting");
    path.push(stepId);

    const step = stepMap.get(stepId);
    if (step && step.dependsOn) {
      for (const depId of step.dependsOn) {
        const state = visited.get(depId);
        if (state === "visiting") {
          const cyclePath = [...path.slice(path.indexOf(depId)), depId].join(" -> ");
          return `Cyclic dependency detected: ${cyclePath}`;
        }
        if (state === "unvisited") {
          const result = dfs(depId, path);
          if (result) return result;
        }
      }
    }

    visited.set(stepId, "visited");
    path.pop();
    return null;
  }

  for (const step of steps) {
    if (visited.get(step.id) === "unvisited") {
      const cycle = dfs(step.id, []);
      if (cycle) return cycle;
    }
  }

  return null;
}

export function resolveExecutionOrder(steps: WorkflowStep[]): WorkflowStep[][] {
  const error = detectCycles(steps);
  if (error) {
    throw new DagValidationError(error);
  }

  if (steps.length === 0) return [];

  const stepMap = new Map<string, WorkflowStep>();
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const step of steps) {
    stepMap.set(step.id, step);
    inDegree.set(step.id, step.dependsOn ? step.dependsOn.length : 0);
    dependents.set(step.id, []);
  }

  for (const step of steps) {
    if (step.dependsOn) {
      for (const depId of step.dependsOn) {
        const list = dependents.get(depId) || [];
        list.push(step.id);
        dependents.set(depId, list);
      }
    }
  }

  const batches: WorkflowStep[][] = [];
  let currentBatchIds: string[] = [];

  for (const [id, count] of inDegree.entries()) {
    if (count === 0) {
      currentBatchIds.push(id);
    }
  }

  let processedCount = 0;

  while (currentBatchIds.length > 0) {
    const currentBatchSteps = currentBatchIds.map((id) => stepMap.get(id)!);
    batches.push(currentBatchSteps);
    processedCount += currentBatchIds.length;

    const nextBatchIds: string[] = [];

    for (const id of currentBatchIds) {
      const deps = dependents.get(id) || [];
      for (const depId of deps) {
        const newDegree = (inDegree.get(depId) || 0) - 1;
        inDegree.set(depId, newDegree);
        if (newDegree === 0) {
          nextBatchIds.push(depId);
        }
      }
    }

    currentBatchIds = nextBatchIds;
  }

  if (processedCount !== steps.length) {
    throw new DagValidationError("Failed to resolve execution order for all steps.");
  }

  return batches;
}
