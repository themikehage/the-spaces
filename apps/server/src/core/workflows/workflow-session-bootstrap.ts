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
    const runDir = getWorkflowRunDir(username, workflowId, runId);
    const sessionDir = join(runDir, "session");
    const subagentsDir = join(sessionDir, "subagents");

    if (!existsSync(subagentsDir)) {
      mkdirSync(subagentsDir, { recursive: true });
    }

    sessionMetadataStore.saveSessionMetadata(username, workflowSessionId, {
      isWorkflowSession: true,
      workflowRunId: runId,
      workflowId,
      executionMode: "standard",
      workspaceDir,
      startedAt: new Date().toISOString(),
    });

    const cleanup = async () => {
      if (existsSync(sessionDir)) {
        try {
          rmSync(sessionDir, { recursive: true, force: true });
        } catch (e) {
          console.error(`[WorkflowSessionBootstrap] Failed to cleanup ${sessionDir}:`, e);
        }
      }
    };

    return {
      workflowSessionId,
      cleanup,
    };
  }
}

export const workflowSessionBootstrap = new WorkflowSessionBootstrap();
