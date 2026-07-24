// SPDX-License-Identifier: MIT
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SessionPrefix } from "shared";
import type { AgentSession } from "../../ai";
import { buildSubagentRules, evaluateSubagentRules } from "../sandbox";
import { memoryRegistry } from "../memory/registry";
import { createAgentRuntime, type AgentRuntimeConfig, type AgentRuntimeInstance } from "./agent-runtime";
import { attachSessionMcpTools } from "./mcp-attach";
import { sessionMetadataStore } from "./metadata-store";
import { enrichSessionWithMemory } from "./session-memory-enricher";
import { resolveActiveTools } from "./tool-activation-engine";

export type SessionBootstrapProfile = "user-session" | "agent-server" | "subagent" | "delegate";

export interface SessionBootstrapConfig extends AgentRuntimeConfig {
  profile?: SessionBootstrapProfile;
  parentSessionId?: string;
  subagentType?: string;
  skipMcpTools?: boolean;
}

export interface BootstrappedSession {
  session: AgentSession;
  runtime: AgentRuntimeInstance;
  memory: any;
}

export async function bootstrapAgentSession(
  config: SessionBootstrapConfig,
): Promise<BootstrappedSession> {
  const {
    username,
    sessionId,
    agentId,
    profile = sessionId.startsWith(SessionPrefix.SUBAGENT) ||
    sessionId.startsWith(SessionPrefix.DELEGATE)
      ? "subagent"
      : "user-session",
    skipMemory = false,
    skipMcpTools = false,
    parentSessionId,
    subagentType,
  } = config;

  const runtimeProfile =
    profile === "agent-server"
      ? "agent-server"
      : profile === "subagent" || profile === "delegate"
        ? "subagent"
        : "user-session";

  const runtime = await createAgentRuntime({
    ...config,
    toolProfile: runtimeProfile,
  });

  const { session, context } = runtime;

  const memoryKey =
    profile === "agent-server" ? `agent:${agentId || sessionId}` : `session:${sessionId}`;

  const memory = await memoryRegistry.get(
    memoryKey,
    context.memoryDbPath,
    context.memoryEnabled,
  );

  const isSubagent =
    profile === "subagent" ||
    profile === "delegate" ||
    sessionId.startsWith(SessionPrefix.SUBAGENT) ||
    sessionId.startsWith(SessionPrefix.DELEGATE);

  let existingParentId = parentSessionId;
  let existingSubagentType = subagentType;

  if (isSubagent && (!existingParentId || !existingSubagentType)) {
    const metadataPath = join(context.sessionDir, "metadata.json");
    if (existsSync(metadataPath)) {
      try {
        const meta = JSON.parse(readFileSync(metadataPath, "utf-8"));
        if (!existingParentId) existingParentId = meta.parentSessionId;
        if (!existingSubagentType) existingSubagentType = meta.subagentType;
      } catch {}
    }
  }

  const systemTools = sessionMetadataStore.getSessionTools(username, sessionId);
  const combinedTools = resolveActiveTools({
    sessionTools: systemTools,
    hasExaKey: !!(context.userEnv.EXA_API_KEY || process.env.EXA_API_KEY),
    memoryEnabled: context.memoryEnabled,
    resolvedAgentId: agentId,
    toolOverrides: config.toolOverrides,
  });

  let finalTools = combinedTools;
  if (isSubagent) {
    const effectiveRules = buildSubagentRules(
      username,
      sessionId,
      existingParentId,
      existingSubagentType,
    );
    finalTools = combinedTools.filter((toolName) => {
      const verdict = evaluateSubagentRules(toolName, {}, effectiveRules);
      return !(verdict && verdict.allow === false);
    });
  }

  session.setActiveToolsByName(finalTools);

  if (!skipMemory) {
    enrichSessionWithMemory(session, memory);
  }

  if (!skipMcpTools) {
    const mcpKey = profile === "agent-server" ? (agentId || sessionId) : sessionId;
    await attachSessionMcpTools(session, username, mcpKey);
  }

  return {
    session,
    runtime,
    memory,
  };
}
