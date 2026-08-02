// SPDX-License-Identifier: MIT
import { z } from "zod";

export const AgentScopeTargetSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("global") }),
  z.object({ type: z.literal("project"), id: z.string() }),
]);
export type AgentScopeTarget = z.infer<typeof AgentScopeTargetSchema>;

export const AgentStatusSchema = z.enum(["starting", "idle", "streaming", "error", "stopped"]);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export const AgentDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
  tools: z.array(z.string()).optional(),
  serialTools: z.array(z.string()).optional(),
  avatarUrl: z.string().optional(),
  blueprintId: z.string().optional(),
  scope: AgentScopeTargetSchema.optional(),
});
export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;

export const UpdateAgentDefinitionSchema = AgentDefinitionSchema.partial().omit({ id: true });
export type UpdateAgentDefinition = z.infer<typeof UpdateAgentDefinitionSchema>;

export const AgentInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: AgentStatusSchema,
  createdAt: z.string(),
  description: z.string().optional(),
  model: z.string().optional(),
  toolsCount: z.number().optional(),
  avatarUrl: z.string().optional(),
  blueprintId: z.string().optional(),
});
export type AgentInfo = z.infer<typeof AgentInfoSchema>;
