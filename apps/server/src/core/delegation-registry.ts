// SPDX-License-Identifier: MIT
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { EnvelopeResult } from "shared";
import { userConfig } from "./session/user-config";

export interface PendingDelegation {
  toolCallId: string;
  parentSessionId: string;
  targetType: "spawn" | "delegate";
  targetLabel: string;
  task: string;
  status: "running" | "success" | "error" | "blocked";
  startedAt: string;
  completedAt?: string;
  result?: EnvelopeResult;
  subagentSessionId: string;
}

export type DelegationEvent =
  | {
      type: "delegation_started";
      parentSessionId: string;
      toolCallId: string;
      subagentSessionId: string;
      task: string;
      targetType: string;
    }
  | {
      type: "delegation_completed";
      parentSessionId: string;
      toolCallId: string;
      status: PendingDelegation["status"];
      result: EnvelopeResult;
    };

export type DelegationEventListener = (username: string, event: DelegationEvent) => void;

export class DelegationRegistry {
  private activePromises = new Map<
    string,
    { abort: () => void; parentSessionId: string; subagentSessionId: string }
  >();
  private listeners = new Set<DelegationEventListener>();

  onEvent(listener: DelegationEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(username: string, event: DelegationEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(username, event);
      } catch (err) {
        console.error("[DelegationRegistry] Listener error:", err);
      }
    }
  }

  private getDelegationsDir(username: string, parentSessionId: string): string {
    const userDir = userConfig.ensureUserDir(username);
    const dir = join(userDir, "sessions", parentSessionId, "delegations");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  register(
    username: string,
    parentSessionId: string,
    d: PendingDelegation,
    abortFn: () => void,
  ): void {
    if (this.activePromises.has(d.toolCallId)) {
      console.warn(
        `[DelegationRegistry] toolCallId ${d.toolCallId} already registered — aborting previous`,
      );
      try {
        this.activePromises.get(d.toolCallId)!.abort();
      } catch (err) {
        console.error(
          `[DelegationRegistry] Failed to abort previous toolCallId ${d.toolCallId}:`,
          err,
        );
      }
    }
    const dir = this.getDelegationsDir(username, parentSessionId);
    writeFileSync(join(dir, `${d.toolCallId}.json`), JSON.stringify(d, null, 2), "utf-8");
    this.activePromises.set(d.toolCallId, {
      abort: abortFn,
      parentSessionId,
      subagentSessionId: d.subagentSessionId,
    });

    this.notify(username, {
      type: "delegation_started",
      parentSessionId,
      toolCallId: d.toolCallId,
      subagentSessionId: d.subagentSessionId,
      task: d.task,
      targetType: d.targetType,
    });
  }

  complete(
    username: string,
    parentSessionId: string,
    toolCallId: string,
    status: PendingDelegation["status"],
    result: EnvelopeResult,
  ): void {
    const dir = this.getDelegationsDir(username, parentSessionId);
    const file = join(dir, `${toolCallId}.json`);
    if (existsSync(file)) {
      try {
        const d: PendingDelegation = JSON.parse(readFileSync(file, "utf-8"));
        d.status = status;
        d.completedAt = new Date().toISOString();
        d.result = result;
        writeFileSync(file, JSON.stringify(d, null, 2), "utf-8");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err ?? "Unknown error");
        console.error(`[DelegationRegistry] Failed to complete delegation file:`, msg);
      }
    }
    this.activePromises.delete(toolCallId);

    this.notify(username, {
      type: "delegation_completed",
      parentSessionId,
      toolCallId,
      status,
      result,
    });
  }

  getAll(username: string, parentSessionId: string): PendingDelegation[] {
    const dir = this.getDelegationsDir(username, parentSessionId);
    const list: PendingDelegation[] = [];
    try {
      const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
      for (const file of files) {
        const d: PendingDelegation = JSON.parse(readFileSync(join(dir, file), "utf-8"));
        // Robustez: si figura como running pero no está activo en memoria, fue interrumpido
        if (d.status === "running" && !this.activePromises.has(d.toolCallId)) {
          d.status = "blocked";
          d.result = {
            status: "blocked",
            executive_summary: "Execution was interrupted due to a server restart.",
            artifacts: "none",
            risks: "None",
          };
          try {
            writeFileSync(join(dir, file), JSON.stringify(d, null, 2), "utf-8");
            this.notify(username, {
              type: "delegation_completed",
              parentSessionId,
              toolCallId: d.toolCallId,
              status: "blocked",
              result: d.result,
            });
          } catch {
            /* noop */
          }
        }
        list.push(d);
      }
    } catch {
      /* noop */
    }
    return list;
  }

  getByToolCallId(
    username: string,
    parentSessionId: string,
    toolCallId: string,
  ): PendingDelegation | undefined {
    return this.getAll(username, parentSessionId).find((d) => d.toolCallId === toolCallId);
  }

  // Permite abortar en cascada recursiva (BFS) todas las delegaciones del árbol
  abortAllRecursive(rootSessionId: string): void {
    const pending = new Set<string>([rootSessionId]);
    const cancelled = new Set<string>();

    let found = true;
    while (found) {
      found = false;
      for (const [toolCallId, active] of this.activePromises.entries()) {
        if (cancelled.has(toolCallId)) continue;

        const parentInPending = pending.has(active.parentSessionId);
        const subagentInPending = active.subagentSessionId && pending.has(active.subagentSessionId);

        if (parentInPending || subagentInPending) {
          try {
            active.abort();
          } catch (err) {
            console.error(`[DelegationRegistry] Error aborting toolCallId ${toolCallId}:`, err);
          }
          cancelled.add(toolCallId);

          if (active.subagentSessionId) {
            pending.add(active.subagentSessionId);
          }
          found = true;
        }
      }
    }
  }

  // Permite abortar en cascada todas las delegaciones de una sesión padre (Retrocompatibilidad)
  abortAll(parentSessionId: string): void {
    this.abortAllRecursive(parentSessionId);
  }

  // Permite abortar una delegación/subagente desde su propia sesión (Retrocompatibilidad)
  abortBySubagentSessionId(subagentSessionId: string): void {
    this.abortAllRecursive(subagentSessionId);
  }
}

export const delegationRegistry = new DelegationRegistry();
