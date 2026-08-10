// SPDX-License-Identifier: MIT
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getAgentAgentsMdPath,
  getGlobalAgentsMdPath,
  getProjectAgentsMdPath,
  getTeamAgentsMdPath,
  getWorkspaceDir,
  SessionPrefix,
} from "shared";
import { agentRegistry } from "../../agents/agent-registry";
import { teamStore } from "../../teams/team-store";
import { loadSkills } from "..";
import type { EntityConfig } from "../config";
import { CUSTOM_TOOL_INSTRUCTIONS } from "../custom-tools";
import { agentTypeRegistry } from "../entities/agent-type-registry";
import type { AgentRef } from "../ports/agent-type-registry.port";
import { promptComposer } from "../prompts/composer";
import { DEFAULT_AGENTS_MD } from "../prompts/default-factory-skills";
import { buildProjectContextPrompt } from "../prompts/project-context";
import { assemblePromptAppends } from "../prompts/prompt-assembly";
import {
  AG_UI_INSTRUCTIONS,
  ENVIRONMENT_INSTRUCTIONS,
  HTML_PREVIEW_INSTRUCTIONS,
  PERSISTENT_MEMORY_INSTRUCTIONS,
  SUBAGENT_DELEGATION_INSTRUCTIONS,
  TASK_DELEGATION_INSTRUCTIONS,
} from "../prompts/system-instructions";
import { TaskStateManager } from "../tools/extensions/task-state-manager";
import { sessionMetadataStore } from "./metadata-store";
import { userConfig } from "./user-config";
import { resolveProjectDir } from "./workspace-resolver";

