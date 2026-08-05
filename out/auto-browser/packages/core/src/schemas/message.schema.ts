import { z } from "zod";

export const PromptMessageSchema = z.object({
  type: z.literal("prompt"),
  message: z.string().min(1),
});

export const AbortMessageSchema = z.object({
  type: z.literal("abort"),
});

export const ClientWsMessageSchema = z.discriminatedUnion("type", [
  PromptMessageSchema,
  AbortMessageSchema,
]);

export type ClientWsMessage = z.infer<typeof ClientWsMessageSchema>;
