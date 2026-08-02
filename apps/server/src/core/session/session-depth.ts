// SPDX-License-Identifier: MIT
import { SessionMetadataStore } from "./metadata-store";

export function getSubagentDepth(
  username: string,
  parentSessionId: string,
  store?: SessionMetadataStore,
): number {
  const sessionMetadataStore = store ?? new SessionMetadataStore();
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
