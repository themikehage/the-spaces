// SPDX-License-Identifier: MIT
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  getWorkflowRunDir,
  getWorkflowRunsDir,
  getWorkflowsDir,
  SPACES_DATA_PATH,
  USERS_DIR,
  WorkflowRunSchema,
  type WorkflowRun,
  type WorkflowStepState,
} from "shared";

export class WorkflowRunStore {
  saveRun(username: string, run: WorkflowRun): WorkflowRun {
    const validated = WorkflowRunSchema.parse(run);
    const dir = getWorkflowRunDir(username, validated.workflowId, validated.id);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const filePath = join(dir, "run.json");
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

  getRun(username: string, runId: string, workflowId?: string): WorkflowRun | null {
    if (workflowId) {
      const filePath = join(getWorkflowRunDir(username, workflowId, runId), "run.json");
      if (!existsSync(filePath)) return null;
      try {
        const raw = readFileSync(filePath, "utf-8");
        return WorkflowRunSchema.parse(JSON.parse(raw));
      } catch {
        return null;
      }
    }

    const baseDir = getWorkflowsDir(username);
    if (!existsSync(baseDir)) return null;

    const wfEntries = readdirSync(baseDir, { withFileTypes: true });
    for (const wfEntry of wfEntries) {
      if (!wfEntry.isDirectory()) continue;
      const candidatePath = join(baseDir, wfEntry.name, "runs", runId, "run.json");
      if (existsSync(candidatePath)) {
        try {
          const raw = readFileSync(candidatePath, "utf-8");
          return WorkflowRunSchema.parse(JSON.parse(raw));
        } catch {
          return null;
        }
      }
    }

    return null;
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

  setWorkflowSessionId(username: string, runId: string, workflowSessionId: string): WorkflowRun | null {
    const run = this.getRun(username, runId);
    if (!run) return null;
    run.workflowSessionId = workflowSessionId;
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
    const results: WorkflowRun[] = [];

    if (workflowId) {
      const runsDir = getWorkflowRunsDir(username, workflowId);
      if (!existsSync(runsDir)) return [];
      const runEntries = readdirSync(runsDir, { withFileTypes: true });
      for (const runEntry of runEntries) {
        if (!runEntry.isDirectory()) continue;
        const filePath = join(runsDir, runEntry.name, "run.json");
        if (existsSync(filePath)) {
          try {
            const raw = readFileSync(filePath, "utf-8");
            results.push(WorkflowRunSchema.parse(JSON.parse(raw)));
          } catch {
            /* noop */
          }
        }
      }
    } else {
      const baseDir = getWorkflowsDir(username);
      if (!existsSync(baseDir)) return [];
      const wfEntries = readdirSync(baseDir, { withFileTypes: true });
      for (const wfEntry of wfEntries) {
        if (!wfEntry.isDirectory()) continue;
        const runsDir = join(baseDir, wfEntry.name, "runs");
        if (existsSync(runsDir)) {
          const runEntries = readdirSync(runsDir, { withFileTypes: true });
          for (const runEntry of runEntries) {
            if (!runEntry.isDirectory()) continue;
            const filePath = join(runsDir, runEntry.name, "run.json");
            if (existsSync(filePath)) {
              try {
                const raw = readFileSync(filePath, "utf-8");
                results.push(WorkflowRunSchema.parse(JSON.parse(raw)));
              } catch {
                /* noop */
              }
            }
          }
        }
      }
    }

    return results.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );
  }

  cleanupStaleRuns(username?: string): number {
    const runsToEvaluate: WorkflowRun[] = [];
    if (username) {
      runsToEvaluate.push(...this.listRuns(username));
    } else {
      const usersBaseDir = join(SPACES_DATA_PATH(), USERS_DIR);
      if (existsSync(usersBaseDir)) {
        const userEntries = readdirSync(usersBaseDir, { withFileTypes: true });
        for (const userEntry of userEntries) {
          if (userEntry.isDirectory()) {
            runsToEvaluate.push(...this.listRuns(userEntry.name));
          }
        }
      }
    }

    let cleanedCount = 0;
    const now = new Date().toISOString();

    for (const run of runsToEvaluate) {
      if (run.status === "running" || run.status === "pending") {
        run.status = "error";
        run.completedAt = now;

        for (const stepId of Object.keys(run.stepStates)) {
          const stepState = run.stepStates[stepId];
          if (stepState.status === "running" || stepState.status === "pending") {
            stepState.status = "error";
            stepState.completedAt = now;
            stepState.error = "Server process restarted during workflow execution";
          }
        }

        this.saveRun(run.username, run);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}

export const workflowRunStore = new WorkflowRunStore();
