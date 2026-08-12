# Plan 39 — Delegación asíncrona: el delegador no debe hacer polling (será notificado)

**Estado:** 🔜 Pendiente de implementar — diagnóstico completado

## Objetivo

Que el agente orquestador (delegador) sepa que la delegación es **asíncrona / fire-and-forget**: no necesita estar "pinedo"/consultando el estado de la tarea, porque cuando el delegado termine, **el resultado le llega automáticamente**.

## Contexto — el mecanismo ya existe, falta decirlo

La auto-notificación **ya está implementada** server-side:

- `apps/server/src/core/session/agent-utils.ts:372-473` — `handleDelegationCompletion`:
  1. `delegationRegistry.complete(...)` (399).
  2. Formatea el resultado con `formatDelegationResultMessage` (413-419), que arma el mensaje `[Delegation Completed] ...`.
  3. `parent.addDelegationResult(toolResultMsg)` (429) — encola el resultado en la sesión padre.
  4. Si el padre no está streameando → `parent.continue()` (436) con reintento a 1s (441-449). El padre **se despierta solo** con el resultado.

El problema es de **comunicación al modelo**: las instrucciones que recibe el orquestador no le dicen que esto es asíncrono. El agente entonces "pinea"/consulta repetidamente el progreso, gastando turnos/tokens innecesarios.

## Diseño

Cambio de prompt (primario) + tool description (secundario). **Sin cambios de lógica server**: la notificación ya funciona.

### 1. Instrucciones del sistema (primario)

`apps/server/src/core/prompts/system-instructions.ts` — las dos instrucciones que ve el orquestador (se inyectan en toda sesión estándar vía `STANDARD_APPEND_INSTRUCTIONS`, `prompt-assembly.ts:33-41`):

- **`SUBAGENT_DELEGATION_INSTRUCTIONS`** (líneas 33-41) — añadir al final:
  ```
  Delegation is ASYNCHRONOUS. After calling manage_delegations(action: "spawn", ...), do NOT poll, ping, or repeatedly check on the subagent's progress. The result is delivered to you automatically when the subagent finishes (you are resumed with a "[Delegation Completed]" message). Continue any independent work in parallel, or wait for that automatic notification.
  ```
- **`TASK_DELEGATION_INSTRUCTIONS`** (líneas 48-54) — añadir una frase equivalente:
  ```
  Delegation is ASYNCHRONOUS. Do NOT poll or re-check the target's status after delegating. You will be automatically resumed with the result when it completes.
  ```

### 2. Descripción del tool (secundario)

`apps/server/src/core/tools/extensions/manage-delegations.tool.ts:62-64` — en el `description` del tool, agregar una frase corta:

```
Delegation is asynchronous: after delegating, do not poll for status — you will be notified automatically when the delegate completes.
```

> Nota: las instrucciones del **subagente** (`buildSubagentInstructions` / `wrapDelegationTask` en `prompt-assembly.ts:48-90`) NO se tocan: son para el ejecutor, no para el delegador.

## Verificación

- `pnpm --filter server run typecheck` (o `pnpm build`).
- Test manual: agente delega una tarea vía `manage_delegations` → el orquestador NO realiza llamadas de polling entre delegar y recibir el resultado → al completar, el padre se auto-reanuda con el mensaje `[Delegation Completed]`.
- Revisar el system prompt armado (`assemblePromptAppends` modo `standard-session`) para confirmar que el texto nuevo aparece.

## Archivos implicados

- `apps/server/src/core/prompts/system-instructions.ts` — `SUBAGENT_DELEGATION_INSTRUCTIONS` + `TASK_DELEGATION_INSTRUCTIONS`.
- `apps/server/src/core/tools/extensions/manage-delegations.tool.ts` — `description` del tool.
- (referencia, sin cambios) `apps/server/src/core/session/agent-utils.ts` — `handleDelegationCompletion` (mecanismo de notificación ya existente).
