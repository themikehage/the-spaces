// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";
import type { WorkflowStep } from "shared";
import { inactiveBranchIds } from "../branch-pruner";

const step = (
  id: string,
  dependsOn: string[] | undefined,
  branches?: Record<string, string[]>,
): WorkflowStep => ({ id, type: "code", label: id, dependsOn, branches });

describe("branch-pruner", () => {
  it("skips direct targets of unselected branches", () => {
    const steps = [step("sw", undefined, { verde: ["bA"], rojo: ["bB"] }),
      step("bA", ["sw"]), step("bB", ["sw"]), step("merge", ["bA", "bB"])];
    const skipped = inactiveBranchIds(steps, "sw", "verde");
    expect(skipped.has("bB")).toBe(true);
    expect(skipped.has("bA")).toBe(false);
  });

  it("skips the transitive subgraph of unselected branches", () => {
    const steps = [step("sw", undefined, { verde: ["bA"], rojo: ["bB"] }),
      step("bA", ["sw"]), step("bB", ["sw"]), step("deep", ["bB"]), step("merge", ["bA", "deep"])];
    const skipped = inactiveBranchIds(steps, "sw", "verde");
    expect(skipped.has("bB")).toBe(true);
    expect(skipped.has("deep")).toBe(true);
    expect(skipped.has("bA")).toBe(false);
  });

  it("keeps shared merge/convergence points reachable from the active branch", () => {
    const steps = [step("sw", undefined, { verde: ["bA"], rojo: ["bB"] }),
      step("bA", ["sw"]), step("bB", ["sw"]), step("merge", ["bA", "bB"])];
    const skipped = inactiveBranchIds(steps, "sw", "verde");
    expect(skipped.has("merge")).toBe(false);
    expect(skipped.has("bA")).toBe(false);
  });

  it("returns empty set for a step without branches", () => {
    const skipped = inactiveBranchIds([step("a", undefined)], "a", "true");
    expect(skipped.size).toBe(0);
  });
});