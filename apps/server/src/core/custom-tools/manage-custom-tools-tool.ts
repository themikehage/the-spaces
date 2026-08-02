import { ZodError } from "zod";
import { type CustomToolDefinition, CustomToolDefinitionSchema } from "./schemas";
import { CustomToolStorage } from "./storage";

const customToolStorage = new CustomToolStorage();

export interface ManageCustomToolsOptions {
  username: string;
  sessionId: string;
}

export function createManageCustomToolsTool(options: ManageCustomToolsOptions) {
  const { username, sessionId } = options;

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
      },
      required: ["action"],
    },
    execute: async (toolCallId: string, params: any) => {
      const { action, tool, name, enabled } = params;

      try {
        switch (action) {
          case "get": {
            if (name) {
              const def = customToolStorage.get(username, name);
              if (!def) {
                return {
                  content: [{ type: "text", text: `Custom tool "${name}" not found.` }],
                  isError: true,
                };
              }
              return {
                content: [{ type: "text", text: JSON.stringify(def, null, 2) }],
                details: { tool: def },
              };
            } else {
              const all = customToolStorage.loadAll(username);
              return {
                content: [{ type: "text", text: `Loaded ${all.length} custom tools.` }],
                details: { tools: all },
              };
            }
          }

          case "upsert": {
            if (!tool) {
              return {
                content: [
                  { type: "text", text: "Parameter 'tool' is required for action 'upsert'." },
                ],
                isError: true,
              };
            }

            let parsedTool: CustomToolDefinition;
            try {
              parsedTool = CustomToolDefinitionSchema.parse(tool);
            } catch (err) {
              if (err instanceof ZodError) {
                const VALID_UI_TYPES = [
                  "badge",
                  "card",
                  "card-list",
                  "table",
                  "metric",
                  "code",
                  "html",
                  "section",
                  "video",
                  "audio",
                  "pdf",
                  "tabs",
                  "markdown",
                  "progress",
                  "accordion",
                  "diff",
                  "steps",
                  "stats",
                  "timeline",
                ].join(", ");

                const issues = err.issues
                  .map((issue: any) => {
                    let msg = `- Path [${issue.path.join(".")}]: ${issue.message}`;
                    if ((issue as any).received !== undefined) {
                      msg += ` (received: ${JSON.stringify((issue as any).received)})`;
                    }
                    const isRootUiTypeIssue =
                      issue.code === "invalid_union_discriminator" ||
                      (issue.path.length === 1 &&
                        issue.path[0] === "ui" &&
                        issue.code === "invalid_union");
                    if (isRootUiTypeIssue) {
                      msg += ` — Valid UI types are: ${VALID_UI_TYPES}`;
                    }
                    return msg;
                  })
                  .join("\n");

                return {
                  content: [
                    { type: "text", text: `Schema validation failed for custom tool:\n${issues}` },
                  ],
                  isError: true,
                };
              }
              throw err;
            }

            customToolStorage.upsert(username, parsedTool);

            // Broadcast refresh
            try {
              const { broadcastToUser } = await import("../ws-bridge");
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
                content: [
                  { type: "text", text: "Parameter 'name' is required for action 'delete'." },
                ],
                isError: true,
              };
            }

            customToolStorage.delete(username, name);

            // Broadcast refresh
            try {
              const { broadcastToUser } = await import("../ws-bridge");
              broadcastToUser(username, {
                type: "entity-updated",
                entityType: "custom_tool",
              });
            } catch (e) {
              console.error("Failed to broadcast entity refresh:", e);
            }

            return {
              content: [{ type: "text", text: `Custom tool "${name}" successfully deleted.` }],
              details: { deletedName: name },
            };
          }

          case "toggle": {
            if (!name || enabled === undefined) {
              return {
                content: [
                  {
                    type: "text",
                    text: "Parameters 'name' and 'enabled' are required for action 'toggle'.",
                  },
                ],
                isError: true,
              };
            }

            customToolStorage.toggle(username, name, enabled);

            // Broadcast refresh
            try {
              const { broadcastToUser } = await import("../ws-bridge");
              broadcastToUser(username, {
                type: "entity-updated",
                entityType: "custom_tool",
              });
            } catch (e) {
              console.error("Failed to broadcast entity refresh:", e);
            }

            return {
              content: [
                { type: "text", text: `Custom tool "${name}" enabled status set to ${enabled}.` },
              ],
              details: { name, enabled },
            };
          }

          default:
            return {
              content: [{ type: "text", text: `Invalid action "${action}".` }],
              isError: true,
            };
        }
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Error managing custom tools: ${err.message || err}` }],
          isError: true,
        };
      }
    },
  };
}
