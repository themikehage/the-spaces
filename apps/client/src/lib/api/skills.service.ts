// SPDX-License-Identifier: MIT
import { apiFetch } from "@/lib/api";
import type { EntityType } from "shared";

export interface SkillInfo {
  name: string;
  description: string;
  filePath?: string;
  disableModelInvocation?: boolean;
  scope?: string;
  content?: string;
}

async function fetchSkills(entityType?: EntityType, entityId?: string): Promise<SkillInfo[]> {
  const query =
    entityType && entityId
      ? `?entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`
      : "";
  const res = await apiFetch(`/api/skills${query}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to load skills");
  }
  const data = await res.json();
  return data.skills || [];
}

async function resetSkills(): Promise<void> {
  const res = await apiFetch("/api/skills/reset", {
    method: "POST",
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to reset skills");
  }
}

export const skillsService = {
  fetchSkills,
  resetSkills,
};
