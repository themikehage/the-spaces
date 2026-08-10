// SPDX-License-Identifier: MIT
import { uiApprovalRegistry } from "../approvals/ui-approval-registry";
import { type CustomToolDefinition } from "./schemas";
import { executeCustomToolScript } from "./script-executor";
import { loadToolUi } from "./ui-loader";

export interface CustomToolContext {
  username: string;
  sessionId: string;
  cwd?: string;
  [key: string]: unknown;
}

export function createCustomToolRuntime(
  definition: CustomToolDefinition,
  context: CustomToolContext,
  toolDir?: string,
): any {
  return {
    name: definition.name,
    label: definition.label || definition.name,
    description: definition.description,
    parameters: definition.parameters || {},
    execute: async (
      toolCallId: string,
      params: Record<string, any>,
      signal?: AbortSignal,
      _onUpdate?: (partialResult: any) => void,
    ) => {
      if (definition.requiresApproval) {
        const approvalRes = await uiApprovalRegistry.register(toolCallId, {
          username: context.username,
          sessionId: context.sessionId,
          toolName: definition.name,
          args: params,
          reason: `Execution approval required for custom tool "${definition.label || definition.name}"`,
        });

        if (approvalRes.action !== "confirm" && approvalRes.action !== "approve") {
          return {
            content: [{ type: "text", text: `Execution of custom tool ${definition.name} was rejected by user.` }],
            isError: false,
          };
        }
      }

      const executeDef = definition.execute;

      switch (executeDef.type) {
        case "script": {
          if (!toolDir) {
            return {
              content: [{ type: "text", text: `Tool directory not provided for script execution.` }],
              isError: true,
            };
          }
          try {
            const scriptRes = await executeCustomToolScript({
              toolDir,
              file: executeDef.file,
              params,
              timeoutMs: executeDef.timeout,
              signal,
            });

            if (scriptRes.exitCode !== 0) {
              return {
                content: [{ type: "text", text: scriptRes.stderr || scriptRes.stdout || `Script exited with code ${scriptRes.exitCode}` }],
                isError: true,
              };
            }

            const uiResult = toolDir ? loadToolUi(toolDir, { params, result: scriptRes.outputData ?? scriptRes.stdout }) : {};

            const outputText = scriptRes.stdout || "Script executed successfully";
            const responseText = uiResult.error
              ? `${outputText}\n\n[Warning: UI template failed to render: ${uiResult.error}]`
              : outputText;

            return {
              content: [{ type: "text", text: responseText }],
              details: {
                output: scriptRes.outputData,
                ...(uiResult.html ? { ui: { type: "html", html: uiResult.html } } : {}),
                ...(uiResult.error ? { uiError: uiResult.error } : {}),
                presentation: definition.presentation || { defaultExpanded: true, accordionDefaultOpen: true },
              },
              isError: false,
            };
          } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            return {
              content: [{ type: "text", text: `Script execution error: ${errorMsg}` }],
              isError: true,
            };
          }
        }

        case "ui": {
          const uiResult = toolDir ? loadToolUi(toolDir, { params }) : {};
          if (uiResult.error) {
            return {
              content: [{ type: "text", text: `Custom tool UI rendering failed: ${uiResult.error}` }],
              isError: true,
            };
          }

          return {
            content: [{ type: "text", text: `UI rendered for custom tool ${definition.name}` }],
            details: {
              ui: uiResult.html ? { type: "html", html: uiResult.html } : definition.ui,
              presentation: definition.presentation || {
                defaultExpanded: true,
                accordionDefaultOpen: true,
              },
            },
            isError: false,
          };
        }

        default:
          return {
            content: [
              { type: "text", text: `Unsupported execution mode for tool ${definition.name}` },
            ],
            isError: true,
          };
      }
    },
  };
}
