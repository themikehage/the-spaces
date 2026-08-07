// SPDX-License-Identifier: MIT
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getUserDir } from "shared";

export class WorkflowVariableStore {
  private getVariablesFilePath(username: string, workflowId: string): string {
    const dir = join(getUserDir(username), "workflow-variables");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return join(dir, `${workflowId}.json`);
  }

  getAll(username: string, workflowId: string): Record<string, unknown> {
    const filePath = this.getVariablesFilePath(username, workflowId);
    if (!existsSync(filePath)) return {};
    try {
      const raw = readFileSync(filePath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  get(username: string, workflowId: string, key: string): unknown {
    const vars = this.getAll(username, workflowId);
    return vars[key];
  }

  set(username: string, workflowId: string, key: string, value: unknown): Record<string, unknown> {
    const vars = this.getAll(username, workflowId);
    vars[key] = value;
    const filePath = this.getVariablesFilePath(username, workflowId);
    writeFileSync(filePath, JSON.stringify(vars, null, 2), "utf-8");
    return vars;
  }

  delete(username: string, workflowId: string, key: string): Record<string, unknown> {
    const vars = this.getAll(username, workflowId);
    delete vars[key];
    const filePath = this.getVariablesFilePath(username, workflowId);
    writeFileSync(filePath, JSON.stringify(vars, null, 2), "utf-8");
    return vars;
  }

  increment(
    username: string,
    workflowId: string,
    key: string,
    amount: number = 1,
  ): Record<string, unknown> {
    const vars = this.getAll(username, workflowId);
    const currentVal = typeof vars[key] === "number" ? (vars[key] as number) : 0;
    vars[key] = currentVal + amount;
    const filePath = this.getVariablesFilePath(username, workflowId);
    writeFileSync(filePath, JSON.stringify(vars, null, 2), "utf-8");
    return vars;
  }
}

export const workflowVariableStore = new WorkflowVariableStore();
