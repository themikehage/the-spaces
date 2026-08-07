// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";
import { conditionEvaluator } from "./condition-evaluator";
import { resolveExpression } from "./expression-engine";
import { codeSandbox } from "./isolated-vm-sandbox";
import { interpolateString } from "./variable-interpolator";
import { workflowApprovalStore } from "./workflow-approval-store";
import { workflowRunStore } from "./workflow-run-store";
import { workflowStore } from "./workflow-store";
import { StepExecutor } from "./step-executor";
import { WorkflowEngine } from "./workflow-engine";
import { workflowVariableStore } from "./workflow-variable-store";
import { webhookStore } from "./webhook-store";
import { webhooksRouter } from "../../routes/webhooks";

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

  describe("Feature 1: Control Flow (VM Condition Evaluator)", () => {
    it("should evaluate boolean JS expressions with $inputs and step aliases", async () => {
      const scope = {
        $inputs: { amount: 150, featureFlag: true },
        $steps: { auth: { status: "success", outputs: { isApproved: true } } },
        init: { outputs: { featureFlag: true } },
        $init: { outputs: { featureFlag: true } },
      };

      const isHighAmount = await conditionEvaluator.evaluate("$inputs.amount > 100", scope);
      expect(isHighAmount).toBe(true);

      const flagInput = await conditionEvaluator.evaluate("$inputs.featureFlag === true", scope);
      expect(flagInput).toBe(true);

      const flagStep = await conditionEvaluator.evaluate("$init.outputs.featureFlag === true", scope);
      expect(flagStep).toBe(true);

      const isLowAmount = await conditionEvaluator.evaluate("$inputs.amount < 50", scope);
      expect(isLowAmount).toBe(false);
    });
  });

  describe("Feature 5: Code Node Sandbox", () => {
    it("should execute JS snippet and return output object with $inputs and step aliases", async () => {
      const context = {
        $inputs: { num1: 10, num2: 20, featureFlag: true },
        init: { outputs: { status: "initialized", items: 3 } },
        "merge-results": { outputs: { merged: true, topScore: 92 } },
      };

      const code = `
        return {
          total: $inputs.num1 + $inputs.num2,
          featureFlag: $inputs.featureFlag,
          initStatus: $init.outputs.status,
          items: $init.outputs.items,
          mergeByBracket: $steps['merge-results'].outputs.topScore,
          mergeBySnake: $merge_results.outputs.topScore,
          mergeByPrefix: $merge.outputs.topScore
        };
      `;

      const result = await codeSandbox.executeCode(code, context);
      expect(result).toEqual({
        total: 30,
        featureFlag: true,
        initStatus: "initialized",
        items: 3,
        mergeByBracket: 92,
        mergeBySnake: 92,
        mergeByPrefix: 92,
      });
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

  describe("Improvement #1: Orphaned Runs Cleanup (cleanupStaleRuns)", () => {
    it("should mark stale running or pending runs as error on startup cleanup", () => {
      const username = "test-user-stale-" + Date.now();
      const run = workflowRunStore.createRun({
        username,
        workflowId: "wf-stale",
        workflowName: "Stale Workflow",
        inputs: {},
        stepIds: ["step1", "step2"],
      });

      // Manually simulate a crash state where run and step were left running
      workflowRunStore.updateRunStatus(username, run.id, "running");
      workflowRunStore.updateStepState(username, run.id, "step1", { status: "running" });

      const cleanedCount = workflowRunStore.cleanupStaleRuns(username);
      expect(cleanedCount).toBeGreaterThanOrEqual(1);

      const recoveredRun = workflowRunStore.getRun(username, run.id);
      expect(recoveredRun?.status).toBe("error");
      expect(recoveredRun?.stepStates.step1.status).toBe("error");
      expect(recoveredRun?.stepStates.step1.error).toContain("Server process restarted");
    });
  });

  describe("Improvement #4: Step Timeout (timeoutMs)", () => {
    it("should abort step execution and return error status if timeoutMs is exceeded", async () => {
      const executor = new StepExecutor({
        sessionManager: {} as any,
        delegationRegistry: {} as any,
      });

      const slowStep = {
        id: "slow_http_step",
        type: "http" as const,
        label: "Slow Step",
        httpUrl: "http://10.255.255.1:9999",
        httpTimeoutMs: 10000,
        timeoutMs: 50,
      };

      const dummyRun = {
        id: "run-timeout-1",
        workflowId: "wf-1",
        workflowName: "Test Timeout",
        inputs: {},
        status: "running" as const,
        stepStates: {},
        startedAt: new Date().toISOString(),
        username: "testuser",
      };

      const state = await executor.execute(slowStep, dummyRun, {}, process.cwd());
      expect(state.status).toBe("error");
      expect(state.error).toContain("timed out after 50ms");
    });
  });

  describe("Improvement #2 & #3: Per-Step Retry and Error Branch Fallback", () => {
    it("should execute error branch when a step fails after retries", async () => {
      const engine = new WorkflowEngine({
        sessionManager: {} as any,
        delegationRegistry: {} as any,
      });

      const username = "testuser-eb-" + Date.now();
      const wfDef = {
        id: "wf-error-branch-" + Date.now(),
        name: "Error Branch Workflow",
        steps: [
          {
            id: "failing_step",
            type: "code" as const,
            label: "Failing Step",
            codeSnippet: "throw new Error('API failure');",
            onError: "retry" as const,
            retryCount: 1,
            retryDelayMs: 10,
            errorBranch: ["fallback_cleanup"],
          },
          {
            id: "fallback_cleanup",
            type: "code" as const,
            label: "Fallback Cleanup",
            codeSnippet: "return { recovered: true };",
            dependsOn: ["failing_step"],
          },
        ],
        onError: "stop" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await workflowStore.save(username, wfDef);
      const run = await engine.run(username, wfDef.id);

      // Wait briefly for DAG execution
      await new Promise((resolve) => setTimeout(resolve, 150));

      const updatedRun = workflowRunStore.getRun(username, run.id);
      expect(updatedRun?.stepStates.failing_step.status).toBe("error");
      expect(updatedRun?.stepStates.fallback_cleanup.status).toBe("success");
      expect(updatedRun?.stepStates.fallback_cleanup.outputs).toEqual({ recovered: true });
      expect(updatedRun?.status).toBe("success");
    });

    it("should prune error branch when the main step succeeds", async () => {
      const engine = new WorkflowEngine({
        sessionManager: {} as any,
        delegationRegistry: {} as any,
      });

      const username = "testuser-eb-success-" + Date.now();
      const wfDef = {
        id: "wf-error-branch-succ-" + Date.now(),
        name: "Error Branch Success Workflow",
        steps: [
          {
            id: "succ_step",
            type: "code" as const,
            label: "Successful Step",
            codeSnippet: "return { ok: true };",
            errorBranch: ["unused_cleanup"],
          },
          {
            id: "unused_cleanup",
            type: "code" as const,
            label: "Unused Cleanup",
            codeSnippet: "return { recovered: false };",
            dependsOn: ["succ_step"],
          },
        ],
        onError: "stop" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await workflowStore.save(username, wfDef);
      const run = await engine.run(username, wfDef.id);

      await new Promise((resolve) => setTimeout(resolve, 150));

      const updatedRun = workflowRunStore.getRun(username, run.id);
      expect(updatedRun?.stepStates.succ_step.status).toBe("success");
      expect(updatedRun?.stepStates.unused_cleanup.status).toBe("skipped");
      expect(updatedRun?.status).toBe("success");
    });
  });

  describe("Improvement #5: Cross-Run Persistent Variables Node", () => {
    it("should persist and increment variables across multiple workflow runs", async () => {
      const engine = new WorkflowEngine({
        sessionManager: {} as any,
        delegationRegistry: {} as any,
      });

      const username = "testuser-vars-" + Date.now();
      const wfDef = {
        id: "wf-vars-" + Date.now(),
        name: "Variables Workflow",
        steps: [
          {
            id: "counter_step",
            type: "variables" as const,
            label: "Counter Step",
            variableOps: [
              { op: "increment" as const, key: "execCount", amount: 1 },
              { op: "set" as const, key: "lastUser", value: "Bob" },
            ],
          },
        ],
        onError: "stop" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await workflowStore.save(username, wfDef);

      // First run
      const run1 = await engine.run(username, wfDef.id);
      await new Promise((resolve) => setTimeout(resolve, 150));
      const res1 = workflowRunStore.getRun(username, run1.id);
      expect(res1?.stepStates.counter_step.outputs?.execCount).toBe(1);

      // Second run
      const run2 = await engine.run(username, wfDef.id);
      await new Promise((resolve) => setTimeout(resolve, 150));
      const res2 = workflowRunStore.getRun(username, run2.id);
      expect(res2?.stepStates.counter_step.outputs?.execCount).toBe(2);

      // Verify persistent disk store directly
      const persistentValue = workflowVariableStore.get(username, wfDef.id, "execCount");
      expect(persistentValue).toBe(2);
    });
  });

  describe("Improvement #7: Webhook Entry Trigger Router", () => {
    it("should register webhook and trigger workflow on HTTP request", async () => {
      const username = "testuser-wh-" + Date.now();
      const webhookId = "wh-trigger-" + Date.now();
      const wfDef = {
        id: "wf-webhook-" + Date.now(),
        name: "Webhook Workflow",
        steps: [
          {
            id: "wh_step",
            type: "webhook" as const,
            label: "Webhook Entry",
            webhookId,
          },
        ],
        onError: "stop" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save workflow automatically registers webhook in WebhookStore
      await workflowStore.save(username, wfDef);
      const reg = webhookStore.findWebhook(webhookId);
      expect(reg).not.toBeNull();
      expect(reg?.workflowId).toBe(wfDef.id);

      // Simulate incoming HTTP request using Hono webhooksRouter.request
      const req = new Request(`http://localhost/${webhookId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "order_created", orderId: 456 }),
      });

      const res = await webhooksRouter.request(req);
      expect(res.status).toBe(202);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.runId).toBeDefined();

      // Wait for run execution
      await new Promise((resolve) => setTimeout(resolve, 150));

      const run = workflowRunStore.getRun(username, data.runId);
      expect(run?.status).toBe("success");
      expect(run?.stepStates.wh_step.outputs?.body).toEqual({ event: "order_created", orderId: 456 });
    });
  });

  describe("Global Agent Issues Mitigations", () => {
    it("#1 & #4 & #2: should auto-inject timestamps, validate snake_case IDs, and enforce dependsOn on branch targets in WorkflowCrudActions", async () => {
      const { WorkflowCrudActions } = await import("../tools/extensions/manage-workflow/workflow-crud-actions");
      const mockEngine = {
        save: async (_user: string, def: any) => def,
      } as any;
      const crud = new WorkflowCrudActions({ username: "test_user", workflowEngine: mockEngine });

      // #1: Auto-inject timestamps when omitted
      const defWithoutDates = {
        id: "valid_wf_id",
        name: "Test Timestamps",
        onError: "stop" as const,
        steps: [
          { id: "step_one", type: "code" as const, label: "One", codeSnippet: "return {};" },
        ],
      };
      const saved = await crud.save(defWithoutDates as any);
      expect(saved.createdAt).toBeDefined();
      expect(saved.updatedAt).toBeDefined();

      // #2: Reject step ID with hyphens
      const defWithHyphenId = {
        id: "valid_wf_id_2",
        name: "Test Hyphen ID",
        onError: "stop" as const,
        steps: [
          { id: "step-with-hyphen", type: "code" as const, label: "Hyphen", codeSnippet: "return {};" },
        ],
      };
      expect(crud.save(defWithHyphenId as any)).rejects.toThrow("snake_case");

      // #4: Reject branch targets missing dependsOn
      const defMissingBranchDep = {
        id: "valid_wf_id_3",
        name: "Test Branch Dep",
        onError: "stop" as const,
        steps: [
          {
            id: "if_check",
            type: "if" as const,
            label: "Check",
            condition: "true",
            branches: { true: ["branch_pass"], false: ["branch_fail"] },
          },
          { id: "branch_pass", type: "code" as const, label: "Pass", codeSnippet: "return {};" }, // missing dependsOn: ["if_check"]
          { id: "branch_fail", type: "code" as const, label: "Fail", codeSnippet: "return {};", dependsOn: ["if_check"] },
        ],
      };
      expect(crud.save(defMissingBranchDep as any)).rejects.toThrow("missing dependsOn");
    });

    it("#5: should interpolate {{...}} template expressions in codeSnippet before execution", async () => {
      const scope = {
        $inputs: { user: "Alice" },
        $steps: {
          prev_step: { outputs: { score: 95 } },
        },
      };

      const executor = new StepExecutor({
        sessionManager: {} as any,
        delegationRegistry: {} as any,
      });

      const codeStep = {
        id: "code_test",
        type: "code" as const,
        label: "Code Interpolation",
        codeSnippet: "return { name: '{{ $inputs.user }}', score: Number('{{ $steps.prev_step.outputs.score }}') };",
      };

      const dummyRun = {
        id: "run-code-interp",
        workflowId: "wf-interp",
        workflowName: "Interp Test",
        inputs: scope.$inputs,
        status: "running" as const,
        stepStates: {},
        startedAt: new Date().toISOString(),
        username: "testuser",
      };

      const state = await executor.execute(codeStep, dummyRun, scope, process.cwd());
      expect(state.status).toBe("success");
      expect(state.outputs).toEqual({ name: "Alice", score: 95 });
    });
  });
});
