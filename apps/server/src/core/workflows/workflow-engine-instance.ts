// SPDX-License-Identifier: MIT
import type { EventBus } from "../ports/spaces-host.port";
import { WorkflowEngine } from "./workflow-engine";

class SimpleEventBus implements EventBus {
  private handlers = new Map<string, Set<(payload: unknown) => void>>();

  emit(event: string, payload: unknown): void {
    const set = this.handlers.get(event);
    if (set) {
      for (const fn of set) {
        try {
          fn(payload);
        } catch (e) {
          console.error(`[Workflow Event Error] Handler for '${event}' threw:`, e);
        }
      }
    }
  }

  on(event: string, handler: (payload: unknown) => void): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    const set = this.handlers.get(event)!;
    set.add(handler);
    return () => {
      set.delete(handler);
    };
  }
}

const eventBus = new SimpleEventBus();

// Bridge workflow eventBus events to WebSocket clients via wsRegistry
const WORKFLOW_EVENTS = [
  "workflow_run_started",
  "workflow_step_started",
  "workflow_step_completed",
  "workflow_run_completed",
];

for (const eventName of WORKFLOW_EVENTS) {
  eventBus.on(eventName, (payload) => {
    // Lazy import wsRegistry to prevent circular dependencies
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { wsRegistry } = require("../../ws/registry");
    const message = JSON.stringify({ type: eventName, ...(payload as object) });

    for (const [, sockets] of wsRegistry.userSockets.entries()) {
      for (const ws of sockets) {
        try {
          ws.send(message);
        } catch {
          /* noop */
        }
      }
    }
  });
}

export const workflowEngine = new WorkflowEngine({
  getSessionManager: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { sessionManager } = require("../session/session-manager");
    return sessionManager;
  },
  getDelegationRegistry: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { delegationRegistry } = require("../delegation/delegation-registry");
    return delegationRegistry;
  },
  eventBus,
});
