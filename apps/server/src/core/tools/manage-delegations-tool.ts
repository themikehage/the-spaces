import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createProgrammaticSessionSync } from "../../auth/onboarding";
import {
  AuthStorage,
  ModelRegistry,
  DefaultResourceLoader,
  createBashToolDefinition,
} from "../../ai";
import { createUiTools } from "./ui-tools";
import { sessionManager } from "../session-manager";
import { filterSecretsFromOutput } from "../bash-output-filter";
import { assemblePromptAppends, wrapDelegationTask } from "../prompts/prompt-assembly";
import { SessionPrefix } from "shared";
import {
  parseEnvelope,
  forwardSubagentEvents,
  forwardChannelEvents,
  getLastAssistantText,
  handleDelegationCompletion,
} from "../agent-utils";
import { delegationRegistry } from "../delegation-registry";
import { AbortToken } from "../abort-token";
import { getAppConfig } from "../../config/app-config";
import { getSubagentDepth } from "../session/session-depth";
import { buildSubagentRules } from "../sandbox";
import { agentRegistry } from "../../agents";

export interface ManageDelegationsOptions {
  workspaceDir: string;
  username: string;
  parentSessionId: string;
  modelRegistry: ModelRegistry;
  authStorage: AuthStorage;
  resourceLoader: DefaultResourceLoader;
  inheritedWorkspaceDir?: string;
  permittedAgentIds?: Set<string>;
  parentModel?: any;
}

