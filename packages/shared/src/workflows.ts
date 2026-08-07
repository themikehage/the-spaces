// SPDX-License-Identifier: MIT
import { z } from "zod";

export const WorkflowStepTypeSchema = z.enum([
  "agent",
  "if",
  "switch",
  "merge",
  "approval",
  "code",
  "http",
  "variables",
  "webhook",
]);
export type WorkflowStepType = z.infer<typeof WorkflowStepTypeSchema>;

export const VariableOpSchema = z.object({
  op: z.enum(["get", "set", "delete", "increment"]),
  key: z.string(),
  value: z.unknown().optional(),
  amount: z.number().optional(),
});
export type VariableOp = z.infer<typeof VariableOpSchema>;

export const WorkflowStepSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/, {
    message: "Step ID must use only lowercase letters, digits, and underscores (snake_case). No hyphens or special characters.",
  }),
  type: WorkflowStepTypeSchema,
  label: z.string(),
  dependsOn: z.array(z.string()).optional(),
  agentId: z.string().optional(),
  taskTemplate: z.string().optional(),
  subagentType: z.enum(["explorer", "builder", "autonomous"]).optional(),
  maxSteps: z.number().optional(),
  captureOutputs: z.array(z.string()).optional(),
  condition: z.string().optional(),
  branches: z.record(z.array(z.string())).optional(),
  defaultBranch: z.string().optional(),
  approvalMessage: z.string().optional(),
  pinnedOutputs: z.record(z.unknown()).optional(),
  codeSnippet: z.string().optional(),
  codeTimeout: z.number().optional(),
  httpMethod: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  httpUrl: z.string().optional(),
  httpHeaders: z.record(z.string()).optional(),
  httpBody: z.unknown().optional(),
  httpTimeoutMs: z.number().optional(),
  httpResponseMapping: z.record(z.string()).optional(),
  httpCredentialId: z.string().optional(),
  httpExpectStatus: z.array(z.number()).optional(),
  timeoutMs: z.number().optional(),
  onError: z.enum(["stop", "continue", "retry"]).optional(),
  retryCount: z.number().optional(),
  retryDelayMs: z.number().optional(),
  errorBranch: z.array(z.string()).optional(),
  variableOps: z.array(VariableOpSchema).optional(),
  webhookId: z.string().optional(),
  webhookSecret: z.string().optional(),
  webhookResponseMode: z.enum(["onReceived", "onWorkflowCompleted"]).optional(),
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
  status: z.enum([
    "pending",
    "running",
    "success",
    "error",
    "skipped",
    "pinned",
    "waiting_approval",
  ]),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  outputs: z.record(z.unknown()).optional(),
  agentSessionId: z.string().optional(),
  error: z.string().optional(),
  activeBranch: z.string().optional(),
});
export type WorkflowStepState = z.infer<typeof WorkflowStepStateSchema>;

export const WorkflowApprovalRequestSchema = z.object({
  runId: z.string(),
  stepId: z.string(),
  message: z.string(),
  requestedAt: z.string(),
});
export type WorkflowApprovalRequest = z.infer<typeof WorkflowApprovalRequestSchema>;

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
  workflowSessionId: z.string().optional(),
});
export type WorkflowRun = z.infer<typeof WorkflowRunSchema>;

export const WorkflowRunOptionsSchema = z.object({
  inputs: z.record(z.unknown()).optional(),
  parentSessionId: z.string().optional(),
  projectId: z.string().optional(),
  dryRun: z.boolean().optional(),
});
export type WorkflowRunOptions = z.infer<typeof WorkflowRunOptionsSchema>;
