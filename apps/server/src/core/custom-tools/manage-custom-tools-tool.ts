// SPDX-License-Identifier: MIT
import { ZodError } from "zod";
import { createServerContext } from "../infra/server-context";
import { folderCustomToolStorage } from "./folder-storage";
import { createCustomToolRuntime } from "./runtime";
import { type CustomToolDefinition, CustomToolDefinitionSchema } from "./schemas";

export interface ManageCustomToolsOptions {
  username: string;
  sessionId: string;
}

export function createManageCustomToolsTool(options: ManageCustomToolsOptions) {
  const { sessionManager, customToolProvider } = createServerContext();
  const { username, sessionId } = options;
  const provider = customToolProvider || folderCustomToolStorage;

  return {
    name: "manage_custom_tools",
    label: "Manage Custom Tools",
    description: "Allows the agent to get, upsert, delete, or toggle custom tools on demand.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["get", "upsert", "delete", "toggle"],
          description: "The action to perform",
        },
        tool: {
          type: "object",
          description: "The complete custom tool definition object (required for upsert)",
        },
        name: {
          type: "string",
          description: "The name of the tool (required for get, delete, or toggle)",
        },
        enabled: {
          type: "boolean",
          description: "The enabled status of the tool (required for toggle)",
        },
        instructionsMd: {
          type: "string",
          description: "Optional Tool.md contextual instructions (for upsert)",
        },
        uiHtml: {
          type: "string",
          description: "Optional Handlebars ui/index.html template string (for upsert)",
        },
        scriptContent: {
          type: "string",
          description: "Optional JS script content to write as scripts/execute.js (for upsert with type=script)",
        },
      },
      required: ["action"],
    },
    execute: async (_toolCallId: string, params: Record<string, unknown>) => {
      const action = params.action as string;
      const tool = params.tool as Record<string, unknown> | undefined;
      const name = params.name as string | undefined;
      const enabled = params.enabled as boolean | undefined;
      const instructionsMd = params.instructionsMd as string | undefined;
      const uiHtml = params.uiHtml as string | undefined;
      const scriptContent = params.scriptContent as string | undefined;

      const session = sessionManager.getSession(username, sessionId) as unknown as Record<string, unknown>;
      const workspaceDir = (session?.cwd as string) || undefined;
      const options = { workspaceDir };

      try {
        switch (action) {
          case "get": {
            if (name) {
              const folderTool = provider.get(username, name, options);
              if (!folderTool) {
                return {
                  content: [{ type: "text", text: `Custom tool "${name}" not found.` }],
                  isError: true,
                };
              }
              return {
                content: [{ type: "text", text: JSON.stringify(folderTool, null, 2) }],
                details: { tool: folderTool },
              };
            } else {
              const all = provider.loadAll(username, options);
              return {
                content: [{ type: "text", text: `Loaded ${all.length} custom tools.` }],
                details: { tools: all },
              };
            }
          }

          case "upsert": {
            if (!tool) {
              return {
                content: [{ type: "text", text: "Parameter 'tool' is required for action 'upsert'." }],
                isError: true,
              };
            }

            let parsedTool: CustomToolDefinition;
            try {
              parsedTool = CustomToolDefinitionSchema.parse(tool);
            } catch (err) {
              if (err instanceof ZodError) {
                const issues = err.issues
                  .map((issue) => `- Path [${issue.path.join(".")}]: ${issue.message}`)
                  .join("\n");

                return {
                  content: [{ type: "text", text: `Schema validation failed for custom tool:\n${issues}` }],
                  isError: true,
                };
              }
              throw err;
            }

            provider.upsert(
              username,
              {
                definition: parsedTool,
                instructionsMd,
                scriptContent,
                uiHtml,
                hasUi: !!uiHtml,
                hasScripts: !!scriptContent,
                toolDir: "",
              },
              options,
            );

            const savedFolderTool = provider.get(username, parsedTool.name, options);

            if (session) {
              const runtime = createCustomToolRuntime(
                parsedTool,
                {
                  cwd: workspaceDir || process.cwd(),
                  session: session as any,
                  username,
                  sessionId,
                },
                savedFolderTool?.toolDir,
              );

              const currentTools = (session.customTools as unknown[]) || [];
              const filtered = currentTools.filter((t: any) => t.name !== parsedTool.name);
              const nextTools = parsedTool.enabled ? [...filtered, runtime] : filtered;
              session.customTools = nextTools;
              session._customTools = nextTools;

              if (typeof session._refreshToolRegistry === "function") {
                session._refreshToolRegistry();
              }
            }

            try {
              const { broadcastToUser } = await import("../../ws/handler");
              broadcastToUser(username, {
                type: "entity-updated",
                entityType: "custom_tool",
              });
            } catch (e) {
              console.error("Failed to broadcast entity refresh:", e);
            }

            return {
              content: [
                {
                  type: "text",
                  text: `Custom tool "${parsedTool.name}" successfully saved and updated in session.`,
                },
              ],
              details: { tool: parsedTool },
            };
          }

          case "delete": {
            if (!name) {
              return {
                content: [{ type: "text", text: "Parameter 'name' is required for action 'delete'." }],
                isError: true,
              };
            }

            provider.delete(username, name, options);

            if (session) {
              const currentTools = (session.customTools as unknown[]) || [];
              const nextTools = currentTools.filter((t: any) => t.name !== name);
              session.customTools = nextTools;
              session._customTools = nextTools;
              if (typeof session._refreshToolRegistry === "function") {
                session._refreshToolRegistry();
              }
            }

            return {
              content: [{ type: "text", text: `Custom tool "${name}" deleted.` }],
            };
          }

          case "toggle": {
            if (!name || enabled === undefined) {
              return {
                content: [{ type: "text", text: "Parameters 'name' and 'enabled' are required for action 'toggle'." }],
                isError: true,
              };
            }

            const folderTool = provider.get(username, name, options);
            if (folderTool) {
              folderTool.definition.enabled = enabled;
              provider.upsert(username, folderTool, options);
            }

            return {
              content: [{ type: "text", text: `Custom tool "${name}" toggled to ${enabled}.` }],
            };
          }

          default:
            return {
              content: [{ type: "text", text: `Unknown action "${action}".` }],
              isError: true,
            };
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `Error managing custom tools: ${errorMsg}` }],
          isError: true,
        };
      }
    },
  };
}
