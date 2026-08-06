// SPDX-License-Identifier: MIT

export interface StepTypeSchema {
  type: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  fieldDescriptions: Record<string, string>;
}

export interface WorkflowContract {
  entity: string;
  description: string;
  onErrorOptions: string[];
  stepTypes: Record<string, StepTypeSchema>;
  workflowDefinitionFields: Record<string, string>;
}

export const WORKFLOW_CONTRACT: WorkflowContract = {
  entity: "workflow",
  description:
    "Engine de automatizaciones DAG compuestas por pasos paralelos o secuenciales execution, branches condicionales, sandbox de código TS/JS, delegaciones a subagentes y aprobaciones humanas.",
  onErrorOptions: ["stop", "continue", "retry"],
  workflowDefinitionFields: {
    id: "string (UUID v4 o ID único slug)",
    name: "string - Nombre visible del workflow",
    description: "string - Explicación detallada del propósito del workflow",
    scopeType: "global | team | project | agent - Alcance de disponibilidad",
    entityId: "string - ID de la entidad asociada si scopeType no es global",
    version: "number - Versión incremental del esquema",
    onError: "stop | continue | retry - Estrategia ante fallo de un paso",
    retryCount: "number - Cantidad de reintentos si onError es 'retry'",
    steps: "Array<WorkflowStep> - Lista de pasos del DAG",
  },
  stepTypes: {
    agent: {
      type: "agent",
      description: "Delega una tarea autónoma a un agente o subagente especificado.",
      requiredFields: ["id", "type", "label", "taskTemplate"],
      optionalFields: [
        "agentId",
        "subagentType",
        "maxSteps",
        "captureOutputs",
        "dependsOn",
        "pinnedOutputs",
      ],
      fieldDescriptions: {
        id: "string - Identificador único del paso",
        type: "literal 'agent'",
        label: "string - Título legible del paso",
        taskTemplate: "string - Prompt o instrucción con interpolación de variables como {{inputs.var}} o {{step_1.outputs.res}}",
        agentId: "string - ID opcional del agente objetivo a ejecutar",
        subagentType: "builder | explorer | executor | planner - Tipo de rol del subagente",
        maxSteps: "number - Límite máximo de iteraciones del agente",
        captureOutputs: "Array<string> - Claves de salida a capturar en $steps.stepId.outputs",
        dependsOn: "Array<string> - IDs de pasos anteriores que deben finalizar antes de iniciar este paso",
        pinnedOutputs: "Record<string, unknown> - Valores fijos para saltar ejecución real (mock/test)",
      },
    },
    if: {
      type: "if",
      description: "Evaluación condicional que bifurca el flujo hacia 'true' o 'false'.",
      requiredFields: ["id", "type", "label", "condition", "branches"],
      optionalFields: ["dependsOn", "pinnedOutputs"],
      fieldDescriptions: {
        id: "string - Identificador único del paso",
        type: "literal 'if'",
        label: "string - Título legible",
        condition: "string - Expresión JS a evaluar como boolean (ej: '$inputs.amount > 100')",
        branches: "{ true?: string[], false?: string[] } - Mapeo de rama activa a IDs de pasos destino",
        dependsOn: "Array<string> - Dependencias de precedencia",
      },
    },
    switch: {
      type: "switch",
      description: "Bifurcación múltiple basada en la evaluación de una expresión.",
      requiredFields: ["id", "type", "label", "condition", "branches"],
      optionalFields: ["dependsOn", "pinnedOutputs"],
      fieldDescriptions: {
        id: "string - Identificador único del paso",
        type: "literal 'switch'",
        label: "string - Título legible",
        condition: "string - Expresión que evalúa a un string clave",
        branches: "Record<string, string[]> - Mapeo de resultado de expresión a IDs de pasos destino",
        dependsOn: "Array<string> - Dependencias de precedencia",
      },
    },
    merge: {
      type: "merge",
      description: "Punto de convergencia que sincroniza ramas divergentes.",
      requiredFields: ["id", "type", "label"],
      optionalFields: ["dependsOn", "pinnedOutputs"],
      fieldDescriptions: {
        id: "string - Identificador único del paso",
        type: "literal 'merge'",
        label: "string - Título legible",
        dependsOn: "Array<string> - Pasos provenientes de las ramas que deben converger",
      },
    },
    approval: {
      type: "approval",
      description: "Pausa la ejecución del workflow requiriendo confirmación manual previa.",
      requiredFields: ["id", "type", "label", "approvalMessage"],
      optionalFields: ["dependsOn", "pinnedOutputs"],
      fieldDescriptions: {
        id: "string - Identificador único del paso",
        type: "literal 'approval'",
        label: "string - Título legible",
        approvalMessage: "string - Mensaje presentado al usuario para solicitar la aprobación",
        dependsOn: "Array<string> - Dependencias de precedencia",
      },
    },
    code: {
      type: "code",
      description: "Ejecuta fragmentos JS/TS en un sandbox aislado con timeout.",
      requiredFields: ["id", "type", "label", "codeSnippet"],
      optionalFields: ["codeTimeout", "dependsOn", "pinnedOutputs"],
      fieldDescriptions: {
        id: "string - Identificador único del paso",
        type: "literal 'code'",
        label: "string - Título legible",
        codeSnippet: "string - Código JS a ejecutar. Debe retornar un objeto plano o valor de salida",
        codeTimeout: "number - Timeout en ms (default: 5000ms)",
        dependsOn: "Array<string> - Dependencias de precedencia",
      },
    },
  },
};
