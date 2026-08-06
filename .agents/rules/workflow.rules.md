# Workflow Rules & Agent Guide — Spaces

Reglas y estándares inamovibles para el subsistema de workflows en Spaces. Todo agente que consulte, modifique, construya o ejecute workflows debe seguir esta guía.

## 1. Modelo de Arquitectura y Grafo DAG

- Los workflows en Spaces son grafos acíclicos dirigidos (DAG) compuestos por pasos (`WorkflowStep`).
- El orden de ejecución se determina automáticamente mediante resolución topológica por lotes (batches de ejecución en paralelo).
- Un paso solo se ejecuta cuando **todos** los pasos especificados en su campo `dependsOn` han finalizado con éxito (`success` o `pinned`).
- **Validez del Grafo:** Todo workflow debe ser un DAG válido sin ciclos. Si se introducen dependencias circulares, la ejecución fallará.

## 2. Tipos de Pasos (Step Types)

| Tipo | Propósito | Campos Obligatorios | Campos Opcionales |
|---|---|---|---|
| `agent` | Delega una tarea a un subagente autónomo | `id`, `type`, `label`, `taskTemplate` | `agentId`, `subagentType`, `maxSteps`, `captureOutputs`, `dependsOn`, `pinnedOutputs` |
| `if` | Bifurcación binaria condicional (true/false) | `id`, `type`, `label`, `condition`, `branches` | `dependsOn`, `pinnedOutputs` |
| `switch` | Bifurcación múltiple por valor de clave | `id`, `type`, `label`, `condition`, `branches` | `dependsOn`, `pinnedOutputs` |
| `merge` | Punto de convergencia para ramas divergentes | `id`, `type`, `label` | `dependsOn`, `pinnedOutputs` |
| `approval` | Pausa el workflow hasta confirmación del usuario | `id`, `type`, `label`, `approvalMessage` | `dependsOn`, `pinnedOutputs` |
| `code` | Código TS/JS ejecutado en sandbox aislado | `id`, `type`, `label`, `codeSnippet` | `codeTimeout`, `dependsOn`, `pinnedOutputs` |

## 3. Expresiones e Interpolación de Variables

- **Interpolación en plantillas de texto** (`taskTemplate`, `approvalMessage`):
  - `{{inputs.miVariable}}` o `{{$inputs.miVariable}}` para variables de entrada.
  - `{{stepId.outputs.miSalida}}` para salidas de pasos completados previa ejecución.
- **Evaluación de condiciones (`if`, `switch`):**
  - Se evalúan en un sandbox de expresiones con contexto `$inputs`, `$steps`, y entradas globales.
  - Ejemplo de condición en paso `if`: `"$inputs.score >= 80"` o `"$steps.eval_step.outputs.passed === true"`.
- **Sandbox de Código (`code`):**
  - Los snippet reciben en scope las variables del workflow y deben retornar un objeto plano o valor serializable JSON.

## 4. Estrategias de Error y Reintentos

- `onError: "stop"` (predeterminado): Si un paso falla (`status: "error"`), la ejecución del workflow se detiene inmediatamente marcando el run como `error`.
- `onError: "continue"`: El fallo de un paso no interrumpe los pasos independientes en otros lotes del DAG.
- `onError: "retry"`: Si un paso falla, se reintenta automáticamente hasta `retryCount` veces (o 1 reintento por defecto) antes de marcarlo como fallido.

## 5. Herramienta `manage_workflow` (Single Tool Pattern)

Todas las interacciones de los agentes con workflows deben realizarse exclusivamente vía el tool `manage_workflow`:

- `action: "contract"` — Muestra los esquemas formales y tipos de campos disponibles.
- `action: "list"` — Lista workflows (filtrable por `scopeType` o `entityId`).
- `action: "get"` — Obtiene un workflow por `workflowId`.
- `action: "save"` — Guarda la definición completa de un workflow (`WorkflowDefinition`).
- `action: "delete"` — Elimina un workflow por `workflowId`.
- `action: "add_step"` — Añade un paso a un workflow existente.
- `action: "update_step"` — Modifica propiedades de un paso específico.
- `action: "remove_step"` — Elimina un paso y limpia sus referencias en el grafo.
- `action: "connect_steps"` — Conecta dos pasos (dependencia o rama).
- `action: "run"` — Inicia la ejecución de un workflow con inputs dados.
- `action: "get_run"` — Consulta el estado y detalle de ejecución de un run por `runId`.
- `action: "list_runs"` — Lista los historial de ejecuciones de un workflow.
- `action: "abort"` — Cancela una ejecución en curso por `runId`.
- `action: "approve"` — Resuelve un paso en pausa de aprobación (`approved: true | false`).

## 6. Guía de Debugging y Diagnóstico

1. **Inspección de Fallos:**
   - Usar `action: "get_run"` pasando el `runId` correspondiente.
   - Revisar `stepStates[stepId]` para ubicar el paso con `status: "error"`.
   - Analizar la propiedad `error` en el `WorkflowStepState` correspondiente.
2. **Simulación Previa (Dry Run):**
   - Antes de ejecutar workflows con efectos secundarios reales en producción, usar `action: "run"` con `dryRun: true`.
   - Utilizar `pinnedOutputs` en los pasos durante pruebas aisladas para fijar valores de salida sin invocar agentes ni código real.
3. **Pausas y Bloqueos:**
   - Si un run se queda en `waiting_approval`, verificar el mensaje de solicitud y responder mediante `action: "approve"`.
   - Si una ejecución se cuelga o requiere cancelación forzada, invocar `action: "abort"`.
