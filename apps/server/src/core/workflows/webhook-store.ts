// SPDX-License-Identifier: MIT
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getUserDir, SPACES_DATA_PATH, USERS_DIR, type WorkflowDefinition } from "shared";

export interface WebhookRegistration {
  webhookId: string;
  username: string;
  workflowId: string;
  stepId: string;
  secret?: string;
  responseMode?: "onReceived" | "onWorkflowCompleted";
}

export class WebhookStore {
  private getWebhooksFilePath(username: string): string {
    const dir = join(getUserDir(username), "webhooks");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return join(dir, "index.json");
  }

  getRegistrations(username: string): WebhookRegistration[] {
    const filePath = this.getWebhooksFilePath(username);
    if (!existsSync(filePath)) return [];
    try {
      const raw = readFileSync(filePath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  saveRegistrations(username: string, registrations: WebhookRegistration[]): void {
    const filePath = this.getWebhooksFilePath(username);
    writeFileSync(filePath, JSON.stringify(registrations, null, 2), "utf-8");
  }

  syncWorkflowWebhooks(username: string, def: WorkflowDefinition): void {
    const existing = this.getRegistrations(username).filter((r) => r.workflowId !== def.id);
    const newWebhooks: WebhookRegistration[] = [];

    for (const step of def.steps) {
      if (step.type === "webhook") {
        const webhookId = step.webhookId || `${def.id}_${step.id}`;
        newWebhooks.push({
          webhookId,
          username,
          workflowId: def.id,
          stepId: step.id,
          secret: step.webhookSecret,
          responseMode: step.webhookResponseMode || "onReceived",
        });
      }
    }

    this.saveRegistrations(username, [...existing, ...newWebhooks]);
  }

  removeWorkflowWebhooks(username: string, workflowId: string): void {
    const existing = this.getRegistrations(username).filter((r) => r.workflowId !== workflowId);
    this.saveRegistrations(username, existing);
  }

  findWebhook(webhookId: string): WebhookRegistration | null {
    const usersBaseDir = join(SPACES_DATA_PATH(), USERS_DIR);
    if (!existsSync(usersBaseDir)) return null;

    try {
      const userEntries = require("node:fs").readdirSync(usersBaseDir, { withFileTypes: true });
      for (const userEntry of userEntries) {
        if (userEntry.isDirectory()) {
          const regs = this.getRegistrations(userEntry.name);
          const found = regs.find((r) => r.webhookId === webhookId);
          if (found) return found;
        }
      }
    } catch {
      return null;
    }

    return null;
  }
}

export const webhookStore = new WebhookStore();
