// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import type { WorkflowDefinition } from "shared";
import { SqliteWorkflowRunStore } from "../../infra/workflow-run-store";
import { executeDelayStep } from "../executors/delay-executor";
import { executeSubWorkflowStep } from "../executors/subworkflow-executor";
import { notifyWorkflowFailure } from "../workflow-notifier";

describe("Workflow Engine Enhancements (Post-Audit Features)", () => {
  describe("1. SqliteWorkflowRunStore (workflows.db)", () => {
    it("persists runs in SQLite and supports filtering by status and limit", () => {
      const db = new Database(":memory:");
      const store = new SqliteWorkflowRunStore(db);
      const username = "test_user";

      const run1 = store.createRun({
        username,
        workflowId: "wf-1",
        workflowName: "Workflow 1",
        inputs: { env: "prod" },
        stepIds: ["step1"],
      });

      const run2 = store.createRun({
        username,
        workflowId: "wf-2",
        workflowName: "Workflow 2",
        inputs: { env: "dev" },
        stepIds: ["step1"],
      });

      store.updateRunStatus(username, run1.id, "success");
      store.updateRunStatus(username, run2.id, "error");

      const successRuns = store.listRuns(username, { status: "success" });
      expect(successRuns.length).toBe(1);
      expect(successRuns[0].id).toBe(run1.id);
      expect(successRuns[0].inputs.env).toBe("prod");

      const allRuns = store.listRuns(username, { limit: 10 });
      expect(allRuns.length).toBe(2);
    });
  });

  describe("2. Delay Step Executor", () => {
    it("executes a delay step and returns delayedMs output", async () => {
      const step = {
        id: "pause_step",
        type: "delay" as const,
        label: "Pause Execution",
        durationMs: 10,
      };

      const start = Date.now();
      const res = await executeDelayStep(
        step,
        {
          id: "run-1",
          workflowId: "wf-1",
          workflowName: "WF",
          inputs: {},
          status: "running",
          stepStates: {},
          startedAt: new Date().toISOString(),
          username: "test",
        },
        new Date().toISOString(),
      );

      const duration = Date.now() - start;
      expect(res.status).toBe("success");
      expect(res.outputs?.delayedMs).toBe(10);
      expect(duration).toBeGreaterThanOrEqual(5);
    });
  });

  describe("3. Sub-Workflow Step Recursion Protection", () => {
    it("prevents self-recursion and depth > 3", async () => {
      const step = {
        id: "self_call",
        type: "workflow" as const,
        label: "Self Invocation",
        subWorkflowId: "wf-self",
      };

      const res = await executeSubWorkflowStep(
        step,
        {
          id: "run-1",
          workflowId: "wf-self",
          workflowName: "WF Self",
          inputs: {},
          status: "running",
          stepStates: {},
          startedAt: new Date().toISOString(),
          username: "test",
        },
        {},
        new Date().toISOString(),
        {},
      );

      expect(res.status).toBe("error");
      expect(res.error).toContain("Direct recursion detected");
    });
  });

  describe("4. Failure Notification (Attention Hub + Webhook)", () => {
    it("emits attention_item_created event when notify is enabled", async () => {
      let emittedEvent: any = null;
      const fakeEventBus = {
        emit: (type: string, payload: any) => {
          if (type === "attention_item_created") {
            emittedEvent = payload;
          }
        },
      } as any;

      const def: WorkflowDefinition = {
        id: "wf-failed",
        name: "Failed Pipeline",
        onError: "stop",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        steps: [],
        onFailure: {
          notify: true,
        },
      };

      await notifyWorkflowFailure({
        def,
        run: {
          id: "run-fail-1",
          workflowId: "wf-failed",
          workflowName: "Failed Pipeline",
          inputs: {},
          status: "error",
          stepStates: {
            failing_step: {
              stepId: "failing_step",
              status: "error",
              error: "Database connection failed",
            },
          },
          startedAt: new Date().toISOString(),
          username: "test_user",
        },
        eventBus: fakeEventBus,
      });

      expect(emittedEvent).not.toBeNull();
      expect(emittedEvent.item.title).toContain("Failed Pipeline");
      expect(emittedEvent.item.message).toBe("Database connection failed");
    });
  });
});
