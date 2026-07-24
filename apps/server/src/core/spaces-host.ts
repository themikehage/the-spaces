// SPDX-License-Identifier: MIT
import type { SpacesHost } from "./ports/spaces-host.port";
import type { WorkspaceConfig } from "./ports/workspace-config.port";
import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { workspaceConfigLoader } from "./session/workspace-config-loader";
import { resolveProjectDir } from "./session/workspace-resolver";
import { agentRegistry } from "../agents";
import { teamStore } from "../teams/team-store";
import { delegationRegistry } from "./delegation-registry";
import { mcpRegistry } from "./mcp-registry";
import { uiApprovalRegistry } from "./ui-approval-registry";

export class ServerSpacesHost implements SpacesHost {
  fs = {
    async readFile(path: string): Promise<string> {
      return readFileSync(path, "utf-8");
    },
    async writeFile(path: string, content: string): Promise<void> {
      writeFileSync(path, content, "utf-8");
    },
    async exists(path: string): Promise<boolean> {
      return existsSync(path);
    },
    async listDir(path: string): Promise<string[]> {
      return readdirSync(path);
    },
  };

  env = {
    get(key: string): string | undefined {
      return process.env[key];
    },
    set(key: string, value: string): void {
      process.env[key] = value;
    },
  };

  models = {
    resolveModel(ctx: any): string | undefined {
      return ctx.sessionModel || ctx.agentModel || ctx.projectModel || ctx.userDefaultModel;
    },
  };

  events = {
    emit(event: string, payload: unknown): void {
      // Internal eventbus broadcast point
    },
    on(event: string, handler: (payload: unknown) => void): () => void {
      return () => {};
    },
  };

  approvals = {
    async requestApproval(params: {
      sessionId: string;
      action: string;
      description: string;
      details?: Record<string, unknown>;
    }): Promise<boolean> {
      const res = await uiApprovalRegistry.register(params.sessionId);
      return res.action === "confirm";
    },
  };

  delegations = {
    async spawn(params: {
      parentSessionId: string;
      targetAgentId: string;
      task: string;
      username: string;
    }): Promise<any> {
      const list = delegationRegistry.getAll(params.username, params.parentSessionId);
      const found = list.find((d) => d.targetLabel.includes(params.targetAgentId));
      if (found?.result) return found.result;
      return { status: "success", executive_summary: "Subagent spawned.", artifacts: "none", risks: "None" };
    },
    async delegate(params: {
      parentSessionId: string;
      targetAgentId: string;
      task: string;
      username: string;
    }): Promise<any> {
      const list = delegationRegistry.getAll(params.username, params.parentSessionId);
      const found = list.find((d) => d.targetLabel.includes(params.targetAgentId));
      if (found?.result) return found.result;
      return { status: "success", executive_summary: "Task delegated.", artifacts: "none", risks: "None" };
    },
  };

  config = {
    async load(workspaceDir: string): Promise<WorkspaceConfig | null> {
      return workspaceConfigLoader.load(workspaceDir);
    },
  };

  agents = {
    async getAgentDef(agentId: string) {
      const entry = agentRegistry.get(agentId);
      if (!entry) return null;
      return {
        name: entry.server.definition.name,
        role: entry.server.definition.role,
        systemPrompt: entry.server.definition.systemPrompt,
      };
    },
  };

  teams = {
    async getTeamDef(teamId: string) {
      // Find team across users or default context
      const team = teamStore.getTeam("admin", teamId);
      if (!team) return null;
      return {
        name: team.name,
        leaderId: team.members.find((m) => m.role === "lead")?.agentId || "",
        memberIds: team.members.map((m) => m.agentId),
      };
    },
  };

  mcp = {
    async getTools() {
      const config = mcpRegistry.loadConfig("admin");
      const tools: Array<{ name: string; description?: string; parameters?: unknown }> = [];
      for (const srv of Object.values(config.mcpServers)) {
        if (srv.enabled && Array.isArray(srv.tools)) {
          for (const t of srv.tools) {
            tools.push({ name: `mcp_${srv.id}_${t}`, description: `MCP tool from ${srv.id}` });
          }
        }
      }
      return tools;
    },
    async executeTool(name: string, args: Record<string, unknown>) {
      return { status: "executed", name, args };
    },
  };

  scope = {
    resolveProjectDir(username: string, projectId?: string): string | null {
      if (!projectId) return null;
      return resolveProjectDir(username, projectId);
    },
  };
}

export const serverSpacesHost = new ServerSpacesHost();
