// SPDX-License-Identifier: MIT
import type { WorkflowDefinition, WorkflowStep } from "shared";
import type { IWorkflowEngine } from "../../../ports/workflow-engine.port";
import { WorkflowCrudActions } from "./workflow-crud-actions";
import { WorkflowRunActions } from "./workflow-run-actions";
import { WORKFLOW_CONTRACT } from "./workflow-schema-contracts";

export interface CreateManageWorkflowToolOptions {
  username: string;
  sessionId: string;
  workflowEngine?: IWorkflowEngine;
}

export function createManageWorkflowTool(opts: CreateManageWorkflowToolOptions) {
  const crud = new WorkflowCrudActions({
    username: opts.username,
    workflowEngine: opts.workflowEngine,
  });

  const runs = new WorkflowRunActions({
    username: opts.username,
    sessionId: opts.sessionId,
    workflowEngine: opts.workflowEngine,
  });

  return {
    name: "manage_workflow",
    description:
      "Herramienta integral para crear, modificar, ejecutar, inspeccionar, controlar (abort/approve) y debuguear workflows automatizados. Usa action: 'contract' para ver esquemas de cada tipo de paso.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: [
            "contract",
            "list",
            "get",
            "save",
            "delete",
            "add_step",
            "update_step",
            "remove_step",
            "connect_steps",
            "run",
            "get_run",
            "list_runs",
            "abort",
            "approve",
          ],
          description: "Acción a realizar en el subsistema de workflows.",
        },
        workflowId: {
          type: "string",
          description: "ID del workflow objetivo (requerido para get, save, delete, add_step, update_step, remove_step, connect_steps, run, list_runs).",
        },
        runId: {
          type: "string",
          description: "ID de la ejecución objetivo (requerido para get_run, abort, approve).",
        },
        stepId: {
          type: "string",
          description: "ID del paso específico (requerido para update_step, remove_step, approve).",
        },
        definition: {
          type: "object",
          description: "Definición completa de WorkflowDefinition para la acción 'save'.",
        },
        step: {
          type: "object",
          description: "Objeto de WorkflowStep para la acción 'add_step'.",
        },
        updates: {
          type: "object",
          description: "Propiedades parciales de WorkflowStep a actualizar en 'update_step'.",
        },
        insertAfterStepId: {
          type: "string",
          description: "ID del paso tras el cual insertar en 'add_step' (opcional).",
        },
        fromStepId: {
          type: "string",
          description: "Paso origen para la acción 'connect_steps'.",
        },
        toStepId: {
          type: "string",
          description: "Paso destino para la acción 'connect_steps'.",
        },
        branchKey: {
          type: "string",
          description: "Clave de rama para 'connect_steps' si el paso origen es condicional ('true', 'false', o valor de switch).",
        },
        inputs: {
          type: "object",
          description: "Variables de entrada key-value para 'run'.",
        },
        dryRun: {
          type: "boolean",
          description: "Ejecutar en modo simulación (dryRun) para validar el flujo sin efectos secundarios.",
        },
        approved: {
          type: "boolean",
          description: "Respuesta de aprobación boolean (true para aprobar, false para rechazar) en 'approve'.",
        },
        scopeType: {
          type: "string",
          description: "Filtro por alcance en 'list': global | team | project | agent.",
        },
        entityId: {
          type: "string",
          description: "Filtro por entidad asociada en 'list'.",
        },
      },
      required: ["action"],
    },
    execute: async (_id: string, args: Record<string, any>) => {
      try {
        switch (args.action) {
          case "contract":
            return {
              content: [{ type: "text" as const, text: JSON.stringify(WORKFLOW_CONTRACT, null, 2) }],
            };

          case "list":
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify(crud.list({ scopeType: args.scopeType, entityId: args.entityId }), null, 2),
                },
              ],
            };

          case "get":
            if (!args.workflowId) throw new Error("Argument 'workflowId' is required for action 'get'.");
            return {
              content: [{ type: "text" as const, text: JSON.stringify(crud.get(args.workflowId), null, 2) }],
            };

          case "save":
            if (!args.definition) throw new Error("Argument 'definition' is required for action 'save'.");
            const saved = await crud.save(args.definition as WorkflowDefinition);
            return {
              content: [{ type: "text" as const, text: `Workflow '${saved.id}' saved successfully.` }],
              details: { workflow: saved },
            };

          case "delete":
            if (!args.workflowId) throw new Error("Argument 'workflowId' is required for action 'delete'.");
            await crud.delete(args.workflowId);
            return {
              content: [{ type: "text" as const, text: `Workflow '${args.workflowId}' deleted.` }],
            };

          case "add_step":
            if (!args.workflowId || !args.step)
              throw new Error("Arguments 'workflowId' and 'step' are required for action 'add_step'.");
            const withAddedStep = await crud.addStep({
              workflowId: args.workflowId,
              step: args.step as WorkflowStep,
              insertAfterStepId: args.insertAfterStepId,
            });
            return {
              content: [{ type: "text" as const, text: `Step '${args.step.id}' added to workflow '${args.workflowId}'.` }],
              details: { workflow: withAddedStep },
            };

          case "update_step":
            if (!args.workflowId || !args.stepId || !args.updates)
              throw new Error("Arguments 'workflowId', 'stepId', and 'updates' are required for action 'update_step'.");
            const withUpdatedStep = await crud.updateStep({
              workflowId: args.workflowId,
              stepId: args.stepId,
              updates: args.updates,
            });
            return {
              content: [{ type: "text" as const, text: `Step '${args.stepId}' updated in workflow '${args.workflowId}'.` }],
              details: { workflow: withUpdatedStep },
            };

          case "remove_step":
            if (!args.workflowId || !args.stepId)
              throw new Error("Arguments 'workflowId' and 'stepId' are required for action 'remove_step'.");
            const withRemovedStep = await crud.removeStep({
              workflowId: args.workflowId,
              stepId: args.stepId,
            });
            return {
              content: [{ type: "text" as const, text: `Step '${args.stepId}' removed from workflow '${args.workflowId}'.` }],
              details: { workflow: withRemovedStep },
            };

          case "connect_steps":
            if (!args.workflowId || !args.fromStepId || !args.toStepId)
              throw new Error("Arguments 'workflowId', 'fromStepId', and 'toStepId' are required for 'connect_steps'.");
            const connected = await crud.connectSteps({
              workflowId: args.workflowId,
              fromStepId: args.fromStepId,
              toStepId: args.toStepId,
              branchKey: args.branchKey,
            });
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Connected step '${args.fromStepId}' to '${args.toStepId}' in workflow '${args.workflowId}'.`,
                },
              ],
              details: { workflow: connected },
            };

          case "run":
            if (!args.workflowId) throw new Error("Argument 'workflowId' is required for action 'run'.");
            const runObj = await runs.run({
              workflowId: args.workflowId,
              inputs: args.inputs,
              dryRun: args.dryRun,
            });
            return {
              content: [{ type: "text" as const, text: `Workflow run started. Run ID: ${runObj.id}` }],
              details: { run: runObj },
            };

          case "get_run":
            if (!args.runId) throw new Error("Argument 'runId' is required for action 'get_run'.");
            return {
              content: [{ type: "text" as const, text: JSON.stringify(runs.getRun(args.runId), null, 2) }],
            };

          case "list_runs":
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify(runs.listRuns(args.workflowId), null, 2),
                },
              ],
            };

          case "abort":
            if (!args.runId) throw new Error("Argument 'runId' is required for action 'abort'.");
            await runs.abort(args.runId);
            return {
              content: [{ type: "text" as const, text: `Workflow run '${args.runId}' aborted.` }],
            };

          case "approve":
            if (!args.runId || !args.stepId || typeof args.approved !== "boolean")
              throw new Error("Arguments 'runId', 'stepId', and 'approved' (boolean) are required for 'approve'.");
            runs.approve({
              runId: args.runId,
              stepId: args.stepId,
              approved: args.approved,
            });
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Approval resolved for run '${args.runId}' step '${args.stepId}' with status ${args.approved}.`,
                },
              ],
            };

          default:
            throw new Error(`Unknown action '${args.action}'. Action 'contract' presents available capabilities.`);
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error: ${errorMsg}` }],
          isError: true,
        };
      }
    },
  };
}
