// SPDX-License-Identifier: MIT
import type { WorkflowStep } from "shared";

export function buildDependentsMap(steps: WorkflowStep[]): Map<string, string[]> {
  const dependents = new Map<string, string[]>();
  for (const step of steps) dependents.set(step.id, []);
  for (const step of steps) {
    if (step.dependsOn) {
      for (const depId of step.dependsOn) dependents.get(depId)?.push(step.id);
    }
  }
  return dependents;
}

export function reachableDownstream(
  dependents: Map<string, string[]>,
  seeds: string[],
): Set<string> {
  const seen = new Set<string>(seeds);
  const queue = [...seeds];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const child of dependents.get(id) ?? []) {
      if (!seen.has(child)) {
        seen.add(child);
        queue.push(child);
      }
    }
  }
  return seen;
}

export function inactiveBranchIds(
  steps: WorkflowStep[],
  splitterId: string,
  activeBranch: string,
): Set<string> {
  const splitter = steps.find((s) => s.id === splitterId);
  const branches = splitter?.branches;
  if (!branches) return new Set();

  const allTargets: string[] = [];
  for (const targets of Object.values(branches)) allTargets.push(...targets);

  const dependents = buildDependentsMap(steps);
  const kept = reachableDownstream(dependents, branches[activeBranch] ?? []);
  const reachable = reachableDownstream(dependents, allTargets);

  const skipped = new Set<string>();
  for (const id of reachable) {
    if (!kept.has(id)) skipped.add(id);
  }
  return skipped;
}

export function unhandledErrorBranchIds(
  steps: WorkflowStep[],
  succeededStepId: string,
): Set<string> {
  const step = steps.find((s) => s.id === succeededStepId);
  const errorBranch = step?.errorBranch;
  if (!errorBranch || errorBranch.length === 0) return new Set();

  const dependents = buildDependentsMap(steps);
  return reachableDownstream(dependents, errorBranch);
}