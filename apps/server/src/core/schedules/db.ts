// SPDX-License-Identifier: MIT
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { getSchedulesDbPath, type ScheduleJob, type ScheduleRun } from "shared";

let dbInstance: Database | null = null;

export function getSchedulesDb(): Database {
  if (dbInstance) return dbInstance;

  const dbPath = getSchedulesDbPath();
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  dbInstance = db;
  initSchedulesTables(db);
  return db;
}

export function initSchedulesTables(db: Database = getSchedulesDb()): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schedule_jobs (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      preserve_session INTEGER NOT NULL DEFAULT 1,
      schedule_mode TEXT NOT NULL,
      interval_minutes INTEGER,
      cron_expression TEXT,
      project_id TEXT,
      agent_id TEXT,
      team_id TEXT,
      prompt TEXT NOT NULL,
      model_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_run_at INTEGER,
      next_run_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_schedule_jobs_user ON schedule_jobs(username);
    CREATE INDEX IF NOT EXISTS idx_schedule_jobs_project ON schedule_jobs(username, project_id);
    CREATE INDEX IF NOT EXISTS idx_schedule_jobs_agent ON schedule_jobs(username, agent_id);
    CREATE INDEX IF NOT EXISTS idx_schedule_jobs_team ON schedule_jobs(username, team_id);

    CREATE TABLE IF NOT EXISTS schedule_runs (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES schedule_jobs(id) ON DELETE CASCADE,
      username TEXT NOT NULL,
      trigger_source TEXT NOT NULL,
      status TEXT NOT NULL,
      session_id TEXT,
      started_at INTEGER NOT NULL,
      finished_at INTEGER,
      response_text TEXT,
      error_text TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_schedule_runs_job ON schedule_runs(job_id, started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_schedule_runs_user ON schedule_runs(username, started_at DESC);
  `);

  try {
    db.exec("ALTER TABLE schedule_jobs ADD COLUMN preserve_session INTEGER NOT NULL DEFAULT 1;");
  } catch {}
}

function mapRowToJob(row: any): ScheduleJob {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    enabled: Boolean(row.enabled),
    preserveSession: row.preserve_session !== undefined ? Boolean(row.preserve_session) : true,
    scheduleMode: row.schedule_mode,
    intervalMinutes: row.interval_minutes ?? null,
    cronExpression: row.cron_expression ?? null,
    projectId: row.project_id ?? null,
    agentId: row.agent_id ?? null,
    teamId: row.team_id ?? null,
    prompt: row.prompt,
    modelId: row.model_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastRunAt: row.last_run_at ?? null,
    nextRunAt: row.next_run_at ?? null,
  };
}

function mapRowToRun(row: any): ScheduleRun {
  return {
    id: row.id,
    jobId: row.job_id,
    username: row.username,
    triggerSource: row.trigger_source,
    status: row.status,
    sessionId: row.session_id ?? null,
    startedAt: row.started_at,
    finishedAt: row.finished_at ?? null,
    responseText: row.response_text ?? null,
    errorText: row.error_text ?? null,
    createdAt: row.created_at,
  };
}

export function insertJob(job: ScheduleJob): void {
  const db = getSchedulesDb();
  const stmt = db.prepare(`
    INSERT INTO schedule_jobs (
      id, username, name, enabled, preserve_session, schedule_mode, interval_minutes, cron_expression,
      project_id, agent_id, team_id, prompt, model_id, created_at, updated_at, last_run_at, next_run_at
    ) VALUES (
      $id, $username, $name, $enabled, $preserveSession, $scheduleMode, $intervalMinutes, $cronExpression,
      $projectId, $agentId, $teamId, $prompt, $modelId, $createdAt, $updatedAt, $lastRunAt, $nextRunAt
    )
  `);

  stmt.run({
    $id: job.id,
    $username: job.username,
    $name: job.name,
    $enabled: job.enabled ? 1 : 0,
    $preserveSession: job.preserveSession !== false ? 1 : 0,
    $scheduleMode: job.scheduleMode,
    $intervalMinutes: job.intervalMinutes ?? null,
    $cronExpression: job.cronExpression ?? null,
    $projectId: job.projectId ?? null,
    $agentId: job.agentId ?? null,
    $teamId: job.teamId ?? null,
    $prompt: job.prompt,
    $modelId: job.modelId ?? null,
    $createdAt: job.createdAt,
    $updatedAt: job.updatedAt,
    $lastRunAt: job.lastRunAt ?? null,
    $nextRunAt: job.nextRunAt ?? null,
  });
}

export function getJob(username: string, jobId: string): ScheduleJob | null {
  const db = getSchedulesDb();
  const row = db
    .prepare("SELECT * FROM schedule_jobs WHERE username = ? AND id = ?")
    .get(username, jobId);
  return row ? mapRowToJob(row) : null;
}

export function getJobById(jobId: string): ScheduleJob | null {
  const db = getSchedulesDb();
  const row = db.prepare("SELECT * FROM schedule_jobs WHERE id = ?").get(jobId);
  return row ? mapRowToJob(row) : null;
}

export function listJobs(
  username: string,
  filters?: { projectId?: string; agentId?: string; teamId?: string },
): ScheduleJob[] {
  const db = getSchedulesDb();
  let sql = "SELECT * FROM schedule_jobs WHERE username = ?";
  const params: any[] = [username];

  if (filters?.projectId) {
    sql += " AND project_id = ?";
    params.push(filters.projectId);
  }
  if (filters?.agentId) {
    sql += " AND agent_id = ?";
    params.push(filters.agentId);
  }
  if (filters?.teamId) {
    sql += " AND team_id = ?";
    params.push(filters.teamId);
  }

  sql += " ORDER BY created_at DESC";
  const rows = db.prepare(sql).all(...params);
  return rows.map(mapRowToJob);
}

export function listAllEnabledJobs(): ScheduleJob[] {
  const db = getSchedulesDb();
  const rows = db.prepare("SELECT * FROM schedule_jobs WHERE enabled = 1").all();
  return rows.map(mapRowToJob);
}

export function updateJob(
  username: string,
  jobId: string,
  patch: Partial<ScheduleJob>,
): ScheduleJob | null {
  const db = getSchedulesDb();
  const existing = getJob(username, jobId);
  if (!existing) return null;

  const updated: ScheduleJob = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  };

  const stmt = db.prepare(`
    UPDATE schedule_jobs SET
      name = $name,
      enabled = $enabled,
      preserve_session = $preserveSession,
      schedule_mode = $scheduleMode,
      interval_minutes = $intervalMinutes,
      cron_expression = $cronExpression,
      project_id = $projectId,
      agent_id = $agentId,
      team_id = $teamId,
      prompt = $prompt,
      model_id = $modelId,
      updated_at = $updatedAt,
      last_run_at = $lastRunAt,
      next_run_at = $nextRunAt
    WHERE username = $username AND id = $id
  `);

  stmt.run({
    $id: updated.id,
    $username: updated.username,
    $name: updated.name,
    $enabled: updated.enabled ? 1 : 0,
    $preserveSession: updated.preserveSession !== false ? 1 : 0,
    $scheduleMode: updated.scheduleMode,
    $intervalMinutes: updated.intervalMinutes ?? null,
    $cronExpression: updated.cronExpression ?? null,
    $projectId: updated.projectId ?? null,
    $agentId: updated.agentId ?? null,
    $teamId: updated.teamId ?? null,
    $prompt: updated.prompt,
    $modelId: updated.modelId ?? null,
    $updatedAt: updated.updatedAt,
    $lastRunAt: updated.lastRunAt ?? null,
    $nextRunAt: updated.nextRunAt ?? null,
  });

  return updated;
}

export function deleteJob(username: string, jobId: string): boolean {
  const db = getSchedulesDb();
  const res = db
    .prepare("DELETE FROM schedule_jobs WHERE username = ? AND id = ?")
    .run(username, jobId);
  return res.changes > 0;
}

export function insertRun(run: ScheduleRun): void {
  const db = getSchedulesDb();
  const stmt = db.prepare(`
    INSERT INTO schedule_runs (
      id, job_id, username, trigger_source, status, session_id, started_at, finished_at, response_text, error_text, created_at
    ) VALUES (
      $id, $jobId, $username, $triggerSource, $status, $sessionId, $startedAt, $finishedAt, $responseText, $errorText, $createdAt
    )
  `);

  stmt.run({
    $id: run.id,
    $jobId: run.jobId,
    $username: run.username,
    $triggerSource: run.triggerSource,
    $status: run.status,
    $sessionId: run.sessionId ?? null,
    $startedAt: run.startedAt,
    $finishedAt: run.finishedAt ?? null,
    $responseText: run.responseText ?? null,
    $errorText: run.errorText ?? null,
    $createdAt: run.createdAt,
  });
}

export function getRun(username: string, jobId: string, runId: string): ScheduleRun | null {
  const db = getSchedulesDb();
  const row = db
    .prepare("SELECT * FROM schedule_runs WHERE username = ? AND job_id = ? AND id = ?")
    .get(username, jobId, runId);
  return row ? mapRowToRun(row) : null;
}

export function listRuns(username: string, jobId: string): ScheduleRun[] {
  const db = getSchedulesDb();
  const rows = db
    .prepare(
      "SELECT * FROM schedule_runs WHERE username = ? AND job_id = ? ORDER BY started_at DESC LIMIT 100",
    )
    .all(username, jobId);
  return rows.map(mapRowToRun);
}

export function updateRun(runId: string, patch: Partial<ScheduleRun>): void {
  const db = getSchedulesDb();
  const existingRow = db.prepare("SELECT * FROM schedule_runs WHERE id = ?").get(runId);
  if (!existingRow) return;

  const current = mapRowToRun(existingRow);
  const updated: ScheduleRun = {
    ...current,
    ...patch,
  };

  const stmt = db.prepare(`
    UPDATE schedule_runs SET
      status = $status,
      session_id = $sessionId,
      finished_at = $finishedAt,
      response_text = $responseText,
      error_text = $errorText
    WHERE id = $id
  `);

  stmt.run({
    $id: updated.id,
    $status: updated.status,
    $sessionId: updated.sessionId ?? null,
    $finishedAt: updated.finishedAt ?? null,
    $responseText: updated.responseText ?? null,
    $errorText: updated.errorText ?? null,
  });
}

export function recoverRunningRunsToFailed(): number {
  const db = getSchedulesDb();
  const now = Date.now();
  const res = db
    .prepare(
      "UPDATE schedule_runs SET status = 'failed', error_text = 'Server restarted during execution', finished_at = ? WHERE status = 'running'",
    )
    .run(now);
  return res.changes;
}
