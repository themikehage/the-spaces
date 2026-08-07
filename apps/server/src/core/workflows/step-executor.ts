import type { WorkflowRun, WorkflowStep, WorkflowStepState } from "shared";
import { credentialStore, CredentialStore } from "../credentials/credential-store";
import { fetchHttpClient } from "../infra/http-client";
import type { ICredentialStore } from "../ports/credential-store.port";
import type { IHttpClient } from "../ports/http-client.port";
import type { EventBus } from "../ports/spaces-host.port";
import type { SessionManager } from "../session/session-manager";
import type { DelegationRegistry } from "../delegation/delegation-registry";
import { executeAgentStep } from "./executors/agent-executor";
import { executeApprovalStep } from "./executors/approval-executor";
import { executeCodeStep } from "./executors/code-executor";
import { executeIfStep, executeMergeStep, executeSwitchStep } from "./executors/control-executor";
import { executeHttpStep } from "./executors/http-executor";
import { executeVariableStep } from "./executors/variable-executor";
import { executeWebhookStep } from "./executors/webhook-executor";
import { workflowRunStore } from "./workflow-run-store";

export interface StepExecutorDeps {
  sessionManager: SessionManager;
  delegationRegistry: DelegationRegistry;
  eventBus?: EventBus;
  httpClient?: IHttpClient;
  credentialStore?: ICredentialStore;
}

export class StepExecutor {
  private httpClient: IHttpClient;
  private credentialStore: ICredentialStore;

  constructor(private deps: StepExecutorDeps) {
    this.httpClient = deps.httpClient ?? fetchHttpClient;
    this.credentialStore = deps.credentialStore ?? credentialStore;
  }

  async execute(
    step: WorkflowStep,
    run: WorkflowRun,
    scope: Record<string, unknown>,
    workspaceDir: string,
    signal?: AbortSignal,
    dryRun?: boolean,
  ): Promise<WorkflowStepState> {
    const startedAt = new Date().toISOString();

    if (step.pinnedOutputs && (dryRun || Object.keys(step.pinnedOutputs).length > 0)) {
      workflowRunStore.updateStepState(run.username, run.id, step.id, {
        status: "pinned",
        startedAt,
        completedAt: startedAt,
        outputs: step.pinnedOutputs,
      });
      this.deps.eventBus?.emit("workflow_step_completed", {
        runId: run.id,
        stepId: step.id,
        status: "pinned",
        outputs: step.pinnedOutputs,
      });
      return {
        stepId: step.id,
        status: "pinned",
        startedAt,
        completedAt: startedAt,
        outputs: step.pinnedOutputs,
      };
    }

    if (dryRun) {
      switch (step.type) {
        case "agent":
        case "code":
        case "http":
          return {
            stepId: step.id,
            status: "skipped",
            startedAt,
            completedAt: startedAt,
            outputs: {},
          };
        case "approval":
          return {
            stepId: step.id,
            status: "success",
            startedAt,
            completedAt: startedAt,
            outputs: { approved: true },
          };
      }
    }

    const effectiveTimeoutMs = step.timeoutMs;
    const stepController = new AbortController();

    if (signal) {
      if (signal.aborted) {
        stepController.abort(signal.reason);
      } else {
        signal.addEventListener("abort", () => stepController.abort(signal.reason), { once: true });
      }
    }

    let timeoutTimer: ReturnType<typeof setTimeout> | undefined;

    try {
      const executionPromise = (async () => {
        switch (step.type) {
          case "agent":
            return await executeAgentStep(
              step,
              run,
              scope,
              workspaceDir,
              startedAt,
              {
                sessionManager: this.deps.sessionManager,
                delegationRegistry: this.deps.delegationRegistry,
                eventBus: this.deps.eventBus,
              },
              stepController.signal,
            );
          case "if":
            return await executeIfStep(step, run, scope, startedAt);
          case "switch":
            return await executeSwitchStep(step, run, scope, startedAt);
          case "merge":
            return await executeMergeStep(step, run, scope, startedAt);
          case "approval":
            return await executeApprovalStep(
              step,
              run,
              startedAt,
              this.deps.eventBus,
              stepController.signal,
            );
          case "code":
            return await executeCodeStep(step, run, scope, startedAt);
          case "http":
            return await executeHttpStep(
              step,
              run,
              scope,
              startedAt,
              this.httpClient,
              this.credentialStore,
            );
          case "variables":
            return await executeVariableStep(step, run, scope, startedAt);
          case "webhook":
            return await executeWebhookStep(step, run, scope, startedAt);
          default:
            throw new Error(`Unsupported workflow step type: ${(step as WorkflowStep).type}`);
        }
      })();

      const promises: Promise<WorkflowStepState>[] = [executionPromise];

      if (effectiveTimeoutMs && effectiveTimeoutMs > 0) {
        const timeoutPromise = new Promise<WorkflowStepState>((_, reject) => {
          timeoutTimer = setTimeout(() => {
            stepController.abort(new Error(`Step timed out after ${effectiveTimeoutMs}ms`));
            reject(new Error(`Step execution timed out after ${effectiveTimeoutMs}ms`));
          }, effectiveTimeoutMs);
        });
        promises.push(timeoutPromise);
      }

      return await Promise.race(promises);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        stepId: step.id,
        status: "error",
        startedAt,
        completedAt: new Date().toISOString(),
        error: errorMsg,
      };
    } finally {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
    }
  }
}
