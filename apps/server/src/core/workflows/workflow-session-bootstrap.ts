// SPDX-License-Identifier: MIT
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { getWorkflowRunDir } from "shared";
import type {
  IWorkflowSessionBootstrap,
  IWorkflowSessionBootstrapResult,
} from "../ports/workflow-engine.port";
import { sessionMetadataStore } from "../session/metadata-store";

export class WorkflowSessionBootstrap implements IWorkflowSessionBootstrap {
  async bootstrap(
    username: string,
    runId: string,
    workflowId: string,
    workspaceDir: string,
  ): Promise<IWorkflowSessionBootstrapResult> {
    const workflowSessionId = `wf-run-${runId}`;
    const agentId = `wf-${workflowId}`;
    const runDir = getWorkflowRunDir(username, workflowId, runId);
    const sessionDir = join(runDir, "session");

    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true });
    }

    try {
      const { agentRegistry } = await import("../../agents/agent-registry");
      const existing = agentRegistry.getWorkflowAgent(username, workflowId);
      if (!existing) {
        const workflowDef = (await import("./workflow-store")).workflowStore.get(username, workflowId);
        if (workflowDef) {
          await agentRegistry.syncWorkflowAgent(username, workflowDef);
        }
      }
    } catch (err) {
      console.warn(`[WorkflowSessionBootstrap] Failed to sync agent ${agentId}:`, err);
    }

    try {
      const { sessionManager } = await import("../session/session-manager");
      await sessionManager.getOrCreateSession(username, workflowSessionId, undefined, agentId, {
        workspaceDir,
      });
    } catch (err) {
      console.error(`[WorkflowSessionBootstrap] Failed to create session ${workflowSessionId}:`, err);
    }

    sessionMetadataStore.saveSessionMetadata(username, workflowSessionId, {
      isWorkflowSession: true,
      workflowRunId: runId,
      workflowId,
      agentId,
      executionMode: "standard",
      workspaceDir,
      startedAt: new Date().toISOString(),
    });

    const cleanup = async () => {
      // Sessions are preserved post-run for user inspection & conversation audit
    };

    return {
      workflowSessionId,
      cleanup,
    };
  }
}

export const workflowSessionBootstrap = new WorkflowSessionBootstrap();
