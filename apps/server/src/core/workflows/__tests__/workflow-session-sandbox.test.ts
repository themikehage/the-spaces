// SPDX-License-Identifier: MIT
import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { getSessionDir } from "shared";
import { sessionMetadataStore } from "../../session/metadata-store";
import { WorkflowEngine } from "../workflow-engine";

describe("Workflow Session Sandbox Isolation", () => {
  test("bootstraps an isolated session and metadata during run execution", async () => {
    const testUsername = "test-sandbox-user";
    let capturedSessionId = "";
    let metadataExistedDuringRun = false;
    let sessionDirExistedDuringRun = false;

    const mockSessionManager = {
      userConfig: {},
    } as any;

    const mockDelegationRegistry = {} as any;

    const mockBootstrap = {
      bootstrap: async (username: string, runId: string, workflowId: string, workspaceDir: string) => {
        const workflowSessionId = `wf-run-${runId}`;
        capturedSessionId = workflowSessionId;

        sessionMetadataStore.saveSessionMetadata(username, workflowSessionId, {
          isWorkflowSession: true,
          workflowRunId: runId,
          workflowId,
          executionMode: "standard",
          workspaceDir,
        });

        const meta = sessionMetadataStore.getSessionMetadata(username, workflowSessionId);
        metadataExistedDuringRun = Boolean(meta && meta.isWorkflowSession);

        const sessionDir = getSessionDir(username, workflowSessionId);
        sessionDirExistedDuringRun = existsSync(sessionDir);

        return {
          workflowSessionId,
          cleanup: async () => {
            /* cleanup callback verification */
          },
        };
      },
    };

    const engine = new WorkflowEngine({
      getSessionManager: () => mockSessionManager,
      getDelegationRegistry: () => mockDelegationRegistry,
      sessionBootstrap: mockBootstrap,
    });

    const def = await engine.save(testUsername, {
      id: "sandbox-test-wf",
      name: "Sandbox Test Workflow",
      onError: "stop",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: [
        {
          id: "step_1",
          type: "code",
          label: "Code Step",
          codeSnippet: "return { result: 'ok' };",
        },
      ],
    });

    const run = await engine.run(testUsername, def.id);

    expect(run.id).toBeDefined();
    expect(capturedSessionId).toBe(`wf-run-${run.id}`);
    expect(metadataExistedDuringRun).toBe(true);

    const { getWorkflowDir, getWorkflowWorkspaceDir, getWorkflowRunsDir, getWorkflowRunDir } = await import("shared");
    expect(existsSync(getWorkflowDir(testUsername, def.id))).toBe(true);
    expect(existsSync(getWorkflowWorkspaceDir(testUsername, def.id))).toBe(true);
    expect(existsSync(getWorkflowRunsDir(testUsername, def.id))).toBe(true);
    expect(existsSync(getWorkflowRunDir(testUsername, def.id, run.id))).toBe(true);
  });
});
