// SPDX-License-Identifier: MIT
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { AVAILABLE_TOOLS, type AutonomyMode, getSessionDir } from "shared";

export interface TeamConfigReader {
  getTeamType(username: string, teamId: string): string | null;
}

export class SessionMetadataStore {
  private teamReader?: TeamConfigReader;
  private sessionDirResolver?: (username: string, sessionId: string) => string | null;

  setTeamReader(reader: TeamConfigReader): void {
    this.teamReader = reader;
  }

  setSessionDirResolver(resolver: (username: string, sessionId: string) => string | null): void {
    this.sessionDirResolver = resolver;
  }

  private getMetadataPath(username: string, sessionId: string): string {
    const sessionDir =
      this.sessionDirResolver?.(username, sessionId) ?? getSessionDir(username, sessionId);
    return join(sessionDir, "metadata.json");
  }

  ensureSessionDir(username: string, sessionId: string): string {
    const sessionDir =
      this.sessionDirResolver?.(username, sessionId) ?? getSessionDir(username, sessionId);
    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true });
    }
    return sessionDir;
  }

  saveSessionMetadata(username: string, sessionId: string, data: Record<string, unknown>): void {
    const metadataPath = this.getMetadataPath(username, sessionId);
    const sessionDir = dirname(metadataPath);
    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true });
    }
    let metadata: Record<string, unknown> = {};
    if (existsSync(metadataPath)) {
      try {
        metadata = JSON.parse(readFileSync(metadataPath, "utf-8"));
      } catch {
        /* noop */
      }
    }
    Object.assign(metadata, data);
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");
  }

  persistSessionMetadata(username: string, sessionId: string, data: Record<string, unknown>): void {
    this.saveSessionMetadata(username, sessionId, data);
  }

  getSessionMetadata(username: string, sessionId: string): Record<string, any> | null {
    const metadataPath = this.getMetadataPath(username, sessionId);
    if (existsSync(metadataPath)) {
      try {
        return JSON.parse(readFileSync(metadataPath, "utf-8"));
      } catch {
        /* noop */
      }
    }
    return null;
  }

  persistSessionTools(username: string, sessionId: string, tools: string[]): void {
    const metadataPath = this.getMetadataPath(username, sessionId);
    let metadata: Record<string, unknown> = {};
    if (existsSync(metadataPath)) {
      try {
        metadata = JSON.parse(readFileSync(metadataPath, "utf-8"));
      } catch {
        /* noop */
      }
    }
    metadata.tools = tools;
    this.saveSessionMetadata(username, sessionId, metadata);
  }

  getSessionTools(username: string, sessionId: string): string[] {
    const metadataPath = this.getMetadataPath(username, sessionId);
    const fallbackTools = () => {
      const metadata = this.getSessionMetadata(username, sessionId);
      if (metadata && metadata.teamId) {
        try {
          const teamType = this.teamReader?.getTeamType(username, metadata.teamId);
          if (teamType === "Negotiation") {
            return ["read", "grep", "find", "ls"];
          }
        } catch {
          /* noop */
        }
      }
      return [...AVAILABLE_TOOLS];
    };

    if (!existsSync(metadataPath)) return fallbackTools();
    try {
      const metadata = JSON.parse(readFileSync(metadataPath, "utf-8"));
      let tools: string[] = Array.isArray(metadata.tools) ? metadata.tools : fallbackTools();
      let needsPersist = false;

      // Migrate legacy tool names
      const legacyTaskTools = ["decompose_tasks", "update_task_status", "complete_task_list"];
      const legacyMemTools = ["memory_store", "memory_recall", "memory_forget"];
      const removedTools = ["manage_pipelines", "run_pipeline"];

      const updatedTools = new Set<string>();
      for (const t of tools) {
        if (removedTools.includes(t)) {
          needsPersist = true;
          continue;
        }
        if (legacyTaskTools.includes(t)) {
          updatedTools.add("task");
          needsPersist = true;
        } else if (legacyMemTools.includes(t)) {
          updatedTools.add("memory");
          needsPersist = true;
        } else {
          updatedTools.add(t);
        }
      }

      tools = Array.from(updatedTools);
      if (needsPersist) {
        this.persistSessionTools(username, sessionId, tools);
      }
      return tools;
    } catch {
      return fallbackTools();
    }
  }

  setAutonomyMode(username: string, sessionId: string, mode: AutonomyMode): void {
    this.saveSessionMetadata(username, sessionId, { autonomyMode: mode, executionMode: mode });
  }

  setExecutionMode(username: string, sessionId: string, mode: AutonomyMode): void {
    this.setAutonomyMode(username, sessionId, mode);
  }

  getAutonomyMode(username: string, sessionId: string): AutonomyMode | undefined {
    const metadata = this.getSessionMetadata(username, sessionId);
    if (metadata) {
      const mode = metadata.autonomyMode ?? metadata.executionMode;
      if (mode === "readonly" || mode === "standard" || mode === "autonomous") {
        return mode;
      }
      if (metadata.teamId) {
        try {
          const teamType = this.teamReader?.getTeamType(username, metadata.teamId);
          if (teamType === "Negotiation") {
            return "readonly";
          }
        } catch {
          /* noop */
        }
      }
    }
    return undefined;
  }

  getExecutionMode(username: string, sessionId: string): AutonomyMode | undefined {
    return this.getAutonomyMode(username, sessionId);
  }

  computeAndPersistMetrics(username: string, sessionId: string, session: any): void {
    const metadata = this.getSessionMetadata(username, sessionId) || {};
    const createdAt = metadata.createdAt ? new Date(metadata.createdAt) : new Date();
    const durationMs = Date.now() - createdAt.getTime();

    let totalTokensIn = 0;
    let totalTokensOut = 0;
    const msgs = session.messages || [];
    for (const msg of msgs) {
      if (msg.usage) {
        totalTokensIn += msg.usage.input || msg.usage.promptTokens || msg.usage.prompt_tokens || 0;
        totalTokensOut +=
          msg.usage.output || msg.usage.completionTokens || msg.usage.completion_tokens || 0;
      }
    }
    const totalTokens = totalTokensIn + totalTokensOut;

    let messageCount = 0;
    for (const msg of msgs) {
      if (msg.role === "user" || msg.role === "assistant" || msg.role === "system") {
        messageCount++;
      }
    }

    let toolCallCount = 0;
    const toolCallsByTool: Record<string, number> = {};
    for (const msg of msgs) {
      if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === "toolCall" && block.name) {
            toolCallCount++;
            toolCallsByTool[block.name] = (toolCallsByTool[block.name] || 0) + 1;
          }
        }
      }
    }

    let errorCount = 0;
    let lastError: string | null = null;
    const errorsByTool: Record<string, number> = {};

    for (const msg of msgs) {
      if (msg.role === "assistant" && msg.stopReason === "error") {
        errorCount++;
        lastError = msg.errorMessage || "API error response";
      }
      if (msg.role === "toolResult" && msg.isError) {
        errorCount++;
        if (msg.toolName) {
          errorsByTool[msg.toolName] = (errorsByTool[msg.toolName] || 0) + 1;
        }
      }
    }

    const modelId = session.model ? `${session.model.provider}/${session.model.id}` : "unknown";

    this.saveSessionMetadata(username, sessionId, {
      totalTokensIn,
      totalTokensOut,
      totalTokens,
      toolCallCount,
      toolCallsByTool,
      durationMs,
      modelId,
      messageCount,
      errorCount,
      lastError,
      errorsByTool,
      updatedAt: new Date().toISOString(),
    });
  }
}

export const sessionMetadataStore = new SessionMetadataStore();
