// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";
import type { WorkflowStep } from "shared";
import { DagValidationError, detectCycles, resolveExecutionOrder } from "../dag-resolver";

describe("dag-resolver", () => {
  it("resolves steps without dependencies into a single batch", () => {
    const steps: WorkflowStep[] = [
      { id: "step1", type: "agent", label: "Step 1" },
      { id: "step2", type: "agent", label: "Step 2" },
    ];

    const batches = resolveExecutionOrder(steps);
    expect(batches).toHaveLength(1);
    expect(batches[0].map((s) => s.id)).toEqual(["step1", "step2"]);
  });

  it("resolves linear dependencies sequentially", () => {
    const steps: WorkflowStep[] = [
      { id: "step1", type: "agent", label: "Step 1" },
      { id: "step2", type: "agent", label: "Step 2", dependsOn: ["step1"] },
      { id: "step3", type: "agent", label: "Step 3", dependsOn: ["step2"] },
    ];

    const batches = resolveExecutionOrder(steps);
    expect(batches).toHaveLength(3);
    expect(batches[0].map((s) => s.id)).toEqual(["step1"]);
    expect(batches[1].map((s) => s.id)).toEqual(["step2"]);
    expect(batches[2].map((s) => s.id)).toEqual(["step3"]);
  });

  it("resolves diamond dependency into correct batches", () => {
    const steps: WorkflowStep[] = [
      { id: "A", type: "agent", label: "A" },
      { id: "B", type: "agent", label: "B", dependsOn: ["A"] },
      { id: "C", type: "agent", label: "C", dependsOn: ["A"] },
      { id: "D", type: "agent", label: "D", dependsOn: ["B", "C"] },
    ];

    const batches = resolveExecutionOrder(steps);
    expect(batches).toHaveLength(3);
    expect(batches[0].map((s) => s.id)).toEqual(["A"]);
    expect(batches[1].map((s) => s.id).sort()).toEqual(["B", "C"]);
    expect(batches[2].map((s) => s.id)).toEqual(["D"]);
  });

  it("detects cyclic dependencies and throws DagValidationError", () => {
    const steps: WorkflowStep[] = [
      { id: "A", type: "agent", label: "A", dependsOn: ["B"] },
      { id: "B", type: "agent", label: "B", dependsOn: ["A"] },
    ];

    expect(detectCycles(steps)).toContain("Cyclic dependency detected");
    expect(() => resolveExecutionOrder(steps)).toThrow(DagValidationError);
  });

  it("detects dependencies on non-existent steps", () => {
    const steps: WorkflowStep[] = [{ id: "A", type: "agent", label: "A", dependsOn: ["UNKNOWN"] }];

    expect(detectCycles(steps)).toContain("non-existent step 'UNKNOWN'");
    expect(() => resolveExecutionOrder(steps)).toThrow(DagValidationError);
  });

  it("detects duplicate step IDs", () => {
    const steps: WorkflowStep[] = [
      { id: "A", type: "agent", label: "A" },
      { id: "A", type: "agent", label: "A copy" },
    ];

    expect(detectCycles(steps)).toContain("Duplicate step ID found: A");
    expect(() => resolveExecutionOrder(steps)).toThrow(DagValidationError);
  });
});
