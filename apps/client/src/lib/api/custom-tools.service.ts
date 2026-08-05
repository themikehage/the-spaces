// SPDX-License-Identifier: MIT
import { apiFetch } from "@/lib/api";
import type {
  CustomToolSummary,
  EntityToolsScopeResponse,
  EntityType,
  ToolScopeTarget,
} from "shared";

async function fetchCustomTools(): Promise<CustomToolSummary[]> {
  const res = await apiFetch("/api/custom-tools");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load custom tools list");
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

export const customToolsService = {
  fetchCustomTools,
  fetchEntityToolsScope,
  updateEntityToolsScope,
};
