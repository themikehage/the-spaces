// SPDX-License-Identifier: MIT
import { type CustomToolDefinition } from "./schemas";

export function createCustomToolRuntime(
  definition: CustomToolDefinition,
  context: { sessionId?: string; username?: string; [key: string]: unknown },
): any {
  return {
    name: definition.name,
    label: definition.label || definition.name,
    description: definition.description,
    parameters: definition.parameters || {},
    execute: async (
      _toolCallId: string,
      _params: Record<string, any>,
      _signal?: AbortSignal,
      _onUpdate?: (partialResult: any) => void,
    ) => {
      const executeDef = definition.execute;
      switch (executeDef.type) {
        case "ui":
          return {
            content: [{ type: "text", text: `UI rendered for custom tool ${definition.name}` }],
            details: {
              ui: definition.ui,
              presentation: definition.presentation || {
                defaultExpanded: true,
                accordionDefaultOpen: true,
              },
            },
            isError: false,
          };

        default:
          return {
            content: [
              { type: "text", text: `Execution mode '${executeDef.type}' is currently postponed.` },
            ],
            isError: true,
          };
      }
    },
  };
}
