// SPDX-License-Identifier: MIT
import { SessionPrefix } from "@spaces/core";
import { PermissionEngine } from "@spaces/engine";
import { ApprovalManager } from "../approvals/approval-manager";
import { extractSubject, UserPermissionStore } from "../sandbox";
import { SessionMetadataStore } from "./metadata-store";
import { resolveSessionAllowedWriteDir } from "./workspace-resolver";

const approvalManager = new ApprovalManager();
const userPermissionStore = new UserPermissionStore();
const sessionMetadataStore = new SessionMetadataStore();

const permissionEngine = new PermissionEngine();

export interface CreateBeforeToolCallHookParams {
  sessionId: string;
  isSubagent?: boolean;
  parentSessionId?: string;
  username?: string;
  executionMode?: "readonly" | "standard" | "autonomous";
  permissionOverrides?: Record<string, "allow" | "deny" | "ask">;
}

export function createBeforeToolCallHook({
  sessionId,
  isSubagent,
  parentSessionId,
  username,
  executionMode,
  permissionOverrides,
}: CreateBeforeToolCallHookParams) {
  const resolvedIsSubagent =
    isSubagent ||
    sessionId.startsWith(SessionPrefix.SUBAGENT) ||
    sessionId.startsWith(SessionPrefix.DELEGATE);

  return async (context: any, signal?: AbortSignal): Promise<any> => {
    const { toolCall, args } = context;
    const toolName = toolCall.name;

    const resolvedUsername = username || "default_user";

    const resolvedAutonomy =
      (sessionMetadataStore.getSessionMetadata(resolvedUsername, sessionId)
        ?.autonomyLevel as any) ?? "auto";

    const resolvedMode =
      (sessionMetadataStore.getSessionMetadata(resolvedUsername, sessionId)
        ?.executionMode as any) ?? executionMode;

    if (resolvedAutonomy === "suggest") {
      const harmlessTools = ["ask_question", "request_approval"];
      if (!harmlessTools.includes(toolName)) {
        return {
          block: true,
          reason: `[Autonomy: Suggest Mode] Tool execution blocked. Suggested action: ${toolName} with arguments ${JSON.stringify(args)}`,
        };
      }
    }

    const allowedWriteDir = resolveSessionAllowedWriteDir(resolvedUsername, sessionId);

    const verdict = await permissionEngine.evaluate(toolName, args as Record<string, unknown>, {
      isSubagent: resolvedIsSubagent,
      username: resolvedUsername,
      sessionId,
      parentSessionId,
      executionMode: resolvedMode,
      allowedWriteDir,
      permissionOverrides,
    });
    if (!verdict.allowed) {
      return {
        block: true,
        reason: `[Permission Denied] ${verdict.reason ?? "Permission blocked"}`,
      };
    }

    const harmlessTools = ["ask_question", "request_approval", "memory_recall"];
    const needsApproval = resolvedAutonomy === "propose" && !harmlessTools.includes(toolName);

    if (needsApproval) {
      const toolCallId = toolCall.id;
      const approvalPromise = approvalManager.request({
        username: resolvedUsername,
        sessionId,
        parentSessionId,
        toolCallId,
        toolName,
        args: args as Record<string, unknown>,
        reason: verdict.reason ?? "Enforced by Propose autonomy level",
      });

      const onAbort = () => {
        approvalManager.resolve(toolCallId, { action: "deny" });
      };
      if (signal) {
        if (signal.aborted) {
          onAbort();
        } else {
          signal.addEventListener("abort", onAbort);
        }
      }

      try {
        const result = await approvalPromise;
        if (result.action === "deny") {
          if (result.payload?.persist) {
            const pattern = String(
              result.payload.pattern || extractSubject(toolName, args as Record<string, unknown>),
            );
            userPermissionStore.saveDecision(resolvedUsername, toolName, pattern, "deny");
          }
          return { block: true, reason: `[Permission Denied] Rejected by user` };
        }

        if (result.payload?.persist) {
          const pattern = String(
            result.payload.pattern || extractSubject(toolName, args as Record<string, unknown>),
          );
          userPermissionStore.saveDecision(resolvedUsername, toolName, pattern, "allow");
        }
        return undefined; // Approved
      } finally {
        if (signal) {
          signal.removeEventListener("abort", onAbort);
        }
      }
    }

    return undefined; // Allowed
  };
}
