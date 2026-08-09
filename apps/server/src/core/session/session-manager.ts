// SPDX-License-Identifier: MIT
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getSessionDir, getUserDir, SessionPrefix } from "shared";
import { DefaultResourceLoader, type AgentSessionEvent } from "..";
import { mcpRegistry } from "../mcp/mcp-registry";
import { memoryRegistry } from "../memory/registry";
import type { IAgentRuntime } from "../ports/agent-runtime.port";
import { sessionMetadataStore } from "./metadata-store";
import { sessionLister, type SessionListItem, type SessionListQuery } from "./session-lister";
import { userConfigManager } from "./user-config";

import { subscribeSessionEvents } from "./session-event-publisher";
import { ensureWorkspaceStructure, getResolvedSkillPaths } from "./workspace-resolver";

export { ensureWorkspaceStructure, getResolvedSkillPaths };

interface UserSessionEntry {
  session: IAgentRuntime;
  unsubscribe: () => void;
}

export interface SessionOverrides {
  resourceLoader?: DefaultResourceLoader;
  customTools?: any[];
  workspaceDir?: string;
  skipMcpTools?: boolean;
  skipMemory?: boolean;
  teamId?: string;
}

/**
 * SessionManager is the application-level orchestrator responsible for session lifecycle,
 * agent creation, tool assignment, model resolution, workspace setup, and active session caching.
 */
export class SessionManager {
  private sessions = new Map<string, UserSessionEntry>();
  private pendingSessions = new Map<string, Promise<IAgentRuntime>>();

  get userConfig() {
    return userConfigManager;
  }
  readonly metadataStore = sessionMetadataStore;
  readonly lister = sessionLister;

  private getSessionKey(username: string, sessionId: string): string {
    return `${username}:${sessionId}`;
  }

  getSession(username: string, sessionId: string): IAgentRuntime | null {
    const key = this.getSessionKey(username, sessionId);
    return this.sessions.get(key)?.session ?? null;
  }

  subscribeToSession(
    username: string,
    sessionId: string,
    listener: (event: AgentSessionEvent) => void,
  ): () => void {
    const key = this.getSessionKey(username, sessionId);
    const entry = this.sessions.get(key);
    if (!entry) return () => {};

    return entry.session.on(listener);
  }

  subscribeOnce(
    username: string,
    sessionId: string,
    listener: (event: AgentSessionEvent) => void,
  ): void {
    const key = this.getSessionKey(username, sessionId);
    const entry = this.sessions.get(key);
    if (!entry) return;

    let called = false;
    let unsubscribe: (() => void) | null = null;

    unsubscribe = entry.session.on((event) => {
      if (!called) {
        called = true;
        unsubscribe?.();
        listener(event);
      }
    });
  }

  async destroySession(username: string, sessionId: string): Promise<void> {
    // 1. Cancelar TODAS las delegaciones del árbol (BFS)
    try {
      const { delegationRegistry } = await import("../delegation/delegation-registry");
      delegationRegistry.abortAllRecursive(sessionId);
    } catch (err) {
      console.error("[SessionManager.destroySession] Failed to propagate recursive abort:", err);
    }

    // 2. Encontrar y destruir sesiones hijas recursivamente
    const children = this.findChildSessions(username, sessionId);
    for (const childId of children) {
      await this.destroySession(username, childId);
    }

    // 3. Destruir la sesión actual
    const key = this.getSessionKey(username, sessionId);
    const entry = this.sessions.get(key);
    if (entry) {
      entry.unsubscribe();
      await entry.session.dispose();
      this.sessions.delete(key);
    }
    this.pendingSessions.delete(key);
    mcpRegistry.stopSessionMcpTools(username, sessionId);
    await memoryRegistry.shutdown(`session:${sessionId}`);
    const sessionDir = getSessionDir(username, sessionId);
    const { rmSync } = await import("node:fs");
    if (existsSync(sessionDir)) {
      rmSync(sessionDir, { recursive: true, force: true });
    }
  }

  private findChildSessions(username: string, parentSessionId: string): string[] {
    const children: string[] = [];
    const prefix = `${username}:`;

    // 1. En memoria
    for (const [key, entry] of this.sessions.entries()) {
      if (!key.startsWith(prefix)) continue;
      const sId = key.slice(prefix.length);
      const metadata = this.metadataStore.getSessionMetadata(username, sId);
      if (metadata?.parentSessionId === parentSessionId) {
        children.push(sId);
      }
    }

    // 2. Subagentes en disco bajo la carpeta del padre
    const parentSessionDir = getSessionDir(username, parentSessionId);
    const subagentsDir = join(parentSessionDir, "subagents");
    if (existsSync(subagentsDir)) {
      try {
        for (const dir of readdirSync(subagentsDir)) {
          if (!children.includes(dir)) {
            children.push(dir);
          }
        }
      } catch {
        /* noop */
      }
    }

    // 3. Sesiones de tipo delegate (guardadas directamente en userDir/sessions/)
    const sessionsDir = join(getUserDir(username), "sessions");
    if (existsSync(sessionsDir)) {
      try {
        for (const dir of readdirSync(sessionsDir)) {
          if (dir.startsWith(SessionPrefix.DELEGATE)) {
            const metaPath = join(sessionsDir, dir, "metadata.json");
            if (existsSync(metaPath)) {
              try {
                const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
                if (meta.parentSessionId === parentSessionId && !children.includes(dir)) {
                  children.push(dir);
                }
              } catch {
                /* noop */
              }
            }
          }
        }
      } catch {
        /* noop */
      }
    }

    return children;
  }

