import { SessionPrefix, type AutonomyMode } from "shared";
import { createServerContext } from "../infra/server-context";
import type { IApprovalManager } from "../ports/core-services.port";
import type { IWorkspaceResolver } from "../ports/workspace-resolver.port";
import { permissionEngine } from "../sandbox";
import { sessionMetadataStore } from "./metadata-store";
import * as defaultWorkspaceResolver from "./workspace-resolver";

export interface CreateBeforeToolCallHookParams {
  sessionId: string;
  isSubagent?: boolean;
  parentSessionId?: string;
  username?: string;
  autonomyMode?: AutonomyMode;
  executionMode?: AutonomyMode;
  permissionOverrides?: Record<string, "allow" | "deny" | "ask">;
  workspaceResolver?: IWorkspaceResolver;
  approvalManager?: IApprovalManager;
}

export function createBeforeToolCallHook({
  sessionId,
  isSubagent,
  parentSessionId,
  username,
  autonomyMode,
  executionMode,
  permissionOverrides,
  workspaceResolver = defaultWorkspaceResolver,
  approvalManager = createServerContext().approvalManager,
}: CreateBeforeToolCallHookParams) {
  const resolvedIsSubagent =
    isSubagent ||
    sessionId.startsWith(SessionPrefix.SUBAGENT) ||
    sessionId.startsWith(SessionPrefix.DELEGATE);

  return async (context: any, signal?: AbortSignal): Promise<any> => {
    const { toolCall, args } = context;
    const toolName = toolCall.name;

    const resolvedUsername = username || "default_user";

    const resolvedMode =
      sessionMetadataStore.getAutonomyMode(resolvedUsername, sessionId) ??
      autonomyMode ??
      executionMode ??
      "standard";

    const allowedWriteDir = workspaceResolver.resolveSessionAllowedWriteDir(resolvedUsername, sessionId);

    const verdict = permissionEngine.evaluate(toolName, args as Record<string, unknown>, {
      isSubagent: resolvedIsSubagent,
      username: resolvedUsername,
      sessionId,
      parentSessionId,
      autonomyMode: resolvedMode,
      executionMode: resolvedMode,
      allowedWriteDir,
      permissionOverrides,
    });
    if (verdict.allow === false) {
      return { block: true, reason: `[Permission Denied] ${verdict.reason}` };
    }

    const needsApproval = verdict.allow === "ask";

    if (needsApproval) {
      const toolCallId = toolCall.id;
      const approvalPromise = approvalManager.request({
        username: resolvedUsername,
        sessionId,
        parentSessionId,
        toolCallId,
        toolName,
        args: args as Record<string, unknown>,
        reason:
          "reason" in verdict && typeof verdict.reason === "string"
            ? verdict.reason
            : "Enforced by Propose autonomy level",
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
          return { block: true, reason: `[Permission Denied] Rejected by user` };
        }
        return undefined;
      } finally {
        if (signal) {
          signal.removeEventListener("abort", onAbort);
        }
      }
    }

    return undefined;
  };
}

