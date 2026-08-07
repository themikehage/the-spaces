// SPDX-License-Identifier: MIT
import { Cron } from "croner";
import type { WorkflowDefinition } from "shared";
import type { IWorkflowScheduler } from "../ports/IWorkflowScheduler";
import type { IWorkflowEngine } from "../ports/workflow-engine.port";

export class WorkflowScheduler implements IWorkflowScheduler {
  private runners = new Map<string, Cron>();

  constructor(private getEngine: () => IWorkflowEngine | undefined) {}

  registerWorkflow(username: string, def: WorkflowDefinition): void {
    this.unregisterWorkflow(def.id);

    if (!def.schedule) return;

    try {
      const cronInstance = new Cron(def.schedule, { protect: true }, async () => {
        const engine = this.getEngine();
        if (!engine) {
          console.error(`[WorkflowScheduler] Cannot run workflow '${def.id}': WorkflowEngine not bound.`);
          return;
        }
        try {
          console.log(`[WorkflowScheduler] Triggering cron workflow '${def.name}' (${def.id})`);
          await engine.run(username, def.id, {});
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[WorkflowScheduler] Failed to execute cron workflow '${def.id}':`, msg);
        }
      });

      this.runners.set(def.id, cronInstance);
      console.log(`[WorkflowScheduler] Registered cron schedule for workflow '${def.name}' (${def.schedule})`);
    } catch (err) {
      console.error(`[WorkflowScheduler] Invalid cron expression '${def.schedule}' for workflow '${def.id}':`, err);
    }
  }

  unregisterWorkflow(workflowId: string): void {
    const existing = this.runners.get(workflowId);
    if (existing) {
      existing.stop();
      this.runners.delete(workflowId);
    }
  }

  syncWorkflow(username: string, def: WorkflowDefinition): void {
    this.unregisterWorkflow(def.id);
    if (def.schedule) {
      this.registerWorkflow(username, def);
    }
  }

  stopAll(): void {
    for (const [id, cron] of this.runners.entries()) {
      cron.stop();
      this.runners.delete(id);
    }
  }
}

export const workflowScheduler = new WorkflowScheduler(() => {
  const { workflowEngine } = require("./workflow-engine-instance");
  return workflowEngine;
});
