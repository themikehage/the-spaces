// SPDX-License-Identifier: MIT
import { z } from "zod";
import { ToolCallSchema, ToolResultSchema } from "./tool.schema.js";

export const MessageRoleSchema = z.enum(["user", "assistant", "tool", "system"]);

export const ContentBlockSchema = z.object({
  type: z.enum(["text", "tool_use", "tool_result"]),
  text: z.string().optional(),
  toolUse: ToolCallSchema.optional(),
  toolResult: ToolResultSchema.optional(),
});

export const MessageSchema = z.object({
  id: z.string().uuid(),
  role: MessageRoleSchema,
  content: z.union([z.string(), z.array(ContentBlockSchema)]),
  createdAt: z.string().datetime(),
});

export type MessageSchemaType = z.infer<typeof MessageSchema>;
