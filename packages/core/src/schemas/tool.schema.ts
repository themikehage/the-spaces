import { z } from "zod";

export const ToolCallSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  arguments: z.record(z.unknown()),
});

export const ToolResultSchema = z.object({
  toolCallId: z.string(),
  output: z.string(),
  isError: z.boolean().optional(),
});

export type ToolCallSchemaType = z.infer<typeof ToolCallSchema>;
export type ToolResultSchemaType = z.infer<typeof ToolResultSchema>;
