// SPDX-License-Identifier: MIT
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getUserDir, WorkflowRunSchema, type WorkflowRun, type WorkflowStepState } from "shared";

export class WorkflowRunStore {
  private getRunsDir(username: string): string {
    const dir = join(getUserDir(username), "workflow-runs");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  saveRun(username: string, run: WorkflowRun): WorkflowRun {
    const validated = WorkflowRunSchema.parse(run);
    const dir = this.getRunsDir(username);
    const filePath = join(dir, `${validated.id}.json`);
    writeFileSync(filePath, JSON.stringify(validated, null, 2), "utf-8");
    return validated;
  }

  createRun(params: {
    username: string;
    workflowId: string;
    workflowName: string;
    inputs: Record<string, unknown>;
    stepIds: string[];
    parentSessionId?: string;
  }): WorkflowRun {
    const { username, workflowId, workflowName, inputs, stepIds, parentSessionId } = params;
    const runId = crypto.randomUUID();
    const now = new Date().toISOString();

    const stepStates: Record<string, WorkflowStepState> = {};
    for (const stepId of stepIds) {
      stepStates[stepId] = {
        stepId,
        status: "pending",
      };
    }

    const run: WorkflowRun = {
      id: runId,
      workflowId,
      workflowName,
      inputs,
      status: "pending",
      stepStates,
      startedAt: now,
      username,
      parentSessionId,
    };

    return this.saveRun(username, run);
  }

  getRun(username: string, runId: string): WorkflowRun | null {
    const dir = this.getRunsDir(username);
    const filePath = join(dir, `${runId}.json`);
    if (!existsSync(filePath)) return null;
    try {
      const raw = readFileSync(filePath, "utf-8");
      return WorkflowRunSchema.parse(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  updateRunStatus(
    username: string,
    runId: string,
    status: WorkflowRun["status"],
    completedAt?: string,
  ): WorkflowRun | null {
    const run = this.getRun(username, runId);
    if (!run) return null;
    run.status = status;
    if (completedAt || status === "success" || status === "error" || status === "cancelled") {
      run.completedAt = completedAt || new Date().toISOString();
    }
    return this.saveRun(username, run);
  }

  updateStepState(
    username: string,
    runId: string,
    stepId: string,
    update: Partial<WorkflowStepState>,
  ): WorkflowRun | null {
    const run = this.getRun(username, runId);
    if (!run) return null;
    const currentState = run.stepStates[stepId] || { stepId, status: "pending" };
    run.stepStates[stepId] = {
      ...currentState,
      ...update,
    };
    return this.saveRun(username, run);
  }

  listRuns(username: string, workflowId?: string): WorkflowRun[] {
    const dir = this.getRunsDir(username);
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    const results: WorkflowRun[] = [];

    for (const file of files) {
      try {
        const raw = readFileSync(join(dir, file), "utf-8");
        const run = WorkflowRunSchema.parse(JSON.parse(raw));
        if (workflowId && run.workflowId !== workflowId) continue;
        results.push(run);
      } catch {
        // Skip corrupted files
      }
    }

    return results.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );
  }
}

export const workflowRunStore = new WorkflowRunStore();
