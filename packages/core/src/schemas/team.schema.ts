// SPDX-License-Identifier: MIT
import { z } from "zod";

export const NegotiationProtocolSchema = z.object({
  agreementPattern: z.string(),
  counterPattern: z.string().optional(),
  rejectPattern: z.string().optional(),
  maxRounds: z.number().int().min(1).max(20).default(3),
  arbiterAgentId: z.string().optional(),
  quorumThreshold: z.number().min(0).max(1).default(0.51),
});
export type NegotiationProtocol = z.infer<typeof NegotiationProtocolSchema>;

export const TeamTypeSchema = z.enum(["Orchestration", "Negotiation"]);
export type TeamType = z.infer<typeof TeamTypeSchema>;

export const TeamModeSchema = z.enum(["debate"]);
export type TeamMode = z.infer<typeof TeamModeSchema>;

export const TeamRoleSchema = z.enum(["lead", "member", "observer"]);
export type TeamRole = z.infer<typeof TeamRoleSchema>;

export const TeamContextItemSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});
export type TeamContextItem = z.infer<typeof TeamContextItemSchema>;

export const TeamMemberSchema = z.object({
  agentId: z.string(),
  role: TeamRoleSchema.default("member"),
  outputMode: z.enum(["full-proposal", "diff-suggestion", "normal"]).optional(),
  assignedTasks: z.array(z.string()).optional(),
});
export type TeamMember = z.infer<typeof TeamMemberSchema>;

export const TeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  mode: TeamModeSchema.default("debate").optional(),
  teamType: TeamTypeSchema.default("Orchestration").optional(),
  members: z.array(TeamMemberSchema),
  maxRounds: z.number().int().min(1).max(20).default(5).optional(),
  showThinking: z.boolean().optional(),
  showTools: z.boolean().optional(),
  streamingEnabled: z.boolean().optional(),
  negotiationProtocol: NegotiationProtocolSchema.optional(),
  avatarUrl: z.string().optional(),
  context: z.array(TeamContextItemSchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  blueprintId: z.string().optional(),
});
export type Team = z.infer<typeof TeamSchema>;

export const CreateTeamSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  mode: TeamModeSchema.default("debate").optional(),
  teamType: TeamTypeSchema.default("Orchestration").optional(),
  members: z.array(TeamMemberSchema).optional(),
  maxRounds: z.number().int().min(1).max(20).default(5).optional(),
  showThinking: z.boolean().optional(),
  showTools: z.boolean().optional(),
  streamingEnabled: z.boolean().optional(),
  negotiationProtocol: NegotiationProtocolSchema.optional(),
  avatarUrl: z.string().optional(),
  context: z.array(TeamContextItemSchema).optional(),
  blueprintId: z.string().optional(),
});
export type CreateTeam = z.infer<typeof CreateTeamSchema>;

export const UpdateTeamSchema = CreateTeamSchema.omit({ teamType: true, id: true })
  .partial()
  .strict();
export type UpdateTeam = z.infer<typeof UpdateTeamSchema>;
