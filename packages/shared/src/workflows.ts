// SPDX-License-Identifier: MIT
import { z } from "zod";

export const WorkflowStepTypeSchema = z.enum(["agent"]);
export type WorkflowStepType = z.infer<typeof WorkflowStepTypeSchema>;

export const WorkflowStepSchema = z.object({
  id: z.string(),
  type: WorkflowStepTypeSchema,
  label: z.string(),
  dependsOn: z.array(z.string()).optional(),
  agentId: z.string().optional(),
  taskTemplate: z.string().optional(),
  subagentType: z.enum(["explorer", "builder", "autonomous"]).optional(),
  maxSteps: z.number().optional(),
  captureOutputs: z.array(z.string()).optional(),
});
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

export const WorkflowScopeSchema = z.object({
  type: z.enum(["global", "team", "project", "agent"]),
  entityId: z.string().optional(),
});
export type WorkflowScope = z.infer<typeof WorkflowScopeSchema>;

export const WorkflowInputParamSchema = z.object({
  type: z.enum(["string", "number", "boolean", "object"]),
  label: z.string().optional(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  default: z.unknown().optional(),
});
export type WorkflowInputParam = z.infer<typeof WorkflowInputParamSchema>;

export const WorkflowDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  scope: WorkflowScopeSchema.optional(),
  inputs: z.record(WorkflowInputParamSchema).optional(),
  steps: z.array(WorkflowStepSchema),
  onError: z.enum(["stop", "continue", "retry"]),
  retryCount: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

export const WorkflowStepStateSchema = z.object({
  stepId: z.string(),
  status: z.enum(["pending", "running", "success", "error"]),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  outputs: z.record(z.unknown()).optional(),
  agentSessionId: z.string().optional(),
  error: z.string().optional(),
});
export type WorkflowStepState = z.infer<typeof WorkflowStepStateSchema>;

export const WorkflowRunSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  workflowName: z.string(),
  inputs: z.record(z.unknown()),
  status: z.enum(["pending", "running", "success", "error", "cancelled", "waiting_approval"]),
  stepStates: z.record(WorkflowStepStateSchema),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  username: z.string(),
  parentSessionId: z.string().optional(),
});
export type WorkflowRun = z.infer<typeof WorkflowRunSchema>;

export const WorkflowRunOptionsSchema = z.object({
  inputs: z.record(z.unknown()).optional(),
  parentSessionId: z.string().optional(),
});
export type WorkflowRunOptions = z.infer<typeof WorkflowRunOptionsSchema>;
