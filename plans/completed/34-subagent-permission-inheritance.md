# Plan 34 — Subagentes no heredan permisos del delegador

**Estado:** 🔜 Pendiente de implementar — diagnóstico completado

## Síntoma

Los subagentes/delegados piden autorización para operaciones que su delegador puede ejecutar de forma autónoma (p.ej. un delegador con `executionMode: "autonomous"` o con `permissionOverrides` permite `write/edit/bash`, pero el subagente falla a "builder" y pide aprobación para cada uno).

## Arquitectura del gate

- Verdicto de 3 estados en `apps/server/src/core/sandbox/permission-engine.ts:6-7,155-220` (`{allow:true}` | `{allow:false}` | `{allow:"ask"}`).
- Para subagentes (paso 3 del evaluate, líneas 188-205): deriva `subagentType` desde `executionMode` y llama `buildSubagentRules`/`evaluateSubagentRules` (`core/sandbox/subagent-permissions.ts`).
- Decisión final de aprobación en `apps/server/src/core/session/before-tool-call-hook.ts:61-92`.

## Causas raíz (4 gaps confirmados)

### 1. `parentSessionId` nunca llega al hook
`agent-runtime.ts:261-267` llama `createBeforeToolCallHook({ sessionId, isSubagent, username, permissionOverrides, approvalManager })` **sin `parentSessionId`** (aunque computa `existingParentId` en línea 302-316). Por eso:
- `permissionEngine.evaluate` recibe `parentSessionId: undefined` (`before-tool-call-hook.ts:65`) → en `subagent-permissions.ts:148-178` el bloque de "parent constraints" (ceiling read-only + herencia de `permissionRules` del padre) se **salta**.
- `approvalManager.request` lleva `parentSessionId: undefined` (`before-tool-call-hook.ts:84`) → las aprobaciones no se atribuyen al padre en la UI.

### 2. `permissionOverrides` es código muerto
Se carga en `agent-runtime.ts:265`, se declara en `permission-engine.ts:16` y **nunca se lee** en `evaluate()`. Gap documentado y sin implementar en `plans/completed/12-entity-config-cascade.md`.

### 3. Las `effectiveRules` calculadas en spawn solo se persisten
`manage-delegations.tool.ts:161-166` (spawn) y legacy `spawn-subagent.ts:79-84` escriben `metadata.permissionRules`, usadas **solo** para herencia de nietos (`subagent-permissions.ts:168-177`), no para regir el propio subagente. El gate real sale solo de `executionMode`/`subagentType` de su metadata.

### 4. Delegados pierden el tipo
`delegate` no persiste `subagentType` (`manage-delegations.tool.ts:421-432`) y cae a builder/ask cuando tampoco hay `executionMode`.

## Plan de fix

1. Pasar `parentSessionId: existingParentId` al `createBeforeToolCallHook` en `agent-runtime.ts:261-267` → habilita herencia de reglas del padre en `subagent-permissions.ts:148-178` y atribuye aprobaciones al padre.
2. Consumir `permissionOverrides` en `PermissionEngine.evaluate()` como capa sobre las reglas default (antes del fallback ASK).
3. Hacer que el subagente use su `metadata.permissionRules` persistida como fuente para el gate en caliente.
4. En `delegate`, persistir `subagentType` cuando haya `autonomyMode` para no degradar a builder.

## Verificación

Suite existente: `apps/server/src/__tests__/subagent-permission-inheritance.test.ts` y `subagent-permissions.test.ts`. Añadir assert: delegador con `permissionOverrides {bash:"allow"}` → subagente NO pide aprobación para bash.

## Archivos implicados

- `apps/server/src/core/session/agent-runtime.ts` (hook options)
- `apps/server/src/core/session/before-tool-call-hook.ts`
- `apps/server/src/core/sandbox/permission-engine.ts`
- `apps/server/src/core/sandbox/subagent-permissions.ts`
- `apps/server/src/core/tools/extensions/manage-delegations.tool.ts`
- `apps/server/src/core/session/spawn-subagent.ts`
- `apps/server/src/core/sandbox/user-permission-store.ts`