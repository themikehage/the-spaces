// SPDX-License-Identifier: MIT
import { EventEmitter } from "node:events";

export interface PendingWorkflowApproval {
  runId: string;
  stepId: string;
  message: string;
  requestedAt: string;
  resolve: (approved: boolean) => void;
}

export class WorkflowApprovalStore {
  private pending = new Map<string, PendingWorkflowApproval>();
  private events = new EventEmitter();

  private getKey(runId: string, stepId: string): string {
    return `${runId}:${stepId}`;
  }

  requestApproval(runId: string, stepId: string, message: string): Promise<boolean> {
    const key = this.getKey(runId, stepId);
    return new Promise<boolean>((resolve) => {
      this.pending.set(key, {
        runId,
        stepId,
        message,
        requestedAt: new Date().toISOString(),
        resolve,
      });
      this.events.emit("approval_requested", { runId, stepId, message });
    });
  }

  resolveApproval(runId: string, stepId: string, approved: boolean): boolean {
    const key = this.getKey(runId, stepId);
    const item = this.pending.get(key);
    if (!item) return false;

    this.pending.delete(key);
    item.resolve(approved);
    this.events.emit("approval_resolved", { runId, stepId, approved });
    return true;
  }

  getPending(runId: string, stepId: string): PendingWorkflowApproval | undefined {
    return this.pending.get(this.getKey(runId, stepId));
  }

  listPending(): Omit<PendingWorkflowApproval, "resolve">[] {
    return Array.from(this.pending.values()).map(({ runId, stepId, message, requestedAt }) => ({
      runId,
      stepId,
      message,
      requestedAt,
    }));
  }

  cancelRunApprovals(runId: string): void {
    for (const [key, item] of this.pending.entries()) {
      if (item.runId === runId) {
        this.pending.delete(key);
        item.resolve(false);
      }
    }
  }
}

export const workflowApprovalStore = new WorkflowApprovalStore();
