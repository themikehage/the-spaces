import type { Agent } from "../../vendor/agent/src/agent.ts";
import { createServerContext } from "../infra/server-context";
import type { IApprovalManager, IDelegationRegistry, IUiApprovalRegistry } from "../ports/core-services.port";
import type { JsonlSessionStore } from "../stores/session-persistence";

export class NavigationController {
  private approvalManager: IApprovalManager;
  private uiApprovalRegistry: IUiApprovalRegistry;

  constructor(
    private sessionStore: JsonlSessionStore,
    private delegationRegistry?: IDelegationRegistry,
    approvalManager?: IApprovalManager,
    uiApprovalRegistry?: IUiApprovalRegistry,
  ) {
    const ctx = createServerContext();
    this.approvalManager = approvalManager ?? ctx.approvalManager;
    this.uiApprovalRegistry = uiApprovalRegistry ?? ctx.uiApprovalRegistry;
  }

  steer(agent: Agent, messageText: string): void {
    const steeringMsg = {
      role: "user" as const,
      content: messageText,
      timestamp: Date.now(),
    };
    agent.steer(steeringMsg);
  }

  followUp(agent: Agent, messageText: string): void {
    const followUpMsg = {
      role: "user" as const,
      content: messageText,
      timestamp: Date.now(),
    };
    agent.followUp(followUpMsg);
  }

  async abort(agent?: Agent, abortController?: AbortController | null): Promise<void> {
    if (abortController) {
      abortController.abort();
    }

    const sId = this.sessionStore.getSessionId();
    try {
      this.uiApprovalRegistry.cancelSession?.(sId);
    } catch {
      /* ignore */
    }

    try {
      this.approvalManager.cancelSession(sId);
    } catch {
      /* ignore */
    }

    try {
      const registry =
        this.delegationRegistry ??
        (await import("../delegation/delegation-registry")).delegationRegistry;
      if (registry) {
        if (typeof (registry as any).abortAllForParentSession === "function") {
          (registry as any).abortAllForParentSession(sId);
        } else if (typeof registry.abortAllRecursive === "function") {
          registry.abortAllRecursive(sId);
        }
      }
    } catch (err) {
      console.error("[NavigationController] Failed to propagate abort:", err);
    }

    if (agent) {
      agent.abort();
      await Promise.race([
        agent.waitForIdle(),
        new Promise<void>((resolve) => setTimeout(resolve, 5000)),
      ]);
    }
  }

  navigateBranch(targetId: string): void {
    this.sessionStore.branch(targetId);
  }
}
