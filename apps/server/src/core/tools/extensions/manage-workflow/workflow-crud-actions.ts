// SPDX-License-Identifier: MIT
import { WorkflowDefinitionSchema, type WorkflowDefinition, type WorkflowStep } from "shared";
import type { IWorkflowEngine } from "../../../ports/workflow-engine.port";

export interface WorkflowCrudOptions {
  username: string;
  workflowEngine?: IWorkflowEngine;
}

export class WorkflowCrudActions {
  constructor(private opts: WorkflowCrudOptions) {}

  private checkEngine(): IWorkflowEngine {
    if (!this.opts.workflowEngine) {
      throw new Error(
        "Workflow engine is not initialized for this session. Execute 'contract' action to see schema.",
      );
    }
    return this.opts.workflowEngine;
  }

  list(args: { scopeType?: string; entityId?: string }): WorkflowDefinition[] {
    const engine = this.checkEngine();
    return engine.list(this.opts.username, args);
  }

  get(workflowId: string): WorkflowDefinition {
    const engine = this.checkEngine();
    const def = engine.get(this.opts.username, workflowId);
    if (!def) {
      throw new Error(`Workflow definition '${workflowId}' not found.`);
    }
    return def;
  }

  async save(definition: WorkflowDefinition): Promise<WorkflowDefinition> {
    const engine = this.checkEngine();
    const parsed = WorkflowDefinitionSchema.parse(definition);
    return engine.save(this.opts.username, parsed);
  }

  async delete(workflowId: string): Promise<void> {
    const engine = this.checkEngine();
    await engine.delete(this.opts.username, workflowId);
  }

  async addStep(params: {
    workflowId: string;
    step: WorkflowStep;
    insertAfterStepId?: string;
  }): Promise<WorkflowDefinition> {
    const def = this.get(params.workflowId);
    const existingIndex = def.steps.findIndex((s) => s.id === params.step.id);
    if (existingIndex >= 0) {
      throw new Error(
        `Step with ID '${params.step.id}' already exists in workflow '${params.workflowId}'.`,
      );
    }

    const steps = [...def.steps];
    if (params.insertAfterStepId) {
      const idx = steps.findIndex((s) => s.id === params.insertAfterStepId);
      if (idx >= 0) {
        steps.splice(idx + 1, 0, params.step);
      } else {
        steps.push(params.step);
      }
    } else {
      steps.push(params.step);
    }

    const updated: WorkflowDefinition = { ...def, steps };
    return this.save(updated);
  }

  async updateStep(params: {
    workflowId: string;
    stepId: string;
    updates: Partial<WorkflowStep>;
  }): Promise<WorkflowDefinition> {
    const def = this.get(params.workflowId);
    const idx = def.steps.findIndex((s) => s.id === params.stepId);
    if (idx === -1) {
      throw new Error(`Step '${params.stepId}' not found in workflow '${params.workflowId}'.`);
    }

    const updatedStep = { ...def.steps[idx], ...params.updates } as WorkflowStep;
    const steps = [...def.steps];
    steps[idx] = updatedStep;

    const updated: WorkflowDefinition = { ...def, steps };
    return this.save(updated);
  }

  async removeStep(params: {
    workflowId: string;
    stepId: string;
  }): Promise<WorkflowDefinition> {
    const def = this.get(params.workflowId);
    const steps = def.steps
      .filter((s) => s.id !== params.stepId)
      .map((s) => {
        const cleanedDependsOn = s.dependsOn?.filter((depId) => depId !== params.stepId);
        let cleanedBranches = s.branches;
        if (s.branches) {
          cleanedBranches = {};
          for (const [key, targetIds] of Object.entries(s.branches)) {
            cleanedBranches[key] = targetIds.filter((tId) => tId !== params.stepId);
          }
        }
        return {
          ...s,
          ...(s.dependsOn ? { dependsOn: cleanedDependsOn } : {}),
          ...(s.branches ? { branches: cleanedBranches } : {}),
        } as WorkflowStep;
      });

    const updated: WorkflowDefinition = { ...def, steps };
    return this.save(updated);
  }

  async connectSteps(params: {
    workflowId: string;
    fromStepId: string;
    toStepId: string;
    branchKey?: string;
  }): Promise<WorkflowDefinition> {
    const def = this.get(params.workflowId);
    const fromStep = def.steps.find((s) => s.id === params.fromStepId);
    const toStep = def.steps.find((s) => s.id === params.toStepId);

    if (!fromStep) throw new Error(`Source step '${params.fromStepId}' not found.`);
    if (!toStep) throw new Error(`Target step '${params.toStepId}' not found.`);

    const steps = def.steps.map((s) => {
      if (params.branchKey && s.id === params.fromStepId) {
        const currentBranches = s.branches || {};
        const currentList = currentBranches[params.branchKey] || [];
        if (!currentList.includes(params.toStepId)) {
          return {
            ...s,
            branches: {
              ...currentBranches,
              [params.branchKey]: [...currentList, params.toStepId],
            },
          } as WorkflowStep;
        }
      } else if (!params.branchKey && s.id === params.toStepId) {
        const currentDeps = s.dependsOn || [];
        if (!currentDeps.includes(params.fromStepId)) {
          return {
            ...s,
            dependsOn: [...currentDeps, params.fromStepId],
          } as WorkflowStep;
        }
      }
      return s;
    });

    const updated: WorkflowDefinition = { ...def, steps };
    return this.save(updated);
  }
}
