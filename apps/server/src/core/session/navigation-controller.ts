// SPDX-License-Identifier: MIT
import type { Agent } from "../../vendor/agent/src/agent.ts";
import type { JsonlSessionStore } from "../stores/session-persistence";

export class NavigationController {
  constructor(
    private sessionStore: JsonlSessionStore,
    private delegationRegistry?: any,
  ) {}

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
    if (agent) {
      agent.abort();
      await agent.waitForIdle();
    }
    if (abortController) {
      abortController.abort();
    }
    const sId = this.sessionStore.getSessionId();
    try {
      const registry =
        this.delegationRegistry ??
        (await import("../delegation/delegation-registry")).delegationRegistry;
      if (registry && typeof registry.abortAllForParentSession === "function") {
        registry.abortAllForParentSession(sId);
      }
    } catch (err) {
      console.error("[NavigationController] Failed to propagate abort:", err);
    }
  }

  navigateBranch(targetId: string): void {
    this.sessionStore.branch(targetId);
  }
}