export interface BuildPromptsParams {
  username: string;
  sessionId: string;
  workspaceDir: string;
  sessionDir: string;
  resolvedAgentId?: string;
  agentDef?: { name: string; systemPrompt: string };
  cachedMcpToolNames: string[];
  projectId?: string;
  entityConfig?: EntityConfig;
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
    } = params;

    const appendPrompts = assemblePromptAppends({
      mode: "standard-session",
      workspaceDir,
    });

    if (params.entityConfig) {
      if (Array.isArray(params.entityConfig.rules) && params.entityConfig.rules.length > 0) {
        appendPrompts.push(
          `\n\n## Entity Directives & Rules (.spaces/config.json)\n${params.entityConfig.rules.join("\n\n")}`,
        );
      }
      if (
        Array.isArray(params.entityConfig.workflows) &&
        params.entityConfig.workflows.length > 0
      ) {
        appendPrompts.push(
          `\n\n## Entity Workflows (.spaces/config.json)\n${params.entityConfig.workflows.join("\n\n")}`,
        );
      }
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
          `---`,
      );
    }

    if (params.projectId) {
      try {
        const projectDir = resolveProjectDir(username, params.projectId);
        if (projectDir) {
          const projectJsonPath = join(projectDir, "project.json");
          if (existsSync(projectJsonPath)) {
            const projectMeta = JSON.parse(readFileSync(projectJsonPath, "utf-8"));
            const { getPreviewState } = await import("../preview/preview-watcher");
            const previewState = getPreviewState(username, projectMeta.name);
            const previewUrl = `/api/preview/${encodeURIComponent(username)}/${encodeURIComponent(projectMeta.name)}/index.html`;

            const projectPrompt = buildProjectContextPrompt({
              projectId: projectMeta.id,
              projectName: projectMeta.name,
              projectDir,
              cloneUrl: projectMeta.cloneUrl,
              previewState,
              previewUrl,
            });
            appendPrompts.push(projectPrompt);

            const projectAgentsMd = getProjectAgentsMdPath(username, params.projectId);
            if (existsSync(projectAgentsMd)) {
              appendPrompts.push(
                `\n\n## Project Directives (.spaces/AGENTS.md)\n${readFileSync(projectAgentsMd, "utf-8")}`,
              );
            }

            if (projectMeta.assignment) {
              const { assignment } = projectMeta;
              if (assignment.leaderId) {
                try {
                  const leaderEntry = agentRegistry.get(assignment.leaderId, username);
                  if (leaderEntry?.server.definition.systemPrompt) {
                    appendPrompts.push(
                      `\n\n## Project Lead Agent Persona & Directives\n` +
                        `This project has an assigned Lead Agent (${leaderEntry.server.definition.name || assignment.leaderId}). Incorporate the following lead instructions into your reasoning and execution:\n\n` +
                        leaderEntry.server.definition.systemPrompt,
                    );
                  }
                } catch (err) {
                  console.error("[PromptBuilder] Failed to load leader agent prompt:", err);
                }
              }

              if (Array.isArray(assignment.members) && assignment.members.length > 0) {
                const roster = assignment.members
                  .map(
                    (m: { id: string; name: string; role: string }) =>
                      `- **${m.name}** (ID: \`${m.id}\`, Role: ${m.role})`,
                  )
                  .join("\n");
                appendPrompts.push(
                  `\n\n## Project Assigned Team Roster\n` +
                    `The following team members are assigned to work on this project:\n` +
                    roster,
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
          `Use these tools when the task requires interacting with external databases, APIs, searching the web, or product integrations (like Slack, Linear, Jira, Google Drive). Do not assume you need to use bash if a specific MCP tool is more suitable.\n`,
      );
    }

    try {
      const { folderCustomToolStorage } = await import("../custom-tools/folder-storage");
      const customDefs = folderCustomToolStorage
        .loadAll(username)
        .filter((d) => d.definition.enabled !== false);
      if (customDefs.length > 0) {
        appendPrompts.push(
          `\n\n## Custom Tools Available (User-Created):\n` +
            `You have ${customDefs.length} custom tool(s) registered and active for this user:\n` +
            `${customDefs.map((t) => `- ${t.definition.name}: ${t.definition.description}`).join("\n")}\n` +
            `These are available as regular tools — invoke them by name like any other tool. Prefer them when the task matches their purpose.\n`,
        );
      }
    } catch (e) {
      console.error("[PromptBuilder] Failed to load custom tools for prompt:", e);
    }

    try {
      const meta = sessionMetadataStore.getSessionMetadata(username, sessionId);
      let teamId = meta?.teamId;
      if (!teamId && sessionId.startsWith(SessionPrefix.TEAM)) {
        teamId = sessionId.slice(SessionPrefix.TEAM.length);
      }
      if (teamId) {
        const team = teamStore.getTeam(username, teamId);
        if (team && team.context && team.context.length > 0) {
          const contextSnippet =
            `\n\n## Team Context Variables\n` +
            `The following project-level key-value context has been configured for this team:\n` +
            team.context.map((it: any) => `- ${it.key}: ${it.value}`).join("\n");
          appendPrompts.push(contextSnippet);
        }
        const teamAgentsMd = getTeamAgentsMdPath(username, teamId);
        if (existsSync(teamAgentsMd)) {
          appendPrompts.push(
            `\n\n## Team Directives (.spaces/AGENTS.md)\n${readFileSync(teamAgentsMd, "utf-8")}`,
          );
        }
      }
    } catch (e) {
      console.error("[PromptBuilder] Failed to inject team context:", e);
    }

    let activeSystemPrompt = agentDef?.systemPrompt;
    if (resolvedAgentId) {
      const agentAgentsMd = getAgentAgentsMdPath(username, resolvedAgentId);
      if (existsSync(agentAgentsMd)) {
        activeSystemPrompt = readFileSync(agentAgentsMd, "utf-8");
      }
    }

    if (activeSystemPrompt) {
      const deployment = await this.resolveDeploymentContext(params);
      const layered = promptComposer.compose(
        { name: agentDef?.name || "", systemPrompt: activeSystemPrompt },
        deployment,
        workspaceDir,
      );
      appendPrompts.push(`\n\n${layered.composed}`);
    }

    const tasksState = TaskStateManager.getTaskState(sessionDir);
    if (tasksState && tasksState.status === "running") {
      try {
        const activeTask = tasksState.tasks?.find((t: any) => t.id === tasksState.currentTaskId);
        const tasksListStr = tasksState.tasks
          ?.map(
            (t: any) =>
              `- [${t.status === "done" ? "x" : t.status === "running" ? "/" : " "}] ${t.id}: ${t.title}${t.depends_on?.length > 0 ? ` (depends on: ${t.depends_on.join(", ")})` : ""}`,
          )
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
          `2. When the active task's objective is fully achieved, you MUST call the native tool: \`task(action: "update", taskId: "${tasksState.currentTaskId}", status: "done", log: "summary of what was done")\` to mark it as complete. This will automatically update your active instructions in the next turn.\n` +
          `3. If a task fails or you hit an error you cannot resolve, call \`task(action: "update", taskId: "${tasksState.currentTaskId}", status: "failed", log: "error reason")\`.\n` +
          `4. When all tasks in the list have been marked as "done", you MUST call \`task(action: "end", summary: "final completion summary")\` to finalize the execution.`;

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
      const meta = sessionMetadataStore.getSessionMetadata(username, sessionId);

      if (meta?.teamId) {
        const team = teamStore.getTeam(username, meta.teamId);
        const ownerId = params.resolvedAgentId || "";
        if (
          team?.teamType === "Orchestration" &&
          team.members.some((member) => member.agentId === ownerId && member.role === "lead")
        ) {
          return {
            mode: "orchestration",
            agentRole: "lead",
            members: team.members
              .filter((member) => member.agentId !== ownerId && member.role !== "observer")
              .map((member) => {
                const entry = agentRegistry.get(member.agentId, username);
                const capability =
                  entry?.server.definition.systemPrompt?.replace(/\s+/g, " ").slice(0, 180) ||
                  member.role;
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

  async previewSystemPrompt(params: {
    username: string;
    agentRef?: AgentRef;
    entityType?: string;
    agentId?: string;
    projectId?: string;
    teamId?: string;
    subagentId?: string;
  }): Promise<{
    sections: Array<{ title: string; content: string }>;
    fullPrompt: string;
    estimatedTokens: number;
  }> {
    const { username, entityType, agentId, projectId, teamId, subagentId } = params;
    const ref: AgentRef = params.agentRef || {
      type: (entityType as any) || "global",
      id: agentId || subagentId || projectId || teamId || "global",
    };
    const workspaceDir = getWorkspaceDir(username);
    const sections: Array<{ title: string; content: string }> = [];

    // 1. Global Workspace Directives (.spaces/AGENTS.md / Global Spaces Director)
    try {
      const globalMdPath = getGlobalAgentsMdPath(username);
      const legacyMdPath = join(workspaceDir, "AGENTS.md");
      let agentsMdContent = DEFAULT_AGENTS_MD;
      if (existsSync(globalMdPath)) {
        agentsMdContent = readFileSync(globalMdPath, "utf-8");
      } else if (existsSync(legacyMdPath)) {
        agentsMdContent = readFileSync(legacyMdPath, "utf-8");
      }
      sections.push({
        title: "Global Workspace Directives & Director Persona (AGENTS.md)",
        content: agentsMdContent,
      });
    } catch (e) {
      console.error("[PromptBuilder] Failed to read AGENTS.md for preview:", e);
    }

    // 2. Type-Specific Persona / Strategy Section (Polymorphic Delegation)
    try {
      const strategy = agentTypeRegistry.get(ref.type);
      if (strategy.buildPromptSection) {
        const section = await strategy.buildPromptSection(ref, username);
        if (section) {
          sections.push(section);
        }
      }
    } catch (e) {
      console.error("[PromptBuilder] Failed to load strategy prompt section:", e);
    }

    // 3. Standard Spaces Platform Protocols
    const platformProtocols = [
      ENVIRONMENT_INSTRUCTIONS,
      HTML_PREVIEW_INSTRUCTIONS,
      AG_UI_INSTRUCTIONS,
      PERSISTENT_MEMORY_INSTRUCTIONS,
      SUBAGENT_DELEGATION_INSTRUCTIONS,
      TASK_DELEGATION_INSTRUCTIONS,
    ].join("\n\n");

    sections.push({
      title: "Standard Spaces Platform Protocols",
      content: platformProtocols,
    });

    // 7. Registered Tools & MCP Extensions
    try {
      const { folderCustomToolStorage } = await import("../custom-tools/folder-storage");
      const customDefs = folderCustomToolStorage
        .loadAll(username)
        .filter((d) => d.definition.enabled !== false);

      let toolsContent = "";
      if (customDefs.length > 0) {
        toolsContent +=
          `## Custom Registered Tools:\n` +
          `You have ${customDefs.length} custom tool(s) registered:\n` +
          `${customDefs.map((t) => `- ${t.definition.name}: ${t.definition.description}`).join("\n")}\n\n`;
      }

      sections.push({
        title: "Registered Tools & MCP Extensions",
        content: toolsContent.trim() || "No custom tools registered.",
      });
    } catch (e) {
      console.error("[PromptBuilder] Failed to load custom tools for preview:", e);
    }

    // 8. Built-in Tool Guidelines & Custom Tool Builder
    sections.push({
      title: "Built-in Tool Guidelines & Custom Tool Builder",
      content: CUSTOM_TOOL_INSTRUCTIONS,
    });

    // 9. Available Skills Catalog
    try {
      const loaded = loadSkills({
        cwd: workspaceDir,
        agentDir: workspaceDir,
        skillPaths: [],
        includeDefaults: true,
      });
      if (loaded.skills.length > 0) {
        const skillList = loaded.skills.map((s) => `- **${s.name}**: ${s.description}`).join("\n");
        sections.push({
          title: "Available Skills Catalog",
          content: `<available_skills>\n${skillList}\n</available_skills>`,
        });
      }
    } catch (e) {
      console.error("[PromptBuilder] Failed to load skills catalog for preview:", e);
    }

    const fullPrompt = sections.map((s) => `--- ${s.title} ---\n${s.content}`).join("\n\n");
    const estimatedTokens = Math.ceil(fullPrompt.length / 4);

    return {
      sections,
      fullPrompt,
      estimatedTokens,
    };
  }
}

export const sessionPromptBuilder = new SessionPromptBuilder();
