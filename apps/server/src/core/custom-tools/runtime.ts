// SPDX-License-Identifier: MIT
import { AsyncLocalStorage } from "node:async_hooks";
import { type PipelineContext, executePipeline, resolveVariables } from "./pipeline-engine";
import { type CustomToolDefinition } from "./schemas";

export const pipelineExecutionStack = new AsyncLocalStorage<string[]>();

export function createCustomToolRuntime(
  definition: CustomToolDefinition,
  context: PipelineContext,
): any {
  return {
    name: definition.name,
    label: definition.label || definition.name,
    description: definition.description,
    parameters: definition.parameters || {},
    execute: async (
      toolCallId: string,
      params: Record<string, any>,
      signal?: AbortSignal,
      onUpdate?: (partialResult: any) => void,
    ) => {
      const executeDef = definition.execute;
      switch (executeDef.type) {
        case "pipeline": {
          const currentStack = pipelineExecutionStack.getStore() || [];
          if (currentStack.includes(definition.name)) {
            return {
              content: [
                {
                  type: "text",
                  text: `Circular dependency detected: ${currentStack.join(" -> ")} -> ${definition.name}`,
                },
              ],
              isError: true,
            };
          }
          if (currentStack.length >= 5) {
            return {
              content: [{ type: "text", text: `Max pipeline execution depth (5) exceeded` }],
              isError: true,
            };
          }
          const nextStack = [...currentStack, definition.name];

          return pipelineExecutionStack.run(nextStack, async () => {
            const { sessionManager } = await import("../session/session-manager");
            const activeSession = sessionManager.getSession(context.username, context.sessionId);
            if (!activeSession) {
              return {
                content: [{ type: "text", text: `Session ${context.sessionId} is not active` }],
                isError: true,
              };
            }
            const runContext = {
              ...context,
              session: activeSession as any,
            };
            const result = await executePipeline(
              executeDef.steps,
              params,
              runContext,
              executeDef.onError,
              signal,
              (step, total, desc) => {
                onUpdate?.({
                  content: [{ type: "text", text: `Step ${step}/${total}: ${desc}` }],
                  details: { step, total },
                });
              },
              definition.parameters,
            );
            const scope = result.scope || {};
            const resolvedUi = definition.ui ? resolveVariables(definition.ui, scope) : undefined;
            const lastOutput = result.details?.lastOutput ?? "";
            result.content = [
              {
                type: "text",
                text: resolvedUi
                  ? lastOutput || `Pipeline completed — UI rendered for ${definition.name}`
                  : lastOutput || "Pipeline completed successfully",
              },
            ];
            result.details = {
              ...result.details,
              ...(resolvedUi ? { ui: resolvedUi } : {}),
              ...(definition.presentation
                ? { presentation: definition.presentation }
                : { presentation: { defaultExpanded: true, accordionDefaultOpen: true } }),
            };
            delete result.scope;
            return result;
          });
        }

        case "ui":
          return {
            content: [{ type: "text", text: `UI rendered for custom tool ${definition.name}` }],
            details: {
              ui: definition.ui,
              presentation: definition.presentation || {
                defaultExpanded: true,
                accordionDefaultOpen: true,
              },
            },
            isError: false,
          };

        case "agent": {
          const { agentId, taskTemplate, subagentType, captureOutputAs, maxSteps } = executeDef;
          const resolvedTask = resolveVariables(taskTemplate, params);

          const { spawnSubagent } = await import("../session/spawn-subagent");
          const { sessionManager } = await import("../session/session-manager");
          const { delegationRegistry } = await import("../delegation/delegation-registry");

          try {
            const spawnResult = await spawnSubagent({
              toolCallId,
              username: context.username,
              parentSessionId: context.sessionId,
              agentId: agentId ?? undefined,
              task: resolvedTask,
              subagentType: subagentType ?? "builder",
              maxSteps: maxSteps ?? 15,
              sessionManager,
              delegationRegistry: context.delegationRegistry ?? delegationRegistry,
              workspaceDir: context.cwd,
              signal,
            });

            const outputs = spawnResult.outputs ?? {};

            if (captureOutputAs) {
              return {
                content: [{ type: "text", text: spawnResult.executive_summary }],
                details: { capturedAs: captureOutputAs, value: outputs },
                pipelineScopeUpdate: {
                  [captureOutputAs]: spawnResult.executive_summary,
                  ...outputs,
                },
                isError: spawnResult.status === "error",
              };
            }

            return {
              content: [{ type: "text", text: spawnResult.executive_summary }],
              isError: spawnResult.status === "error",
            };
          } catch (err: any) {
            return {
              content: [
                { type: "text", text: `Subagent execution failed: ${err?.message || err}` },
              ],
              isError: true,
            };
          }
        }

        default:
          return {
            content: [
              { type: "text", text: `Unsupported execution mode for tool ${definition.name}` },
            ],
            isError: true,
          };
      }
    },
  };
}
