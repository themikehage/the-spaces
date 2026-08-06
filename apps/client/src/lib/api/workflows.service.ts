// SPDX-License-Identifier: MIT
import { apiFetch } from "@/lib/api";
import type { WorkflowDefinition, WorkflowRun } from "shared";

export async function fetchWorkflows(filter?: {
  scopeType?: string;
  entityId?: string;
}): Promise<WorkflowDefinition[]> {
  const params = new URLSearchParams();
  if (filter?.scopeType) params.append("scopeType", filter.scopeType);
  if (filter?.entityId) params.append("entityId", filter.entityId);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await apiFetch(`/api/workflows${query}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || "Failed to load workflows");
  }
  return res.json();
}

export async function saveWorkflow(def: WorkflowDefinition): Promise<WorkflowDefinition> {
  const isNew = !def.createdAt;
  const method = isNew ? "POST" : "PUT";
  const url = isNew ? "/api/workflows" : `/api/workflows/${def.id}`;
  const res = await apiFetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(def),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || "Failed to save workflow");
  }
  return res.json();
}

export async function deleteWorkflow(id: string): Promise<void> {
  const res = await apiFetch(`/api/workflows/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || "Failed to delete workflow");
  }
}

export async function runWorkflow(
  workflowId: string,
  inputs?: Record<string, unknown>,
  options?: { dryRun?: boolean },
): Promise<WorkflowRun> {
  const res = await apiFetch(`/api/workflows/${workflowId}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputs, dryRun: options?.dryRun }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || "Failed to start workflow execution");
  }
  return res.json();
}

export async function fetchWorkflowRuns(workflowId: string): Promise<WorkflowRun[]> {
  const res = await apiFetch(`/api/workflows/${workflowId}/runs`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || "Failed to load workflow runs");
  }
  return res.json();
}

export async function fetchWorkflowRunStatus(runId: string): Promise<WorkflowRun> {
  const res = await apiFetch(`/api/workflows/runs/${runId}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || "Failed to load run status");
  }
  return res.json();
}

export async function abortWorkflowRun(runId: string): Promise<void> {
  const res = await apiFetch(`/api/workflows/runs/${runId}/abort`, { method: "POST" });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || "Failed to abort workflow run");
  }
}

export async function resolveWorkflowApproval(
  runId: string,
  stepId: string,
  approved: boolean,
): Promise<void> {
  const res = await apiFetch(`/api/workflows/runs/${runId}/steps/${stepId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approved }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || "Failed to resolve workflow approval");
  }
}
