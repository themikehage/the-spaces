import type { SpacesHost, WorkspaceConfig } from "@spaces/sdk-core";
import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { workspaceConfigLoader } from "./session/workspace-config-loader";
import { resolveDefaultModel } from "./session/model-resolver";
import { resolveProjectDir } from "./session/workspace-resolver";

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
      // Eventbus broadcast
    },
    on(event: string, handler: (payload: unknown) => void): () => void {
      return () => {};
    },
  };

  approvals = {
    async requestApproval(): Promise<boolean> {
      return true;
    },
  };

  delegations = {
    async spawn(params: any): Promise<any> {
      return { status: "success", executive_summary: "Subagent spawned.", artifacts: "none", risks: "None" };
    },
    async delegate(params: any): Promise<any> {
      return { status: "success", executive_summary: "Task delegated.", artifacts: "none", risks: "None" };
    },
  };

  config = {
    async load(workspaceDir: string): Promise<WorkspaceConfig | null> {
      return workspaceConfigLoader.load(workspaceDir);
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