export function createManageDelegationsTool(opts: ManageDelegationsOptions) {
  const {
    workspaceDir,
    username,
    parentSessionId,
    modelRegistry,
    authStorage,
    resourceLoader,
    inheritedWorkspaceDir,
    permittedAgentIds,
    parentModel,
  } = opts;

  return {
    name: "manage_delegations",
    description: `Manage delegations to subagents or targets (agents, projects, teams, sessions).
Use 'spawn' to run an isolated, fresh subagent session.
Use 'delegate' to delegate to a specific target.`,
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["spawn", "delegate"],
          description: "Whether to spawn an isolated subagent or delegate a task to a specific target.",
        },
        targetType: {
          type: "string",
          enum: ["agent", "project", "team", "session"],
          description: "Required when action is 'delegate'. The type of target.",
        },
        targetId: {
          type: "string",
          description: "Required when action is 'delegate'. The ID/name of the target agent, project, team, or session.",
        },
        task: {
          type: "string",
          description: "The complete, detailed instructions for the subagent or delegate target.",
        },
        subagentRole: {
          type: "string",
          description: "Optional system prompt prefix for the spawned subagent.",
        },
        subagentType: {
          type: "string",
          enum: ["explorer", "builder", "autonomous"],
          description: "Optional execution mode for subagent. explorer is read-only, builder requires confirmation, autonomous runs autonomously. Defaults to builder.",
        },
        maxSteps: {
          type: "number",
          description: "Maximum steps for the subagent loop. Defaults to 15.",
        },
        includeFullHistory: {
          type: "boolean",
          description: "For delegation: if true, appends the full sub-session conversation history to the parent. Defaults to false.",
        },
        model: {
          type: "string",
          description: "Optional explicit model ID to use.",
        },
        autonomyMode: {
          type: "string",
          enum: ["read-only", "standard", "autonomous"],
          description: "Optional explicit autonomy mode.",
        },
      },
      required: ["action", "task"],
    },
    execute: async (toolCallId: string, args: any, parentSignal?: AbortSignal) => {
      const { action, task, targetType, targetId } = args;

      const userSettings = sessionManager.userConfig.getUserSettings(username);
      const appConfig = getAppConfig();
      const maxDepth = userSettings.subagentMaxDepth !== undefined
        ? Number(userSettings.subagentMaxDepth)
        : appConfig.subagent.maxDepth;

      const currentDepth = getSubagentDepth(username, parentSessionId);
      const effectiveDepth = (action === "delegate" && targetType === "team") ? currentDepth : currentDepth + 1;

      if (effectiveDepth > maxDepth) {
        throw new Error(
          `Delegation depth limit reached (${maxDepth}). Current depth: ${currentDepth}. Cannot create sub-delegation.`
        );
      }

      if (action === "spawn") {
        const subagentSessionId = `${SessionPrefix.SUBAGENT}${toolCallId}`;
        const userDir = sessionManager.userConfig.ensureUserDir(username);
        const subagentDir = join(userDir, "sessions", parentSessionId, "subagents", subagentSessionId);
        mkdirSync(subagentDir, { recursive: true });

        const parentMeta = sessionManager.metadataStore.getSessionMetadata(username, parentSessionId) || {};
        const parentExecutionMode = parentMeta.executionMode;
        const resolvedSubagentType = args.subagentType || (parentExecutionMode === "autonomous" ? "autonomous" : "builder");

        const effectiveRules = buildSubagentRules(
          username,
          subagentSessionId,
          parentSessionId,
          resolvedSubagentType
        );

        const derivedExecutionMode =
          resolvedSubagentType === "explorer" ? "readonly"
          : resolvedSubagentType === "autonomous" ? "autonomous"
          : "standard";

        let parentEntityType = "global";
        let parentEntityId: string | null = null;
        if (parentMeta.channelId) {
          parentEntityType = "channel";
          parentEntityId = parentMeta.channelId;
        } else if (parentMeta.agentId) {
          parentEntityType = "agent";
          parentEntityId = parentMeta.agentId;
        } else if (parentMeta.projectId || parentMeta.projectName) {
          parentEntityType = "project";
          parentEntityId = parentMeta.projectId || parentMeta.projectName;
        }

        const metadata = {
          subagentId: subagentSessionId,
          parentSessionId,
          parentEntityType,
          parentEntityId,
          task: task.slice(0, 500),
          subagentRole: args.subagentRole || null,
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

        const customBashTool = createBashToolDefinition(workspaceDir, {
          spawnHook: (context) => {
            const userEnv = sessionManager.userConfig.getUserEnv(username);
            const token = createProgrammaticSessionSync(username);
            return {
              ...context,
              env: {
                ...context.env,
                ...userEnv,
                TOKEN: token,
                JWT_TOKEN: token,
              },
            };
          },
          outputFilter: (output: string) => {
            const userEnv = sessionManager.userConfig.getUserEnv(username);
            const secrets = Object.values(userEnv).filter(Boolean);
            return filterSecretsFromOutput(output, secrets);
          },
        });

        const uiTools = createUiTools(workspaceDir, username);

        const subResourceLoader = new DefaultResourceLoader({
          cwd: workspaceDir,
          agentDir: userDir,
          additionalSkillPaths: resourceLoader.getSkills().skills.map((s: any) => s.baseDir),
          loadSkills: true,
          loadAgentsFiles: false,
          appendSystemPrompt: assemblePromptAppends({
            mode: "subagent-spawn",
            workspaceDir,
            subagentTask: task,
            subagentRole: args.subagentRole,
            agentsMd: resourceLoader.getSystemPrompt(),
          }),
        });
        await subResourceLoader.reload();

        const subSession = await sessionManager.getOrCreateSession(
          username,
          subagentSessionId,
          undefined,
          undefined,
          undefined,
          {
            resourceLoader: subResourceLoader,
            customTools: [customBashTool as any, ...uiTools as any],
            workspaceDir,
            skipMcpTools: true,
            skipMemory: true,
          }
        );

        const parentSession = sessionManager.getSession(username, parentSessionId);
        if (parentSession?.model) {
          await subSession.setModel(parentSession.model);
        }

        const childToken = new AbortToken(parentSignal, `spawn:${subagentSessionId}`);
        childToken.register(
          () => {
            subSession.abort();
            delegationRegistry.abortAllRecursive(subagentSessionId);
          },
          `session:${subagentSessionId}`
        );

        const subagentUnsub = forwardSubagentEvents(subSession, parentSessionId, subagentSessionId, toolCallId);

        delegationRegistry.register(
          username,
          parentSessionId,
          {
            toolCallId,
            parentSessionId,
            targetType: "spawn",
            targetLabel: `Subagent (${args.subagentRole || "executor"})`,
            task,
            status: "running",
            startedAt: metadata.startedAt,
            subagentSessionId,
          },
          () => {
            childToken.abortAll();
          }
        );

        subSession.prompt(task)
          .then(async () => {
            let status = "success" as const;
            const lastText = getLastAssistantText(subSession.messages);
            const envelope = parseEnvelope(lastText);

            if (parentSignal?.aborted) {
              status = "blocked";
              envelope.status = "blocked";
              envelope.executive_summary = "Subagent execution was aborted by the parent orchestrator.";
            } else {
              status = envelope.status as any;
            }

            metadata.status = status;
            metadata.completedAt = new Date().toISOString();
            try {
              writeFileSync(join(subagentDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf-8");
            } catch (e) {
              console.error("Failed to write subagent metadata.json", e);
            }

            await handleDelegationCompletion({
              username,
              parentSessionId,
              toolCallId,
              status,
              envelope,
              subagentSessionId,
              toolName: "manage_delegations",
              lastText,
            });
          })
          .catch(async (err) => {
            console.error(`[Subagent Execution Error] ${subagentSessionId}:`, err);
            const envelope = {
              status: "error" as const,
              executive_summary: `Subagent execution failed: ${err.message || err}`,
              artifacts: "none",
              risks: "Execution encountered an error.",
            };

            metadata.status = "error";
            metadata.completedAt = new Date().toISOString();
            try {
              writeFileSync(join(subagentDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf-8");
            } catch (e) {}

            await handleDelegationCompletion({
              username,
              parentSessionId,
              toolCallId,
              status: "error",
              envelope,
              subagentSessionId,
              toolName: "manage_delegations",
            });
          })
          .finally(() => {
            subagentUnsub();
            childToken.abortAll();
          });

        return {
          content: [{ type: "text", text: `Subagent delegation started. Subagent session ID: ${subagentSessionId}` }],
          details: { status: "delegated", subagentSessionId, task },
          terminate: true,
        };
      } else if (action === "delegate") {
        if (!targetType || !targetId) {
          throw new Error("Parameters 'targetType' and 'targetId' are required when action is 'delegate'.");
        }

        if (targetType === "agent" && permittedAgentIds && !permittedAgentIds.has(targetId)) {
          throw new Error(
            `Agent "${targetId}" is not a permitted delegate in this Team context. Allowed targets: ${[...permittedAgentIds].join(", ")}`
          );
        }

        const delegateSessionId = `${SessionPrefix.DELEGATE}${toolCallId}`;
        const childToken = new AbortToken(parentSignal, `delegate:${delegateSessionId}`);

        const parentMeta = sessionManager.metadataStore.getSessionMetadata(username, parentSessionId) || {};
        const resolvedExecutionMode = args.autonomyMode || parentMeta.executionMode || undefined;

        sessionManager.metadataStore.saveSessionMetadata(username, delegateSessionId, {
          name: `Delegation: ${targetType} - ${targetId}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          parentSessionId,
          targetType,
          targetId,
          task: task.slice(0, 500),
          subagentDepth: effectiveDepth,
          executionMode: resolvedExecutionMode,
          teamId: parentMeta.teamId || null,
        });

        const runPromise = async () => {
          let status = "success" as const;
          let executionResultText = "";
          let parsedEnvelope: any = null;
          let lastText = "";

          try {
            if (targetType === "agent") {
              const entry = agentRegistry.get(targetId, username);
              if (!entry) {
                throw new Error(`Programmatic Agent "${targetId}" not found for user "${username}"`);
              }

              const session = await sessionManager.getOrCreateSession(
                username,
                delegateSessionId,
                undefined,
                targetId,
                undefined,
                { workspaceDir: inheritedWorkspaceDir || workspaceDir }
              );

              let resolvedModel = parentModel || null;
              if (!resolvedModel) {
                try {
                  const parentSession = sessionManager.getSession(username, parentSessionId);
                  if (parentSession?.model) {
                    resolvedModel = parentSession.model;
                  }
                } catch {}
              }

              if (args.model) {
                try {
                  const { modelRegistry: userModelReg } = sessionManager.userConfig.getUserContext(username);
                  userModelReg.refresh();
                  const found = userModelReg
                    .getAvailable()
                    .find((m: any) => m.id === args.model || `${m.provider}/${m.id}` === args.model || m.name === args.model);
                  if (found) {
                    resolvedModel = found;
                  }
                } catch (e) {
                  console.error("[Delegate Action] Failed to resolve custom model:", e);
                }
              }

              if (resolvedModel) {
                try {
                  await session.setModel(resolvedModel);
                } catch (e) {
                  console.error(`[Delegate Action] Failed to set model on delegate session ${delegateSessionId}:`, e);
                }
              }

              childToken.register(() => {
                session.abort();
                delegationRegistry.abortAllRecursive(delegateSessionId);
              }, `agent:${targetId}`);

              const unsub = forwardSubagentEvents(session, parentSessionId, delegateSessionId, toolCallId);

              try {
                await session.prompt(wrapDelegationTask(task, targetType));
              } finally {
                unsub?.();
              }

              lastText = getLastAssistantText(session.messages);
              parsedEnvelope = parseEnvelope(lastText);
              if (args.includeFullHistory) {
                executionResultText = session.messages
                  .map((m: any) => `[${m.role.toUpperCase()}]: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`)
                  .join("\n\n")
                  .slice(0, 4000);
              }

            } else if (targetType === "project") {
              const session = await sessionManager.getOrCreateSession(
                username,
                delegateSessionId,
                targetId
              );

              let resolvedModel = parentModel || null;
              if (!resolvedModel) {
                try {
                  const parentSession = sessionManager.getSession(username, parentSessionId);
                  if (parentSession?.model) {
                    resolvedModel = parentSession.model;
                  }
                } catch {}
              }

              if (args.model) {
                try {
                  const { modelRegistry: userModelReg } = sessionManager.userConfig.getUserContext(username);
                  userModelReg.refresh();
                  const found = userModelReg
                    .getAvailable()
                    .find((m: any) => m.id === args.model || `${m.provider}/${m.id}` === args.model || m.name === args.model);
                  if (found) {
                    resolvedModel = found;
                  }
                } catch (e) {
                  console.error("[Delegate Action] Failed to resolve custom model:", e);
                }
              }

              if (resolvedModel) {
                try {
                  await session.setModel(resolvedModel);
                } catch (e) {
                  console.error(`[Delegate Action] Failed to set model on delegate session ${delegateSessionId}:`, e);
                }
              }

              childToken.register(() => {
                session.abort();
                delegationRegistry.abortAllRecursive(delegateSessionId);
              }, `project:${targetId}`);

              const unsub = forwardSubagentEvents(session, parentSessionId, delegateSessionId, toolCallId);

              try {
                await session.prompt(wrapDelegationTask(task, targetType));
              } finally {
                unsub?.();
              }

              lastText = getLastAssistantText(session.messages);
              parsedEnvelope = parseEnvelope(lastText);
              if (args.includeFullHistory) {
                executionResultText = session.messages
                  .map((m: any) => `[${m.role.toUpperCase()}]: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`)
                  .join("\n\n")
                  .slice(0, 4000);
              }

            } else if (targetType === "team") {
              const { teamStore } = await import("../../teams/team-store");
              const { teamOrchestrator } = await import("../../teams/team-orchestrator");

              const team = teamStore.getTeam(username, targetId);
              if (!team) {
                throw new Error(`Team "${targetId}" not found for user "${username}"`);
              }

              childToken.register(() => {
                teamOrchestrator.abortDispatch(username, targetId, delegateSessionId);
                delegationRegistry.abortAllRecursive(delegateSessionId);
              }, `team:${targetId}`);

              const unsub = forwardChannelEvents(targetId, parentSessionId, delegateSessionId, toolCallId);

              try {
                await teamOrchestrator.dispatchUserMessage(username, targetId, task, delegateSessionId);
              } finally {
                unsub();
              }

              const teamMessages = teamStore.getMessages(username, targetId, 100, delegateSessionId);
              const lastAgentMsg = [...teamMessages].reverse().find(m => m.role === "agent");
              lastText = lastAgentMsg?.content || "";

              parsedEnvelope = parseEnvelope(lastText);
              if (args.includeFullHistory) {
                executionResultText = teamMessages
                  .map(m => `[${m.role === "agent" ? m.agentName || "Agent" : "User"}]: ${m.content}`)
                  .join("\n\n")
                  .slice(0, 4000);
              }

            } else if (targetType === "session") {
              const session = await sessionManager.getOrCreateSession(username, targetId);

              childToken.register(() => {
                session.abort();
                delegationRegistry.abortAllRecursive(targetId);
              }, `session:${targetId}`);

              const unsub = forwardSubagentEvents(session, parentSessionId, targetId, toolCallId);

              try {
                await session.prompt(wrapDelegationTask(task, targetType));
              } finally {
                unsub?.();
              }

              lastText = getLastAssistantText(session.messages);
              parsedEnvelope = parseEnvelope(lastText);
              if (args.includeFullHistory) {
                executionResultText = session.messages
                  .map((m: any) => `[${m.role.toUpperCase()}]: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`)
                  .join("\n\n")
                  .slice(0, 4000);
              }
            } else {
              throw new Error(`Unsupported target type: ${targetType}`);
            }
          } catch (err: any) {
            status = "error";
            parsedEnvelope = {
              status: "blocked",
              executive_summary: `Delegation execution failed: ${err.message || err}`,
              artifacts: "none",
              risks: "Execution encountered an error.",
            };
          } finally {
            childToken.abortAll();
          }

          if (parentSignal?.aborted) {
            status = "blocked";
            parsedEnvelope = {
              status: "blocked",
              executive_summary: "Delegation execution was aborted by the parent orchestrator.",
              artifacts: "none",
              risks: "Execution aborted.",
            };
          }

          await handleDelegationCompletion({
            username,
            parentSessionId,
            toolCallId,
            status,
            envelope: parsedEnvelope,
            subagentSessionId: delegateSessionId,
            toolName: "manage_delegations",
            lastText,
            includeFullHistory: args.includeFullHistory,
            executionResultText,
          });
        };

        delegationRegistry.register(
          username,
          parentSessionId,
          {
            toolCallId,
            parentSessionId,
            targetType: "delegate",
            targetLabel: `Delegated Task (${targetType}: ${targetId})`,
            task,
            status: "running",
            startedAt: new Date().toISOString(),
            subagentSessionId: delegateSessionId,
          },
          () => {
            childToken.abortAll();
          }
        );

        runPromise().catch((err) => {
          console.error(`[Delegate Async Error] toolCallId=${toolCallId}:`, err);
        });

        return {
          content: [{ type: "text", text: `Delegation started for target ${targetType}:${targetId}. Session ID: ${delegateSessionId}` }],
          details: { status: "delegated", subagentSessionId: delegateSessionId, task },
          terminate: true,
        };
      } else {
        throw new Error(`Unsupported manage_delegations action: ${action}`);
      }
    },
  };
}
