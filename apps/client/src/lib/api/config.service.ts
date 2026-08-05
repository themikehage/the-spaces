// SPDX-License-Identifier: MIT
import { apiFetch } from "@/lib/api";
import type { EntityConfigType, EntityType } from "shared";

async function fetchEntityConfig(
  entityType: EntityType,
  entityId: string,
): Promise<EntityConfigType> {
  const res = await apiFetch(`/api/config/${entityType}/${encodeURIComponent(entityId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchResolvedConfig(
  entityType: EntityType,
  entityId: string,
): Promise<EntityConfigType> {
  const res = await apiFetch(`/api/config/${entityType}/${encodeURIComponent(entityId)}/resolved`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function updateEntityConfig(
  entityType: EntityType,
  entityId: string,
  newConfig: EntityConfigType,
): Promise<EntityConfigType> {
  const res = await apiFetch(`/api/config/${entityType}/${encodeURIComponent(entityId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newConfig),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to update entity config");
  }
  return res.json();
}

async function fetchSessionConfig(sessionId: string): Promise<EntityConfigType> {
  const res = await apiFetch(`/api/config/session/${encodeURIComponent(sessionId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const configService = {
  fetchEntityConfig,
  fetchResolvedConfig,
  updateEntityConfig,
  fetchSessionConfig,
};
