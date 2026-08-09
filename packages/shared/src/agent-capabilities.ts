// SPDX-License-Identifier: MIT
import { z } from "zod";

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
});
export type TeamMember = z.infer<typeof TeamMemberSchema>;

export const WorkspaceCapabilitySchema = z.object({
  workspaceDir: z.string().optional(),
  agentsMdPath: z.string().optional(),
  cloneUrl: z.string().nullable().optional(),
});
export type WorkspaceCapability = z.infer<typeof WorkspaceCapabilitySchema>;

export const GroupCapabilitySchema = z.object({
  members: z.array(TeamMemberSchema).default([]),
  mode: TeamModeSchema.default("debate"),
  teamType: TeamTypeSchema.default("Orchestration"),
  maxRounds: z.number().int().min(1).max(20).default(5),
  showThinking: z.boolean().optional(),
  showTools: z.boolean().optional(),
  streamingEnabled: z.boolean().optional(),
  negotiationProtocol: z.any().optional(),
  context: z.array(TeamContextItemSchema).optional(),
  leaderId: z.string().optional().nullable(),
});
export type GroupCapability = z.infer<typeof GroupCapabilitySchema>;

export const WorkflowCapabilitySchema = z.object({
  workflowId: z.string().optional(),
  version: z.number().default(1),
  steps: z.array(z.record(z.string(), z.unknown())).optional().default([]),
});
export type WorkflowCapability = z.infer<typeof WorkflowCapabilitySchema>;

export const DelegationCapabilitySchema = z.object({
  parentId: z.string().nullable().optional(),
  depth: z.number().int().nonnegative().default(0),
  targetType: z.enum(["spawn", "delegate"]).optional(),
  maxRounds: z.number().int().optional(),
});
export type DelegationCapability = z.infer<typeof DelegationCapabilitySchema>;

export const AgentCapabilitiesSchema = z.object({
  workspace: WorkspaceCapabilitySchema.optional(),
  group: GroupCapabilitySchema.optional(),
  workflow: WorkflowCapabilitySchema.optional(),
  delegation: DelegationCapabilitySchema.optional(),
});
export type AgentCapabilities = z.infer<typeof AgentCapabilitiesSchema>;
