import { TaskStateManager } from "../tools/task-state-manager";
import { SessionPrefix } from "shared";
import { promptComposer } from "../prompts/composer";
import { assemblePromptAppends } from "../prompts/prompt-assembly";
import { CUSTOM_TOOL_INSTRUCTIONS } from "../custom-tools";
import { resolveProjectDir } from "./workspace-resolver";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface BuildPromptsParams {
  username: string;
  sessionId: string;
  workspaceDir: string;
  sessionDir: string;
  resolvedAgentId?: string;
  agentDef?: { name: string; role: string; systemPrompt: string };
  cachedMcpToolNames: string[];
  experimentId?: string;
  projectId?: string;
}

export class SessionPromptBuilder {
  async buildSystemPrompts(params: BuildPromptsParams): Promise<string[]> {
    const {
      username,
      sessionId,
      workspaceDir,
      sessionDir,
      resolvedAgentId,
      agentDef,
      cachedMcpToolNames,
      experimentId,
    } = params;

    const { sessionManager } = await import("../session-manager");
    const settings = sessionManager.userConfig.getUserSettings(username);

    const appendPrompts = assemblePromptAppends({
      mode: "standard-session",
      workspaceDir,
    });

    if (!agentDef && settings.factorySystemPrompt) {
      appendPrompts.push(`\n\n## Custom Spaces Instructions:\n${settings.factorySystemPrompt}`);
    }

    if (sessionId.startsWith(SessionPrefix.DELEGATE)) {
      appendPrompts.push(
        `\n\n## Delegated Task Mode\n` +
        `You are executing a delegated task. Perform the task directly and output a structured result envelope at the very end of your response.\n` +
        `Return the result envelope exactly in this format as your last message:\n` +
        `---\n` +
        `status: success | partial | blocked\n` +
        `executive_summary: <1-3 sentences summarizing what was accomplished>\n` +
        `artifacts: <comma-separated list of files created/modified, or "none">\n` +
        `risks: <any risks found, or "None">\n` +
        `---`
      );
    }

    if (params.projectId) {
      try {
        const projectDir = resolveProjectDir(username, params.projectId);
        if (projectDir) {
          const projectJsonPath = join(projectDir, "project.json");
          if (existsSync(projectJsonPath)) {
            const projectMeta = JSON.parse(readFileSync(projectJsonPath, "utf-8"));
            const { getPreviewState } = await import("../preview-watcher");
            const previewState = getPreviewState(username, projectMeta.name);
            const previewUrl = `/api/preview/${encodeURIComponent(username)}/${encodeURIComponent(projectMeta.name)}/index.html`;

            appendPrompts.push(
              `\n\n## Project Context\n` +
              `You are working inside a project workspace. Here is the project metadata:\n` +
              `- **Project ID**: ${projectMeta.id}\n` +
              `- **Project Name**: ${projectMeta.name}\n` +
              `- **Workspace Path**: ${join(projectDir, "workspace")}\n` +
              (projectMeta.cloneUrl ? `- **Clone URL**: ${projectMeta.cloneUrl}\n` : "") +
              `\nAll your file operations are sandboxed to the workspace path above. Do NOT attempt to navigate outside it with relative paths like \`..\`.\n\n` +
              `## Project Preview & Build Capabilities\n` +
              `This workspace has an integrated real-time preview server and build watcher.\n` +
              `Current Preview Configuration:\n` +
              `- **Framework Preset**: ${previewState.config?.framework || "auto"}\n` +
              `- **Build Command**: ${previewState.config?.buildCommand || "None (or npm run build auto-fallback)"}\n` +
              `- **Output Directory**: ${previewState.config?.outputDir || "dist"}\n` +
              `- **Status**: ${previewState.status} (distExists: ${previewState.distExists}, indexHtmlExists: ${previewState.indexHtmlExists})\n` +
              `- **Preview URL**: ${previewUrl}\n\n` +
              `You have a dedicated tool to interact with the preview system: \`manage_preview\` (supporting actions 'status', 'configure', 'build', and 'abort').\n` +
              `Always run a build using \`manage_preview(action: "build")\` rather than manual bash scripts when you modify frontend assets (e.g. React/Vite/Next.js/Astro) so that the user's browser updates in real time, and logs are displayed in the workspace UI.`
            );

            if (projectMeta.assignment) {
              const { assignment } = projectMeta;
              if (assignment.leaderId) {
                try {
                  const { agentRegistry } = await import("../../agents");
                  const leaderEntry = agentRegistry.get(assignment.leaderId, username);
                  if (leaderEntry?.server.definition.systemPrompt) {
                    appendPrompts.push(
                      `\n\n## Project Lead Agent Persona & Directives\n` +
                      `This project has an assigned Lead Agent (${leaderEntry.server.definition.name || assignment.leaderId}). Incorporate the following lead instructions into your reasoning and execution:\n\n` +
                      leaderEntry.server.definition.systemPrompt
                    );
                  }
                } catch (err) {
                  console.error("[PromptBuilder] Failed to load leader agent prompt:", err);
                }
              }

              if (Array.isArray(assignment.members) && assignment.members.length > 0) {
                const roster = assignment.members
                  .map((m: { id: string; name: string; role: string }) => `- **${m.name}** (ID: \`${m.id}\`, Role: ${m.role})`)
                  .join("\n");
                appendPrompts.push(
                  `\n\n## Project Assigned Team Roster\n` +
                  `The following team members are assigned to work on this project:\n` +
                  roster
                );
              }
            }
          }
        }
      } catch (e) {
        console.error("[PromptBuilder] Failed to inject project context:", e);
      }
    }

    if (cachedMcpToolNames.length > 0) {
      appendPrompts.push(
        `\n\nModel Context Protocol (MCP) Tools Available:\n` +
        `You have the following custom MCP tools registered and active:\n` +
        `${cachedMcpToolNames.map((name: string) => `- ${name}`).join("\n")}\n` +
        `Use these tools when the task requires interacting with external databases, APIs, searching the web, or product integrations (like Slack, Linear, Jira, Google Drive). Do not assume you need to use bash if a specific MCP tool is more suitable.\n`
      );
    }

    try {
      const { customToolStorage } = await import("../custom-tools/storage");
      const customDefs = customToolStorage.loadAll(username).filter((d: any) => d.enabled !== false);
      if (customDefs.length > 0) {
        appendPrompts.push(
          `\n\n## Custom Tools Available (User-Created):\n` +
          `You have ${customDefs.length} custom tool(s) registered and active for this user:\n` +
          `${customDefs.map((t: any) => `- ${t.name}: ${t.description}`).join("\n")}\n` +
          `These are available as regular tools — invoke them by name like any other tool. Prefer them when the task matches their purpose.\n`
        );
      }
    } catch (e) {
      console.error("[PromptBuilder] Failed to load custom tools for prompt:", e);
    }

    try {
      const meta = sessionManager.metadataStore.getSessionMetadata(username, sessionId);
      let teamId = meta?.teamId;
      if (!teamId && sessionId.startsWith(SessionPrefix.TEAM)) {
        teamId = sessionId.slice(SessionPrefix.TEAM.length);
      }
      if (teamId) {
        const { teamStore } = await import("../../teams/team-store");
        const team = teamStore.getTeam(username, teamId);
        if (team && team.context && team.context.length > 0) {
          const contextSnippet =
            `\n\n## Team Context Variables\n` +
            `The following project-level key-value context has been configured for this team:\n` +
            team.context.map((it: any) => `- ${it.key}: ${it.value}`).join("\n");
          appendPrompts.push(contextSnippet);
        }
      }
    } catch (e) {
      console.error("[PromptBuilder] Failed to inject team context:", e);
    }

    if (agentDef?.systemPrompt) {
      const deployment = await this.resolveDeploymentContext(params);
      const layered = promptComposer.compose(agentDef, deployment, workspaceDir);
      appendPrompts.push(`\n\n${layered.composed}`);
    }

    if (resolvedAgentId === "lab-architect") {
      if (experimentId) {
        try {
          const { ExperimentStore } = await import("../../laboratory/experiment-store");
          const exp = await ExperimentStore.getExperiment(username, experimentId);
          if (exp) {
            const agentsStr = exp.variants.multiWithLeader.agents.map((a: any) =>
              `  * **${a.name}** (id: \`${a.id}\`, role: \`${a.role}\`)${a.leader ? " [LÍDER]" : ""}\n    Prompt: ${a.systemPrompt}`
            ).join("\n");
            appendPrompts.push(
              `\n\n## Experimento Activo (ID: ${experimentId})\n` +
              `Actualmente estás editando el experimento:\n` +
              `- **Nombre:** ${exp.name}\n` +
              `- **Objetivo/Task Prompt:** ${exp.taskPrompt}\n` +
              `- **Criterios de Evaluación:** ${exp.judge.criteria.join(", ")}\n` +
              `- **Agentes Configurados:**\n${agentsStr}\n\n` +
              `Cuando llames a \`create_experiment\` para actualizar este experimento, debes pasarle obligatoriamente su \`experimentId\`: \`"${experimentId}"\`.`
            );
          }
        } catch (e) {
          console.error("Failed to load experiment for prompt builder:", e);
        }
      } else {
        appendPrompts.push(
          `\n\n## Sin Experimento Activo\n` +
          `El usuario está iniciando el diseño de un experimento nuevo. Ayúdalo a diseñar su tripulación de agentes y criterios de evaluación. ` +
          `Una vez definido, llama a \`create_experiment\` omitiendo el parámetro \`experimentId\` (se le generará uno automáticamente).`
        );
      }
    }

    const tasksState = TaskStateManager.getTaskState(sessionDir);
    if (tasksState && tasksState.status === "running") {
      try {
        const activeTask = tasksState.tasks?.find((t: any) => t.id === tasksState.currentTaskId);
        const tasksListStr = tasksState.tasks
          ?.map((t: any) => `- [${t.status === "done" ? "x" : t.status === "running" ? "/" : " "}] ${t.id}: ${t.title}${t.depends_on?.length > 0 ? ` (depends on: ${t.depends_on.join(", ")})` : ""}`)
          .join("\n");

        const promptSnippet =
          `\n\n## Active Task Plan\n` +
          `You are currently executing a structured, dependency-aware task plan to achieve a high-level goal.\n` +
          `Overall Objective: "${tasksState.objective || ""}"\n` +
          `Current Plan Status: ${tasksState.status}\n\n` +
          `Tasks List:\n${tasksListStr}\n\n` +
          `Active Task Details:\n` +
          `- ID: ${tasksState.currentTaskId}\n` +
          `- Title: ${activeTask?.title || "N/A"}\n` +
          `- Instructions: "${activeTask?.prompt || "N/A"}"\n\n` +
          `Guidelines:\n` +
          `1. Focus ONLY on completing the active task: ${tasksState.currentTaskId}. Do not perform actions related to other tasks.\n` +
          `2. When the active task's objective is fully achieved, you MUST call the native tool: \`update_task_status(taskId: "${tasksState.currentTaskId}", status: "done", log: "summary of what was done")\` to mark it as complete. This will automatically update your active instructions in the next turn.\n` +
          `3. If a task fails or you hit an error you cannot resolve, call \`update_task_status(taskId: "${tasksState.currentTaskId}", status: "failed", log: "error reason")\`.\n` +
          `4. When all tasks in the list have been marked as "done", you MUST call \`complete_task_list(summary: "final completion summary")\` to finalize the execution.`;

        appendPrompts.push(promptSnippet);
      } catch (e) {
        console.error("Failed to parse tasks state for prompt injection:", e);
      }
    }

    appendPrompts.push(CUSTOM_TOOL_INSTRUCTIONS);

    return appendPrompts;
  }

