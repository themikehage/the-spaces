// SPDX-License-Identifier: MIT
import type { WorkflowDefinition, WorkflowRun } from "shared";
import type { EventBus } from "../ports/spaces-host.port";

export interface NotifyWorkflowFailureOptions {
  def: WorkflowDefinition;
  run: WorkflowRun;
  eventBus?: EventBus;
  errorMessage?: string;
}

export async function notifyWorkflowFailure(opts: NotifyWorkflowFailureOptions): Promise<void> {
  const { def, run, eventBus, errorMessage } = opts;
  const onFailure = def.onFailure;

  if (!onFailure) return;

  const errorDetail =
    errorMessage ||
    Object.values(run.stepStates).find((s) => s.status === "error")?.error ||
    "Workflow run failed";

  // Webhook notification
  if (onFailure.webhook?.url) {
    try {
      const headers = {
        "Content-Type": "application/json",
        ...(onFailure.webhook.headers || {}),
      };
      await fetch(onFailure.webhook.url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          event: "workflow_failed",
          runId: run.id,
          workflowId: def.id,
          workflowName: def.name,
          username: run.username,
          error: errorDetail,
          startedAt: run.startedAt,
          failedAt: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error(`[WorkflowNotifier] Failed to send failure webhook for run ${run.id}:`, err);
    }
  }

  // Attention Hub Notification
  if (onFailure.notify !== false) {
    eventBus?.emit("attention_item_created", {
      item: {
        id: `att-wf-${run.id}`,
        type: "workflow_failed",
        title: `Workflow Failed: ${def.name}`,
        message: errorDetail,
        createdAt: new Date().toISOString(),
        metadata: {
          workflowId: def.id,
          runId: run.id,
          username: run.username,
        },
      },
    });
  }
}
