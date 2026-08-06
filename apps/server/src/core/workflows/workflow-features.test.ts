// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";
import { conditionEvaluator } from "./condition-evaluator";
import { resolveExpression } from "./expression-engine";
import { codeSandbox } from "./isolated-vm-sandbox";
import { interpolateString } from "./variable-interpolator";
import { workflowApprovalStore } from "./workflow-approval-store";

describe("Workflow Engine Robustness - Core Features", () => {
  describe("Feature 2: Expression Engine & Interpolator", () => {
    it("should resolve nested paths with $inputs and $steps", () => {
      const context = {
        $inputs: { user: "Alice", count: 42 },
        $steps: {
          step1: { status: "success", outputs: { result: "ok_data" } },
        },
        $run: { id: "run-123", workflowId: "wf-1", workflowName: "Test WF", status: "running" },
      };

      expect(resolveExpression("{{ $inputs.user }}", context)).toBe("Alice");
      expect(resolveExpression("{{ $steps.step1.outputs.result }}", context)).toBe("ok_data");
    });

    it("should interpolate strings in templates", () => {
      const scope = {
        $inputs: { name: "Bob" },
        $steps: { stepA: { outputs: { id: 99 } } },
      };

      const result = interpolateString("Hello {{ $inputs.name }}, ID is {{ $steps.stepA.outputs.id }}", scope);
      expect(result).toBe("Hello Bob, ID is 99");
    });
  });

  describe("Feature 1: Control Flow (JSONata Evaluator)", () => {
    it("should evaluate boolean JSONata expressions", async () => {
      const scope = {
        $inputs: { amount: 150 },
        $steps: { auth: { outputs: { isApproved: true } } },
      };

      const isHighAmount = await conditionEvaluator.evaluate("$inputs.amount > 100", scope);
      expect(isHighAmount).toBe(true);

      const isLowAmount = await conditionEvaluator.evaluate("$inputs.amount < 50", scope);
      expect(isLowAmount).toBe(false);
    });
  });

  describe("Feature 5: Code Node Sandbox", () => {
    it("should execute JS snippet and return output object", async () => {
      const context = {
        $inputs: { num1: 10, num2: 20 },
      };

      const code = `
        const sum = $inputs.num1 + $inputs.num2;
        return { outputs: { total: sum } };
      `;

      const result = await codeSandbox.executeCode(code, context);
      expect(result).toEqual({ outputs: { total: 30 } });
    });
  });

  describe("Feature 3: Human-in-the-Loop Approval Store", () => {
    it("should request and resolve approvals", async () => {
      const approvalPromise = workflowApprovalStore.requestApproval("run-1", "step-appr", "Deploy to PROD?");
      const pendingList = workflowApprovalStore.listPending();
      expect(pendingList.length).toBe(1);
      expect(pendingList[0].stepId).toBe("step-appr");

      workflowApprovalStore.resolveApproval("run-1", "step-appr", true);
      const approved = await approvalPromise;
      expect(approved).toBe(true);
    });
  });
});
