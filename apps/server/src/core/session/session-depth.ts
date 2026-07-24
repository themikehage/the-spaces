// SPDX-License-Identifier: MIT
import { sessionMetadataStore } from "./metadata-store";

export function getSubagentDepth(username: string, parentSessionId: string): number {
  let depth = 0;
  let currentId = parentSessionId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const metadata = sessionMetadataStore.getSessionMetadata(username, currentId);
    if (!metadata) {
      break;
    }

    currentId = metadata.parentSessionId ?? "";
    if (currentId) {
      depth++;
    }
  }

  return depth;
}
