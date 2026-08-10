// SPDX-License-Identifier: MIT
import type { ApprovalDecision, ApprovalRequest } from "shared";

export interface RequestApprovalParams {
  username: string;
  sessionId: string;
  parentSessionId?: string;
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  reason: string;
  timeoutMs?: number;
}

export interface IApprovalManager {
  request(params: RequestApprovalParams): Promise<ApprovalDecision>;
  resolve(approvalId: string, decision: "approve" | "deny" | ApprovalDecision): boolean;
  reject(approvalId: string, error: Error | string): boolean;
  cancelSession(sessionId: string): number;
  getAll(username: string): ApprovalRequest[];
}
