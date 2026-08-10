// SPDX-License-Identifier: MIT
import { apiFetch } from "@/lib/api";
import type {
  CustomToolSummary,
  EntityToolsScopeResponse,
  EntityType,
  ToolScopeTarget,
  UpsertFolderCustomTool,
} from "shared";

export interface FolderToolDetail {
  definition: Record<string, unknown>;
  instructionsMd?: string;
  hasUi: boolean;
  hasScripts: boolean;
  uiHtml?: string;
  toolDir?: string;
}

async function fetchCustomTools(): Promise<CustomToolSummary[]> {
  const res = await apiFetch("/api/custom-tools");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load custom tools list");
  }
  return res.json();
}

async function fetchToolDetail(name: string): Promise<FolderToolDetail> {
  const res = await apiFetch(`/api/custom-tools/${encodeURIComponent(name)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to load tool ${name}`);
  }
  return res.json();
}

async function fetchEntityToolsScope(
  entityType?: EntityType,
  entityId?: string,
): Promise<EntityToolsScopeResponse> {
  const query =
    entityType && entityType !== "global" && entityId
      ? `?entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`
      : "";
  const res = await apiFetch(`/api/agents/scope/tools${query}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load scope config");
  }
  return res.json();
}

async function updateEntityToolsScope(payload: {
  target: ToolScopeTarget;
  add: string[];
  remove: string[];
}): Promise<void> {
  const res = await apiFetch("/api/agents/scope/tools", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to save tool scope configuration");
  }
}

async function saveCustomTool(payload: UpsertFolderCustomTool): Promise<void> {
  const name = (payload.definition as { name?: string }).name;
  const isUpdate = !!name;

  const url = isUpdate ? `/api/custom-tools/${encodeURIComponent(name!)}` : "/api/custom-tools";
  const method = isUpdate ? "PUT" : "POST";

  const res = await apiFetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to save custom tool");
  }
}

async function deleteCustomTool(name: string): Promise<void> {
  const res = await apiFetch(`/api/custom-tools/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete custom tool");
  }
}

export const customToolsService = {
  fetchCustomTools,
  fetchToolDetail,
  fetchEntityToolsScope,
  updateEntityToolsScope,
  saveCustomTool,
  deleteCustomTool,
};
