// SPDX-License-Identifier: MIT
import { z } from "zod";

export const SessionStatusSchema = z.enum(["active", "streaming", "task-running", "sleeping"]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const SessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messageCount: z.number().optional(),
  status: SessionStatusSchema.optional(),
  projectId: z.string().optional(),
  agentId: z.string().optional(),
  teamId: z.string().optional(),
  experimentId: z.string().optional(),
  isExecution: z.boolean().optional(),
  totalTokens: z.number().optional(),
  toolCallCount: z.number().optional(),
  durationMs: z.number().optional(),
  modelId: z.string().optional(),
  errorCount: z.number().optional(),
  executionId: z.string().optional(),
  turnCount: z.number().optional(),
  schedulingMode: z.string().optional(),
  archived: z.boolean().optional(),
});
export type Session = z.infer<typeof SessionSchema>;

export const CreateSessionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  projectId: z.string().optional(),
  agentId: z.string().optional(),
  teamId: z.string().optional(),
  tools: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  executionMode: z.enum(["readonly", "standard", "autonomous"]).optional(),
});
export type CreateSession = z.infer<typeof CreateSessionSchema>;
