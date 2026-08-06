// SPDX-License-Identifier: MIT
import { DEFAULT_ALWAYS_ON_TOOLS } from "./tool-groups";

export interface ResolveActiveToolsParams {
  sessionTools: string[];
  persistedTools?: string[];
  hasExaKey: boolean;
  memoryEnabled: boolean;
  resolvedAgentId?: string;
  customToolNames?: string[];
  extraAlwaysOnTools?: string[];
  toolOverrides?: {
    add?: string[];
    remove?: string[];
  };
}

export function resolveActiveTools({
  sessionTools,
  persistedTools,
  hasExaKey,
  memoryEnabled,
  resolvedAgentId,
  customToolNames = [],
  extraAlwaysOnTools = [],
  toolOverrides,
}: ResolveActiveToolsParams): string[] {
  let activeTools = persistedTools || sessionTools;

  if (!hasExaKey) {
    activeTools = activeTools.filter((t) => t !== "exa_search");
  }

  const alwaysOnTools = [...DEFAULT_ALWAYS_ON_TOOLS, ...extraAlwaysOnTools];

  if (toolOverrides?.add) {
    alwaysOnTools.push(...toolOverrides.add);
  }

  const definedToolNames = new Set([
    ...sessionTools,
    "bash",
    "exa_search",
    "web_fetch",
    "manage_preview",
    ...alwaysOnTools,
    ...customToolNames,
  ]);
  if (memoryEnabled) {
    definedToolNames.add("memory");
  }

  const enabledCustomSet = new Set(customToolNames);

  const merged = new Set<string>([
    ...activeTools,
    ...alwaysOnTools,
    ...(memoryEnabled ? (["memory"] as const) : []),
    ...customToolNames,
  ]);

  // Persisted tools may explicitly disable a custom tool by omission? We respect enabled list as source of truth.
  // If persistedTools exists, we still keep custom tools that are enabled unless they were explicitly disabled via toggle,
  // but toggle updates storage not persisted list. So always include enabled custom tools.
  // To support disabling via UI, we check if persistedTools exists and does NOT contain a custom tool,
  // we still include it if it's in customToolNames (enabled in storage) but we don't force-remove.
  // The filtering below ensures only defined names pass.

  // If persistedTools is set and does NOT contain a custom tool, it means user might have disabled it?
  // But customToolNames only contains enabled ones, so we keep them.
  // For strict respect of persistedTools containing custom names, we still add enabled ones.
  // If user explicitly removed from permissions, they'd need to toggle off.

  const removeSet = new Set(toolOverrides?.remove || []);

  return Array.from(merged).filter(
    (tName) =>
      (definedToolNames.has(tName) || enabledCustomSet.has(tName)) && !removeSet.has(tName),
  );
}
