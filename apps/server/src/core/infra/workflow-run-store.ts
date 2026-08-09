// SPDX-License-Identifier: MIT
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  getWorkflowRunDir,
  getWorkflowsDbPath,
  WorkflowRunSchema,
  type WorkflowRun,
  type WorkflowStepState,
} from "shared";
import type {
  CreateWorkflowRunParams,
  IWorkflowRunStore,
  ListWorkflowRunsFilter,
} from "../ports/IWorkflowRunStore";

let dbInstance: Database | null = null;

export function getWorkflowsDb(): Database {
  if (dbInstance) return dbInstance;

  const isTest = process.env.NODE_ENV === "test" || process.env.BUN_ENV === "test";
  const dbPath = isTest ? ":memory:" : getWorkflowsDbPath();

  if (dbPath !== ":memory:") {
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(dbPath);
  if (dbPath !== ":memory:") {
    db.exec("PRAGMA journal_mode = WAL;");
  }
  db.exec("PRAGMA foreign_keys = ON;");

  dbInstance = db;
  initWorkflowsTables(db);
  return db;
}

export function initWorkflowsTables(db: Database = getWorkflowsDb()): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workflow_runs (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      workflow_id TEXT NOT NULL,
      workflow_name TEXT NOT NULL,
      inputs_json TEXT NOT NULL,
      status TEXT NOT NULL,
      step_states_json TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      parent_session_id TEXT,
      workflow_session_id TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_workflow_runs_user ON workflow_runs(username);
    CREATE INDEX IF NOT EXISTS idx_workflow_runs_wf ON workflow_runs(username, workflow_id);
    CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(username, status);
  `);
}

function mapRowToRun(row: any): WorkflowRun {
  let inputs: Record<string, unknown> = {};
  let stepStates: Record<string, WorkflowStepState> = {};

  try {
    inputs = JSON.parse(row.inputs_json || "{}");
  } catch {
    /* noop */
  }

  try {
    stepStates = JSON.parse(row.step_states_json || "{}");
  } catch {
    /* noop */
  }

  return {
    id: row.id,
    workflowId: row.workflow_id,
    workflowName: row.workflow_name,
    inputs,
    status: row.status,
    stepStates,
    startedAt: row.started_at,
    completedAt: row.completed_at || undefined,
    username: row.username,
    parentSessionId: row.parent_session_id || undefined,
    workflowSessionId: row.workflow_session_id || undefined,
  };
}

export class SqliteWorkflowRunStore implements IWorkflowRunStore {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || getWorkflowsDb();
    initWorkflowsTables(this.db);
  }

  saveRun(username: string, run: WorkflowRun): WorkflowRun {
    const validated = WorkflowRunSchema.parse(run);
    const stmt = this.db.prepare(`
      INSERT INTO workflow_runs (
        id, username, workflow_id, workflow_name, inputs_json, status, step_states_json,
        started_at, completed_at, parent_session_id, workflow_session_id, created_at
      ) VALUES (
        $id, $username, $workflowId, $workflowName, $inputsJson, $status, $stepStatesJson,
        $startedAt, $completedAt, $parentSessionId, $workflowSessionId, $createdAt
      )
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        step_states_json = excluded.step_states_json,
        completed_at = excluded.completed_at,
        workflow_session_id = excluded.workflow_session_id
    `);

    stmt.run({
      $id: validated.id,
      $username: username,
      $workflowId: validated.workflowId,
      $workflowName: validated.workflowName,
      $inputsJson: JSON.stringify(validated.inputs || {}),
      $status: validated.status,
      $stepStatesJson: JSON.stringify(validated.stepStates || {}),
      $startedAt: validated.startedAt,
      $completedAt: validated.completedAt ?? null,
      $parentSessionId: validated.parentSessionId ?? null,
      $workflowSessionId: validated.workflowSessionId ?? null,
      $createdAt: new Date(validated.startedAt).getTime() || Date.now(),
    });

    return validated;
  }

  createRun(params: CreateWorkflowRunParams): WorkflowRun {
    const { username, workflowId, workflowName, inputs, stepIds, parentSessionId } = params;
    const runId = crypto.randomUUID();
    const now = new Date().toISOString();

    const runDir = getWorkflowRunDir(username, workflowId, runId);
    if (!existsSync(runDir)) {
      mkdirSync(runDir, { recursive: true });
    }

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
    let sql = "SELECT * FROM workflow_runs WHERE username = ? AND id = ?";
    const params: any[] = [username, runId];
    if (workflowId) {
      sql += " AND workflow_id = ?";
      params.push(workflowId);
    }
    const row = this.db.prepare(sql).get(...params);
    return row ? mapRowToRun(row) : null;
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

  listRuns(username: string, filter?: ListWorkflowRunsFilter | string): WorkflowRun[] {
    let workflowId: string | undefined;
    let statusFilter: string | undefined;
    let limit = 50;

    if (typeof filter === "string") {
      workflowId = filter || undefined;
    } else if (filter) {
      workflowId = filter.workflowId;
      statusFilter = filter.status;
      if (filter.limit && filter.limit > 0) {
        limit = Math.min(filter.limit, 200);
      }
    }

    let sql = "SELECT * FROM workflow_runs WHERE username = ?";
    const params: any[] = [username];

    if (workflowId) {
      sql += " AND workflow_id = ?";
      params.push(workflowId);
    }

    if (statusFilter) {
      sql += " AND status = ?";
      params.push(statusFilter);
    }

    sql += " ORDER BY created_at DESC LIMIT ?";
    params.push(limit);

    const rows = this.db.prepare(sql).all(...params);
    return rows.map(mapRowToRun);
  }

  cleanupStaleRuns(username?: string): number {
    const now = new Date().toISOString();
    let sql = "SELECT * FROM workflow_runs WHERE status IN ('running', 'pending')";
    const params: any[] = [];

    if (username) {
      sql += " AND username = ?";
      params.push(username);
    }

    const rows = this.db.prepare(sql).all(...params);
    let cleanedCount = 0;

    for (const row of rows) {
      const run = mapRowToRun(row);
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

    return cleanedCount;
  }
}

export const sqliteWorkflowRunStore = new SqliteWorkflowRunStore();
