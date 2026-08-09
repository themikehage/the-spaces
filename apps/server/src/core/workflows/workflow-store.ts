// SPDX-License-Identifier: MIT
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  getWorkflowDir,
  getWorkflowsDir,
  WorkflowDefinitionSchema,
  type WorkflowDefinition,
} from "shared";
import { webhookStore } from "./webhook-store";

export class WorkflowStore {
  async save(username: string, def: WorkflowDefinition): Promise<WorkflowDefinition> {
    const validated = WorkflowDefinitionSchema.parse(def);
    const dir = getWorkflowDir(username, validated.id);
    const workspaceDir = join(dir, "workspace");
    const runsDir = join(dir, "runs");

    if (!existsSync(workspaceDir)) {
      mkdirSync(workspaceDir, { recursive: true });
    }
    if (!existsSync(runsDir)) {
      mkdirSync(runsDir, { recursive: true });
    }

    const filePath = join(dir, "definition.json");
    writeFileSync(filePath, JSON.stringify(validated, null, 2), "utf-8");
    webhookStore.syncWorkflowWebhooks(username, validated);

    try {
      const { agentRegistry } = await import("../../agents/agent-registry");
      await agentRegistry.syncWorkflowAgent(username, validated);
    } catch (err) {
      console.error(`[WorkflowStore] Failed to sync workflow agent for ${validated.id}:`, err);
    }

    return validated;
  }

  async delete(username: string, workflowId: string): Promise<void> {
    const dir = getWorkflowDir(username, workflowId);
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
    webhookStore.removeWorkflowWebhooks(username, workflowId);

    try {
      const { agentRegistry } = await import("../../agents/agent-registry");
      const sanitizedId = workflowId.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const agentId = sanitizedId.startsWith("wf-") ? sanitizedId : `wf-${sanitizedId}`;
      await agentRegistry.stop(agentId);
    } catch {
      /* noop */
    }
  }

  get(username: string, workflowId: string): WorkflowDefinition | null {
    const filePath = join(getWorkflowDir(username, workflowId), "definition.json");
    if (!existsSync(filePath)) return null;
    try {
      const raw = readFileSync(filePath, "utf-8");
      return WorkflowDefinitionSchema.parse(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  list(username: string, filter?: { scopeType?: string; entityId?: string }): WorkflowDefinition[] {
    const baseDir = getWorkflowsDir(username);
    if (!existsSync(baseDir)) return [];

    const entries = readdirSync(baseDir, { withFileTypes: true });
    const results: WorkflowDefinition[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const defPath = join(baseDir, entry.name, "definition.json");
      if (existsSync(defPath)) {
        try {
          const raw = readFileSync(defPath, "utf-8");
          const def = WorkflowDefinitionSchema.parse(JSON.parse(raw));
          if (filter?.scopeType && def.scope?.type !== filter.scopeType) continue;
          if (filter?.entityId && def.scope?.entityId !== filter.entityId) continue;
          results.push(def);
        } catch {
          /* noop */
        }
      }
    }

    return results;
  }
}

export const workflowStore = new WorkflowStore();
