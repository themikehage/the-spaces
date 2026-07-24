// SPDX-License-Identifier: MIT
import { z } from "zod";

export const WsAuthSuccessSchema = z.object({
  type: z.literal("auth_success"),
  wsId: z.string(),
});

export const WsAuthErrorSchema = z.object({
  type: z.literal("auth_error"),
  error: z.string(),
});

export const WsSessionSubscribedSchema = z.object({
  type: z.literal("session_subscribed"),
  sessionId: z.string(),
});

export const WsAgentStartSchema = z.object({
  type: z.literal("agent_start"),
  sessionId: z.string().optional(),
});

export const WsAgentEndSchema = z.object({
  type: z.literal("agent_end"),
  sessionId: z.string().optional(),
  messages: z.array(z.unknown()).optional(),
  willRetry: z.boolean().optional(),
});

export const WsSessionStreamSchema = z.object({
  type: z.literal("session_stream"),
  sessionId: z.string(),
  data: z.unknown(),
});

export const WsApprovalRequestSchema = z.object({
  type: z.literal("approval_request"),
  requestId: z.string(),
  tool: z.string(),
  params: z.unknown().optional(),
});

export const WsApprovalResponseSchema = z.object({
  type: z.literal("approval_response"),
  requestId: z.string(),
  approved: z.boolean(),
  result: z.unknown().optional(),
});

export const WsErrorSchema = z.object({
  type: z.literal("error"),
  error: z.string(),
  code: z.string().optional(),
});

export const WsServerMessageSchema = z.discriminatedUnion("type", [
  WsAuthSuccessSchema,
  WsAuthErrorSchema,
  WsSessionSubscribedSchema,
  WsAgentStartSchema,
  WsAgentEndSchema,
  WsSessionStreamSchema,
  WsApprovalRequestSchema,
  WsErrorSchema,
]);

export type WsServerMessage = z.infer<typeof WsServerMessageSchema>;

export const WsClientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("auth"), token: z.string().optional() }),
  z.object({ type: z.literal("subscribe_session"), sessionId: z.string() }),
  z.object({ type: z.literal("unsubscribe_session"), sessionId: z.string() }),
  WsApprovalResponseSchema,
]);

export type WsClientMessage = z.infer<typeof WsClientMessageSchema>;