  async destroyAllSessions(username: string): Promise<void> {
    const prefix = `${username}:`;
    const toDestroy = Array.from(this.sessions.entries()).filter(([key]) => key.startsWith(prefix));
    for (const [key, entry] of toDestroy) {
      entry.unsubscribe();
      await entry.session.dispose();
      this.sessions.delete(key);
    }
  }

  async listSessions(username: string, query?: SessionListQuery): Promise<SessionListItem[]> {
    return sessionLister.listSessions(
      username,
      {
        ensureUserDir: (u) => userConfigManager.ensureUserDir(u),
        isSessionActive: (sId) => {
          const session = this.sessions.get(this.getSessionKey(username, sId));
          if (session) {
            return session.session.isStreaming ? "streaming" : "active";
          }
          return "sleeping";
        },
      },
      query,
    );
  }

  getLiveStatuses(username: string): Record<string, "streaming" | "active" | "sleeping"> {
    const result: Record<string, "streaming" | "active" | "sleeping"> = {};
    const prefix = `${username}:`;
    for (const [key, entry] of this.sessions) {
      if (!key.startsWith(prefix)) continue;
      const sessionId = key.slice(prefix.length);
      result[sessionId] = entry.session.isStreaming ? "streaming" : "active";
    }
    return result;
  }

  async getOrCreateSession(
    username: string,
    sessionId: string,
    projectId?: string,
    agentId?: string,
    overrides?: SessionOverrides,
  ): Promise<IAgentRuntime> {
    const key = this.getSessionKey(username, sessionId);
    const existing = this.sessions.get(key);
    if (existing) {
      return existing.session;
    }

    const pending = this.pendingSessions.get(key);
    if (pending) return pending;

    const initPromise = (async () => {
      try {
        const { createAgentRuntime } = await import("./agent-runtime");
        const { session } = await createAgentRuntime({
          username,
          sessionId,
          projectId,
          agentId,
          teamId: overrides?.teamId,
          workspaceDir: overrides?.workspaceDir,
          skipMemory: overrides?.skipMemory,
          skipMcpTools: overrides?.skipMcpTools,
          customTools: overrides?.customTools,
          resourceLoader: overrides?.resourceLoader,
        });

        if (projectId || agentId) {
          this.metadataStore.saveSessionMetadata(username, sessionId, {
            ...(projectId ? { projectId } : {}),
            ...(agentId ? { agentId } : {}),
          });
        }

        const globalLogUnsub = subscribeSessionEvents({
          session,
          username,
          sessionId,
          metadataStore: sessionMetadataStore,
        });

        const unsubscribe = session.on(() => {});

        const entry: UserSessionEntry = {
          session,
          unsubscribe: () => {
            unsubscribe();
            globalLogUnsub();
          },
        };
        this.sessions.set(key, entry);
        return session;
      } finally {
        this.pendingSessions.delete(key);
      }
    })();

    this.pendingSessions.set(key, initPromise);
    return initPromise;
  }

  async autoCleanupSessions(username: string): Promise<void> {
    const retentionDaysStr = process.env.SPACES_SESSION_RETENTION_DAYS;
    const maxCountStr = process.env.SPACES_SESSION_MAX_COUNT;
    if (!retentionDaysStr && !maxCountStr) return;

    try {
      const sessions = await this.listSessions(username, { archived: "true" });
      const activeSessions = await this.listSessions(username, { archived: "false" });
      const allSessions = [...sessions, ...activeSessions];

      const regularSessions = allSessions.filter((s) => !s.isExecution);

      const toDelete = new Set<string>();

      if (retentionDaysStr) {
        const days = parseInt(retentionDaysStr, 10);
        if (!isNaN(days) && days > 0) {
          const cutOffTime = Date.now() - days * 24 * 60 * 60 * 1000;
          for (const s of regularSessions) {
            const updateTime = new Date(s.updatedAt).getTime();
            if (updateTime < cutOffTime) {
              toDelete.add(s.id);
            }
          }
        }
      }

      if (maxCountStr) {
        const maxCount = parseInt(maxCountStr, 10);
        if (!isNaN(maxCount) && maxCount > 0) {
          const sorted = [...regularSessions].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          );
          if (sorted.length > maxCount) {
            const extra = sorted.slice(maxCount);
            for (const s of extra) {
              toDelete.add(s.id);
            }
          }
        }
      }

      for (const sessionId of toDelete) {
        console.log(`[Auto Cleanup] Destroying session ${sessionId} for user ${username}`);
        await this.destroySession(username, sessionId).catch((err) => {
          console.error(`[Auto Cleanup] Failed to destroy session ${sessionId}:`, err);
        });
      }
    } catch (e) {
      console.error(`[Auto Cleanup] Failed for user ${username}:`, e);
    }
  }
}

export const sessionManager = new SessionManager();
