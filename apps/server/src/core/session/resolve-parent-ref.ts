// SPDX-License-Identifier: MIT
import type { AgentRef } from "shared";

export interface SessionParentMeta {
  agentId?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  teamId?: string | null;
}

export function resolveParentRef(parentMeta?: SessionParentMeta | null): AgentRef {
  if (!parentMeta) {
    return { type: "global", id: "global" };
  }
  if (parentMeta.agentId) {
    return { type: "custom", id: parentMeta.agentId };
  }
  if (parentMeta.teamId) {
    return { type: "team", id: parentMeta.teamId };
  }
  if (parentMeta.projectId || parentMeta.projectName) {
    return { type: "project", id: parentMeta.projectId || parentMeta.projectName || "global" };
  }
  return { type: "global", id: "global" };
}
