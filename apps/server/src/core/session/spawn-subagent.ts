// SPDX-License-Identifier: MIT
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { EnvelopeResult, SessionPrefix } from "shared";
import { getAppConfig } from "../../config/app-config";
import type { DelegationRegistry } from "../delegation/delegation-registry";
import { assemblePromptAppends } from "../prompts/prompt-assembly";
import { buildSubagentRules } from "../sandbox";
import { AbortToken } from "./abort-token";
import {
  forwardSubagentEvents,
  getLastAssistantText,
  handleDelegationCompletion,
  parseEnvelope,
} from "./agent-utils";
import { DefaultResourceLoader } from "./resource-loader";
import { getSubagentDepth } from "./session-depth";
import { resolveParentRef } from "./resolve-parent-ref";
import type { SessionManager } from "./session-manager";

export interface SpawnSubagentParams {
  toolCallId: string;
  username: string;
  parentSessionId: string;
  agentId?: string;
  task: string;
  subagentType: "explorer" | "builder" | "autonomous";
  maxSteps?: number;
  sessionManager: SessionManager;
  delegationRegistry: DelegationRegistry;
  workspaceDir: string;
  signal?: AbortSignal;
}

export async function spawnSubagent(params: SpawnSubagentParams): Promise<EnvelopeResult> {
  const {
    toolCallId,
    username,
    parentSessionId,
    task,
    subagentType,
    sessionManager,
    delegationRegistry,
    workspaceDir,
    signal,
  } = params;

  const userSettings = sessionManager.userConfig.getUserSettings(username);
  const appConfig = getAppConfig();
  const maxDepth =
    userSettings.subagentMaxDepth !== undefined
      ? Number(userSettings.subagentMaxDepth)
      : appConfig.subagent.maxDepth;

  const currentDepth = getSubagentDepth(username, parentSessionId);
  const effectiveDepth = currentDepth + 1;

  if (effectiveDepth > maxDepth) {
    throw new Error(
      `Delegation depth limit reached (${maxDepth}). Current depth: ${currentDepth}. Cannot create sub-delegation.`,
    );
  }

  const subagentSessionId = `${SessionPrefix.SUBAGENT}${toolCallId}`;
  const userDir = sessionManager.userConfig.ensureUserDir(username);
  const subagentDir = join(userDir, "sessions", parentSessionId, "subagents", subagentSessionId);
  mkdirSync(subagentDir, { recursive: true });

  const parentMeta =
    sessionManager.metadataStore.getSessionMetadata(username, parentSessionId) || {};
  const parentExecutionMode = parentMeta.executionMode;
  const resolvedSubagentType =
    subagentType || (parentExecutionMode === "autonomous" ? "autonomous" : "builder");

  const effectiveRules = buildSubagentRules(
    username,
    subagentSessionId,
    parentSessionId,
    resolvedSubagentType,
  );

  const derivedExecutionMode =
    resolvedSubagentType === "explorer"
      ? "readonly"
      : resolvedSubagentType === "autonomous"
        ? "autonomous"
        : "standard";

  const parentRef = resolveParentRef(parentMeta);
  const parentEntityType = parentRef.type;
  const parentEntityId: string | null = parentRef.id !== "global" ? parentRef.id : null;

  const metadata = {
    subagentId: subagentSessionId,
    parentSessionId,
    parentEntityType,
    parentEntityId,
    task: task.slice(0, 500),
    subagentRole: null,
    subagentType: resolvedSubagentType,
    permissionRules: effectiveRules,
    executionMode: derivedExecutionMode,
    startedAt: new Date().toISOString(),
    completedAt: null as string | null,
    status: "running",
    isSubagent: true,
    subagentDepth: effectiveDepth,
    teamId: parentMeta.teamId || null,
  };

  writeFileSync(join(subagentDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf-8");

  const { modelRegistry, authStorage } = sessionManager.userConfig.getUserContext(username);

  const parentSession = sessionManager.getSession(username, parentSessionId);
  const baseResourceLoader = (parentSession as any)?.resourceLoader;

  const additionalSkillPaths = baseResourceLoader
    ? baseResourceLoader.getSkills().skills.map((s: any) => s.baseDir)
    : [];
  const systemPrompt = baseResourceLoader ? baseResourceLoader.getSystemPrompt() : "";

  const subResourceLoader = new DefaultResourceLoader({
    cwd: workspaceDir,
    agentDir: userDir,
    additionalSkillPaths,
    loadSkills: true,
    loadAgentsFiles: false,
    appendSystemPrompt: assemblePromptAppends({
      mode: "subagent-spawn",
      workspaceDir,
      subagentTask: task,
      agentsMd: systemPrompt,
    }),
  });
  await subResourceLoader.reload();

  const { sessionToolFactory } = await import("./tool-factory");

  const { customTools: subSessionTools } = sessionToolFactory.createSessionTools({
    username,
    sessionId: subagentSessionId,
    workspaceDir,
    memoryEnabled: false,
    memory: null,
    modelRegistry,
    authStorage,
    resourceLoader: subResourceLoader,
  });

  const subSession = await sessionManager.getOrCreateSession(
    username,
    subagentSessionId,
    undefined,
    undefined,
    {
      resourceLoader: subResourceLoader,
      customTools: subSessionTools,
      workspaceDir,
      skipMcpTools: true,
      skipMemory: true,
    },
  );

  if (parentSession?.model) {
    await subSession.setModel(parentSession.model);
  }

  const childToken = new AbortToken(signal, `spawn:${subagentSessionId}`);
  childToken.register(() => {
    subSession.abort();
    delegationRegistry.abortAllRecursive(subagentSessionId);
  }, `session:${subagentSessionId}`);

  const subagentUnsub = forwardSubagentEvents(
    subSession,
    parentSessionId,
    subagentSessionId,
    toolCallId,
  );

  delegationRegistry.register(
    username,
    parentSessionId,
    {
      toolCallId,
      parentSessionId,
      targetType: "spawn",
      targetLabel: `Subagent (${resolvedSubagentType})`,
      task,
      status: "running",
      startedAt: metadata.startedAt,
      subagentSessionId,
    },
    () => {
      childToken.abortAll();
    },
  );

  let status: "success" | "error" | "blocked" = "success";
  let envelope: EnvelopeResult = {
    status: "success",
    executive_summary: "",
    artifacts: "none",
    risks: "None",
    outputs: {},
  };
  let lastText = "";

  try {
    await subSession.prompt(task);
    lastText = getLastAssistantText(subSession.messages);
    envelope = parseEnvelope(lastText);

    if (signal?.aborted) {
      status = "blocked";
      envelope.status = "blocked";
      envelope.executive_summary = "Subagent execution was aborted by the parent orchestrator.";
    } else {
      status = envelope.status as any;
    }
  } catch (err: any) {
    console.error(`[Subagent Execution Error] ${subagentSessionId}:`, err);
    status = "error";
    envelope = {
      status: "error",
      executive_summary: `Subagent execution failed: ${err.message || err}`,
      artifacts: "none",
      risks: "Execution encountered an error.",
      outputs: {},
    };
  } finally {
    metadata.status = status;
    metadata.completedAt = new Date().toISOString();
    try {
      writeFileSync(join(subagentDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to write subagent metadata.json", e);
    }

    subagentUnsub();
    childToken.abortAll();

    await handleDelegationCompletion({
      username,
      parentSessionId,
      toolCallId,
      status,
      envelope,
      subagentSessionId,
      toolName: "spawn_subagent",
      lastText,
    });
  }

  return envelope;
}
