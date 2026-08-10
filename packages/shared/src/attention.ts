// SPDX-License-Identifier: MIT
import { z } from "zod";

export const AttentionKindSchema = z.enum(["approval", "question", "ui_action"]);
export type AttentionKind = z.infer<typeof AttentionKindSchema>;

export const AttentionItemSchema = z.object({
  approvalId: z.string(),
  username: z.string().optional(),
  sessionId: z.string(),
  parentSessionId: z.string().optional(),
  projectId: z.string().optional(),
  agentId: z.string().optional(),
  teamId: z.string().optional(),
  toolName: z.string(),
  args: z.record(z.unknown()).default({}),
  reason: z.string().optional().default(""),
  expiresAt: z.number().optional(),
  status: z.enum(["pending", "approved", "denied", "timeout", "cancelled"]).optional(),
  kind: AttentionKindSchema,
  type: AttentionKindSchema.optional(),
});

export type AttentionItem = z.infer<typeof AttentionItemSchema>;

export const AttentionPendingResponseSchema = z.object({
  pending: z.array(AttentionItemSchema),
});

export type AttentionPendingResponse = z.infer<typeof AttentionPendingResponseSchema>;

export const ResolveAttentionSchema = z.object({
  action: z.enum(["approve", "deny", "submit", "cancel", "confirm"]),
  payload: z.record(z.unknown()).optional(),
});

export type ResolveAttention = z.infer<typeof ResolveAttentionSchema>;

export interface ApprovalRequest {
  approvalId: string;
  username: string;
  sessionId: string;
  parentSessionId?: string;
  toolName: string;
  args: Record<string, unknown>;
  reason: string;
  expiresAt: number;
  status: "pending" | "approved" | "denied" | "timeout";
}

export interface ApprovalDecision {
  action: "approve" | "deny";
  payload?: Record<string, unknown>;
}