  private async resolveDeploymentContext(params: BuildPromptsParams): Promise<any> {
    const { username, sessionId } = params;
    try {
      const { sessionManager } = await import("../session-manager");
      const meta = sessionManager.metadataStore.getSessionMetadata(username, sessionId);

      if (meta?.teamId) {
        const { teamStore } = await import("../../teams/team-store");
        const { agentRegistry } = await import("../../agents");
        const team = teamStore.getTeam(username, meta.teamId);
        const ownerId = params.resolvedAgentId || "";
        if (team?.teamType === "Orchestration" && team.members.some((member) => member.agentId === ownerId && member.role === "lead")) {
          return {
            mode: "orchestration",
            agentRole: "lead",
            members: team.members
              .filter((member) => member.agentId !== ownerId && member.role !== "observer")
              .map((member) => {
                const entry = agentRegistry.get(member.agentId, username);
                const capability = entry?.server.definition.systemPrompt?.replace(/\s+/g, " ").slice(0, 180) || entry?.server.definition.role || member.role;
                return {
                  agentId: member.agentId,
                  agentName: entry?.server.definition.name || member.agentId,
                  role: member.role,
                  replyMode: "delegate-only",
                  capability,
                };
              }),
          };
        }
      }
    } catch (e) {
      console.error("Error resolving deployment context in PromptBuilder:", e);
    }
    return { mode: "solo" };
  }
}

export const sessionPromptBuilder = new SessionPromptBuilder();
