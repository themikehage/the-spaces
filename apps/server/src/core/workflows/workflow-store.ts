// SPDX-License-Identifier: MIT
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { getUserDir, WorkflowDefinitionSchema, type WorkflowDefinition } from "shared";

export class WorkflowStore {
  private getWorkflowsDir(username: string): string {
    const dir = join(getUserDir(username), "workflows");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  save(username: string, def: WorkflowDefinition): WorkflowDefinition {
    const validated = WorkflowDefinitionSchema.parse(def);
    const dir = this.getWorkflowsDir(username);
    const filePath = join(dir, `${validated.id}.json`);
    writeFileSync(filePath, JSON.stringify(validated, null, 2), "utf-8");
    return validated;
  }

  delete(username: string, workflowId: string): void {
    const dir = this.getWorkflowsDir(username);
    const filePath = join(dir, `${workflowId}.json`);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  get(username: string, workflowId: string): WorkflowDefinition | null {
    const dir = this.getWorkflowsDir(username);
    const filePath = join(dir, `${workflowId}.json`);
    if (!existsSync(filePath)) return null;
    try {
      const raw = readFileSync(filePath, "utf-8");
      return WorkflowDefinitionSchema.parse(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  list(username: string, filter?: { scopeType?: string; entityId?: string }): WorkflowDefinition[] {
    const dir = this.getWorkflowsDir(username);
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    const results: WorkflowDefinition[] = [];

    for (const file of files) {
      try {
        const raw = readFileSync(join(dir, file), "utf-8");
        const def = WorkflowDefinitionSchema.parse(JSON.parse(raw));
        if (filter?.scopeType && def.scope?.type !== filter.scopeType) continue;
        if (filter?.entityId && def.scope?.entityId !== filter.entityId) continue;
        results.push(def);
      } catch {
        // Skip corrupted files
      }
    }

    return results;
  }
}

export const workflowStore = new WorkflowStore();
