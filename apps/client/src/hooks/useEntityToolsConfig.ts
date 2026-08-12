import { useEntityConfig } from "@/hooks/useEntityConfig";
import { sessionsService } from "@/lib/api/sessions.service";
import { useCallback } from "react";
import type { AutonomyMode, EntityType } from "shared";

export const DEFAULT_TOOLS = [
  "read",
  "write",
  "edit",
  "bash",
  "grep",
  "find",
  "ls",
  "request_approval",
  "ask_question",
  "render_html",
];

export function useEntityToolsConfig(
  entityType?: EntityType,
  entityId?: string,
  sessionId?: string | null,
) {
  const { resolvedConfig, patchConfig, isLoading } = useEntityConfig({
    type: (entityType || "global") as any,
    id: entityId || "global",
  });

  const activeTools: string[] =
    resolvedConfig.toolOverrides?.add && resolvedConfig.toolOverrides.add.length > 0
      ? resolvedConfig.toolOverrides.add
      : DEFAULT_TOOLS;

  const autonomyMode: AutonomyMode =
    (resolvedConfig.autonomyMode as AutonomyMode) ||
    (resolvedConfig.executionMode as AutonomyMode) ||
    "standard";

  const updateTools = useCallback(
    async (tools: string[], mode?: AutonomyMode) => {
      if (entityType && entityId) {
        await patchConfig({
          toolOverrides: { add: tools },
          ...(mode ? { autonomyMode: mode, executionMode: mode } : {}),
        });
      }

      if (sessionId) {
        try {
          await sessionsService.updateSessionTools(sessionId, tools, mode);
        } catch (err) {
          console.error("Failed to update in-flight session tools:", err);
        }
      }
    },
    [entityType, entityId, sessionId, patchConfig],
  );

  return {
    activeTools,
    autonomyMode,
    executionMode: autonomyMode,
    updateTools,
    isLoading,
  };
}
