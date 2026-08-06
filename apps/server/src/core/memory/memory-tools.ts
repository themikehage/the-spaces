// SPDX-License-Identifier: MIT
import type { MemoryProvider, MemoryType } from "./types";

export function createMemoryTool(memory: MemoryProvider, enabled = true) {
  return {
    name: "memory",
    description:
      "Unified persistent memory tool to read, store/update (upsert), or delete long-term agent memories.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["read", "upsert", "delete"],
          description:
            "Memory action to perform: read (search), upsert (store/update), or delete (forget).",
        },
        query: {
          type: "string",
          description: "Natural language search term or semantic query (required for 'read').",
        },
        limit: {
          type: "integer",
          description: "Maximum number of memories to return (1-20, default 5, used for 'read').",
          minimum: 1,
          maximum: 20,
          default: 5,
        },
        id: {
          type: "string",
          description:
            "Memory ID. Required for 'delete'. Optional for 'upsert' to update an existing memory.",
        },
        content: {
          type: "string",
          description:
            "The memory text or factual content to store or update (required for 'upsert').",
        },
        type: {
          type: "string",
          enum: ["semantic", "episodic", "procedural"],
          description:
            "Type of memory. semantic=facts, episodic=events/interactions, procedural=patterns/procedures.",
          default: "semantic",
        },
        importance: {
          type: "number",
          description: "Importance weight from 0.0 (low) to 1.0 (high). Defaults to 0.5.",
          minimum: 0,
          maximum: 1,
          default: 0.5,
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Optional categorization tags for 'upsert'.",
        },
      },
      required: ["action"],
    },
    execute: async (_toolCallId: string, args: any) => {
      if (!enabled) {
        return {
          content: [
            {
              type: "text",
              text: "Memory feature is currently disabled in user settings. Enable it in Settings > General to use persistent memory.",
            },
          ],
          isError: true,
        };
      }

      let action = args.action;
      if (!action) {
        if (args.query) action = "read";
        else if (args.content) action = "upsert";
        else if (args.id && !args.content) action = "delete";
        else action = "read";
      }

      if (action === "read") {
        try {
          const query = args.query || "";
          const limit = args.limit ?? 5;
          const memories = await memory.recall(query, { limit });

          if (memories.length === 0) {
            return {
              content: [{ type: "text", text: "No relevant memories found." }],
              details: { count: 0 },
            };
          }

          const formatted = memories
            .map(
              (m, i) =>
                `${i + 1}. [${m.type}] (Importance: ${m.importance}) ID: ${m.id}\n   "${m.content}"`,
            )
            .join("\n\n");

          return {
            content: [{ type: "text", text: formatted }],
            details: { count: memories.length, memories },
          };
        } catch (e) {
          return {
            content: [{ type: "text", text: `Error recalling memories: ${String(e)}` }],
            isError: true,
          };
        }
      }

      if (action === "upsert") {
        try {
          if (!args.content || typeof args.content !== "string") {
            return {
              content: [{ type: "text", text: "Error: content is required for upsert." }],
              isError: true,
            };
          }
          const type = (args.type || "semantic") as MemoryType;
          const importance = args.importance ?? 0.5;
          const tags = args.tags || [];
          const id = args.id;

          const savedId = await memory.upsert(id, args.content, type, importance, tags);

          return {
            content: [
              {
                type: "text",
                text: `Memory successfully stored/updated [ID: ${savedId}]: [${type}] "${args.content.slice(0, 80)}..."`,
              },
            ],
            details: { status: "success", id: savedId, type, importance, tags },
          };
        } catch (e) {
          return {
            content: [{ type: "text", text: `Error storing memory: ${String(e)}` }],
            isError: true,
          };
        }
      }

      if (action === "delete") {
        try {
          if (!args.id) {
            return {
              content: [{ type: "text", text: "Error: id is required for delete." }],
              isError: true,
            };
          }
          await memory.forget(args.id);
          return {
            content: [
              { type: "text", text: `Memory ID "${args.id}" deleted successfully (if existed).` },
            ],
            details: { status: "success", deletedId: args.id },
          };
        } catch (e) {
          return {
            content: [{ type: "text", text: `Error deleting memory: ${String(e)}` }],
            isError: true,
          };
        }
      }

      return {
        content: [{ type: "text", text: `Unknown memory action: "${action}"` }],
        isError: true,
      };
    },
  };
}

export function createMemoryTools(memory: MemoryProvider, enabled = true) {
  return [createMemoryTool(memory, enabled)];
}
