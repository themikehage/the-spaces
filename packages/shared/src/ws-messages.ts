// SPDX-License-Identifier: MIT
import { z } from "zod";

export const WS_PROTOCOL_VERSION = 1;

export const SESSION_SCOPED_TYPES = [
  "agent_start",
  "agent_end",
  "message_start",
  "message_update",
  "message_end",
  "tool_execution_start",
  "tool_execution_update",
  "tool_execution_end",
  "agent_error",
  "session_subscribed",
  "session_unsubscribed",
  "context_usage",
  "aborted",
  "tasks_update",
] as const;

export type SessionScopedType = (typeof SESSION_SCOPED_TYPES)[number];

export function isSessionScopedType(type: string): boolean {
  return (SESSION_SCOPED_TYPES as readonly string[]).includes(type);
}

export const WsClientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("auth"),
    token: z.string().optional(),
    sessionId: z.string().optional(),
  }),
  z.object({
    type: z.literal("pong"),
  }),
  z.object({
    type: z.literal("session_subscribe"),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal("session_unsubscribe"),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal("prompt"),
    sessionId: z.string(),
    message: z.string(),
    tools: z.array(z.string()).optional(),
    images: z.array(z.unknown()).optional(),
  }),
  z.object({
    type: z.literal("steer"),
    sessionId: z.string(),
    message: z.string(),
  }),
  z.object({
    type: z.literal("follow_up"),
    sessionId: z.string(),
    message: z.string(),
  }),
  z.object({
    type: z.literal("abort"),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal("compact"),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal("get_context_usage"),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal("team_join"),
    teamId: z.string(),
  }),
  z.object({
    type: z.literal("team_send"),
    teamId: z.string(),
    sessionId: z.string().optional(),
    message: z.string(),
  }),
  z.object({
    type: z.literal("team_abort"),
    teamId: z.string(),
    sessionId: z.string().optional(),
  }),
  z.object({
    type: z.literal("approvals_get"),
  }),
  z.object({
    type: z.literal("ui_action"),
    componentId: z.string(),
    action: z.string(),
    payload: z.unknown().optional(),
    sessionId: z.string().optional(),
  }),
]);

export type WsClientMessage = z.infer<typeof WsClientMessageSchema>;

export const WsServerControlMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ping"),
  }),
  z.object({
    type: z.literal("auth_success"),
    wsId: z.string(),
    protocolVersion: z.number().optional(),
  }),
  z.object({
    type: z.literal("auth_error"),
    error: z.string(),
  }),
  z.object({
    type: z.literal("error"),
    error: z.string(),
    code: z.string().optional(),
  }),
  z.object({
    type: z.literal("session_subscribed"),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal("session_unsubscribed"),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal("session_status"),
    sessionId: z.string(),
    status: z.string(),
  }),
  z.object({
    type: z.literal("context_usage"),
    sessionId: z.string(),
    contextUsage: z.unknown(),
    sessionStats: z.unknown().optional(),
  }),
  z.object({
    type: z.literal("agent_error"),
    sessionId: z.string().optional(),
    error: z.string(),
    code: z.string().optional(),
  }),
  z.object({
    type: z.literal("aborted"),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal("team_joined"),
    teamId: z.string(),
  }),
  z.object({
    type: z.literal("approvals_pending"),
    items: z.array(z.unknown()),
  }),
  z.object({
    type: z.literal("ui_action_acknowledged"),
    componentId: z.string(),
  }),
  z.object({
    type: z.literal("ui_action_error"),
    componentId: z.string(),
    error: z.string(),
  }),
  z.object({
    type: z.literal("approval_request"),
    approval: z.unknown(),
  }),
  z.object({
    type: z.literal("approval_resolved"),
    approvalId: z.string(),
    status: z.string(),
  }),
  z.object({
    type: z.literal("attention_item_created"),
    item: z.unknown(),
  }),
  z.object({
    type: z.literal("attention_item_resolved"),
    itemId: z.string().optional(),
    itemIds: z.array(z.string()).optional(),
    status: z.string().optional(),
  }),
  z.object({
    type: z.literal("project_updated"),
    project: z.unknown().optional(),
    projectId: z.string().optional(),
  }),
  z.object({
    type: z.literal("entity-updated"),
    entityType: z.string().optional(),
    action: z.string().optional(),
    data: z.unknown().optional(),
  }),
  z.object({
    type: z.literal("preview_status"),
    project: z.string(),
    status: z.string(),
    url: z.string().optional(),
    port: z.number().optional(),
    error: z.string().optional(),
  }),
  z.object({
    type: z.literal("preview_build_log"),
    project: z.string(),
    line: z.string(),
  }),
  z.object({
    type: z.literal("preview_build_end"),
    project: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  z.object({
    type: z.literal("delegation_started"),
    delegationId: z.string().optional(),
  }),
  z.object({
    type: z.literal("delegation_completed"),
    delegationId: z.string().optional(),
  }),
  z.object({
    type: z.literal("global_log"),
    message: z.string().optional(),
    level: z.string().optional(),
  }),
  z.object({
    type: z.literal("tasks_update"),
    sessionId: z.string().optional(),
    tasks: z.array(z.unknown()).optional(),
  }),
  z.object({
    type: z.literal("workflow_run_started"),
    runId: z.string(),
    workflowId: z.string(),
    workflowName: z.string(),
  }),
  z.object({
    type: z.literal("workflow_step_started"),
    runId: z.string(),
    stepId: z.string(),
    stepLabel: z.string(),
  }),
  z.object({
    type: z.literal("workflow_step_completed"),
    runId: z.string(),
    stepId: z.string(),
    status: z.string(),
    outputs: z.record(z.unknown()).optional(),
  }),
  z.object({
    type: z.literal("workflow_step_approval"),
    runId: z.string(),
    stepId: z.string(),
    approvalMessage: z.string(),
  }),
  z.object({
    type: z.literal("workflow_run_completed"),
    runId: z.string(),
    status: z.enum(["success", "error", "cancelled"]),
  }),
]);

export type WsServerControlMessage = z.infer<typeof WsServerControlMessageSchema>;

export type WsServerMessage =
  WsServerControlMessage | ({ type: string; sessionId?: string } & Record<string, unknown>);
export type WsServerMessageType = WsServerControlMessage["type"] | (string & {});
