import { z } from "zod";

export const MessageRoleSchema = z.enum(["user", "assistant", "tool", "system"]);

export const MessageSchema = z.object({
  id: z.string().uuid(),
  role: MessageRoleSchema,
  content: z.union([z.string(), z.array(z.unknown())]),
  createdAt: z.string().datetime(),
});

export type MessageSchemaType = z.infer<typeof MessageSchema>;
