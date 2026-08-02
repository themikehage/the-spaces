# Auditoría de Implementación — Planes 16, 17 y 18

> Verificación del estado real del código después de ejecutar los planes de remoción de código legacy. Basado en 4 subagentes de auditoría.

---

## Resumen Ejecutivo

| Plan                                | Completitud | Issues Críticos                                                                                                     |
| ----------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------- |
| 16 — Cablear AppContext + WS Core   | **85%**     | Carpeta `ws/` vieja sigue en disco, importada por 6 archivos. 1500 líneas de rutas viejas son dead code.            |
| 17 — Eliminar vendor + AgentSession | **80%**     | `team-prompt-runner.ts` crashea en runtime (streamSimple roto). `session-manager.ts` usa `type AgentSession = any`. |
| 18 — Eliminar 26 singletons         | **4%**      | Solo se eliminó `sessionManager`. 25 de 26 singletons siguen activos con sus `export const`.                        |

---

## Plan 16 — Cablear AppContext y Migrar WS + Rutas Core

### ✅ Completado Correctamente

| Requisito                                | Evidencia                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `createServerContext()` eliminado        | Archivo `core/server-context.ts` no existe. Cero imports de `createServerContext` en todo el server           |
| `createAppContext()` es la única fábrica | `context.ts` (73 líneas) exporta `createAppContext()`. Cablea los 6 paquetes `@spaces/*` correctamente        |
| `/ws` usa engine                         | `routes/sessions/session-ws.ts` (94 líneas) usa `appContext.createSessionAgent()`. Cero imports de singletons |
| `/ws/v2` eliminado                       | Cero referencias en todo el codebase                                                                          |
| `index.ts` limpio                        | Sin imports de singletons, sin `ServerContext`. Solo `createAppContext` y `registerEngineWsRoute`             |
| Health check usa AppContext              | Inline en `index.ts:99-112`, usa `appContext.sessionStore` y `appContext.agentCache`                          |
| `@spaces/*` en server                    | 17 ocurrencias en 10 archivos — correcto, sin abusos                                                          |

### ❌ Pendiente / Incompleto

| Issue                                               | Severidad | Detalle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Carpeta `ws/` vieja sigue en disco**              | ALTA      | `ws/handler.ts` (219 líneas), `ws/factory.ts` (705 líneas), `ws/registry.ts` (185 líneas), `ws/logger.ts` no fueron eliminados. El handler es **importado por 6 archivos** de producción para `broadcastToUser`/`broadcastToSession`: `approval-manager.ts:2`, `preview-builder.ts:5`, `preview-watcher.ts:6`, `ui-approval-registry.ts:1`, `decompose-tool.ts:3`, `update-task-tool.ts:3`. Efectos secundarios se ejecutan al iniciar el servidor aunque la ruta vieja no está montada. |
| **1500 líneas de rutas viejas como dead code**      | MEDIA     | `routes/sessions.ts` (1396 líneas) y `routes/sessions/session-crud.ts` (112 líneas) no están montadas pero siguen en disco. Contienen referencias a `broadcastToSession` viejo y `(c as any).get?.("serverContext")`.                                                                                                                                                                                                                                                                    |
| **41 `new SessionManager()` fuera de `context.ts`** | MEDIA     | `ws/factory.ts` (8 calls), `factory-tool.ts` (15 calls), `manage-custom-tools-tool.ts` (3 calls), etc. Cada uno crea su propia instancia con su propio cache.                                                                                                                                                                                                                                                                                                                            |

---

## Plan 17 — Eliminar `ai/vendor/` y `AgentSession`

### ✅ Completado Correctamente

| Requisito                                    | Evidencia                                                                                                                                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ai/vendor/` eliminado                       | Directorio no existe. Cero imports de `ai/vendor` en todo el codebase. ~702 KB liberados                                                                                                         |
| `ai/agent-session.ts` eliminado              | El god object de 862 líneas fue borrado                                                                                                                                                          |
| 6 importadores de vendor migrados            | `navigation-controller.ts`, `tool-registry.ts`, `vision-tool.ts`, `image-gen-tool.ts` — todos limpios                                                                                            |
| 8 de 9 importadores de AgentSession migrados | `ai/index.ts`, `mcp-attach.ts`, `session-event-publisher.ts`, `session-memory-enricher.ts`, `pipeline-engine.ts`, `core-services.port.ts`, `agents/types.ts`, `agent-runtime.ts` — todos limpios |

### ❌ Pendiente / Incompleto

| Issue                                                   | Severidad   | Detalle                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`team-prompt-runner.ts:222` — CRASH en runtime**      | **CRÍTICA** | `streamSimple` se redefinió como `throw new Error("streamSimple from vendor is deprecated...")` en línea 13-17. Pero **se sigue llamando** en línea 222: `stream = streamSimple(model as any, context as any, options)`. Cada `TeamPromptRunner.runStateless()` crashea. |
| **`session-manager.ts:21` — `type AgentSession = any`** | ALTA        | El plan exigía usar `IAgentRuntime`. En vez de eso, se redefinió `AgentSession` localmente como `any`. Líneas 21-22: `type AgentSession = any; type AgentSessionEvent = any;`. Viola la regla "cero `any`" y no aprovecha el tipado del engine.                          |
| **`agent-runtime.ts:54` — `IAgentRuntime \| any`**      | ALTA        | La unión con `any` hace el tipo inútil. En líneas 267-275 el objeto `session` se construye como un literal `any` en vez de instanciar `createAgent()` del engine.                                                                                                        |

---

## Plan 18 — Eliminar los 26 Singletons → DI

### ✅ Completado Correctamente

| Singleton        | Estado                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| `sessionManager` | **Eliminado**. El `export const` ya no existe. Se reemplazó por `new SessionManager()` temporal en cada callsite. |

### ❌ Pendiente — 25 de 26 Singletons Siguen Activos

#### Grupo 1 — Los 5 críticos (4 pendientes)

| #   | Singleton            | Archivo:Línea                      | Consumidores activos |
| --- | -------------------- | ---------------------------------- | -------------------- |
| 2   | `delegationRegistry` | `core/delegation-registry.ts:228`  | 6 archivos           |
| 3   | `mcpRegistry`        | `core/mcp-registry.ts:485`         | 5 archivos           |
| 4   | `memoryRegistry`     | `core/memory/registry.ts:47`       | 2 archivos           |
| 5   | `uiApprovalRegistry` | `core/ui-approval-registry.ts:144` | 6 archivos           |

#### Grupo 2 — Servicios de sesión (6 pendientes)

| #   | Singleton               | Archivo:Línea                                | Consumidores activos         |
| --- | ----------------------- | -------------------------------------------- | ---------------------------- |
| 6   | `sessionPromptBuilder`  | `core/session/prompt-builder.ts:545`         | 2                            |
| 7   | `sessionLister`         | `core/session/session-lister.ts:304`         | 1                            |
| 8   | `sessionToolFactory`    | `core/session/tool-factory.ts:204`           | 2                            |
| 9   | `sessionMetadataStore`  | `core/session/metadata-store.ts:241`         | **13** — el más referenciado |
| 10  | `userConfigManager`     | `core/session/user-config.ts:216`            | **17** — el más referenciado |
| 11  | `workspaceConfigLoader` | `core/session/workspace-config-loader.ts:25` | 3                            |

#### Grupo 3 — Servicios de dominio (11 pendientes)

| #   | Singleton                | Archivo:Línea                                   | Consumidores activos      |
| --- | ------------------------ | ----------------------------------------------- | ------------------------- |
| 12  | `scopeConfigManager`     | `core/scope/scope-config-manager.ts:496`        | 10                        |
| 13  | `permissionEngine`       | `core/sandbox/permission-engine.ts:237`         | 3                         |
| 14  | `userPermissionStore`    | `core/sandbox/user-permission-store.ts:71`      | 5                         |
| 15  | `promptFragmentRegistry` | `core/prompts/registry.ts:78`                   | 2                         |
| 16  | `promptComposer`         | `core/prompts/composer.ts:163`                  | 3                         |
| 17  | `customToolStorage`      | `core/custom-tools/storage.ts:145`              | 2                         |
| 18  | `pipelineExecutionStack` | `core/custom-tools/runtime.ts:6`                | **0** — low-hanging fruit |
| 19  | `scheduleService`        | `core/schedules/index.ts:5`                     | 3                         |
| 20  | `approvalManager`        | `core/approvals/approval-manager.ts:168`        | 4                         |
| 21  | `serverSpacesHost`       | `core/spaces-host.ts:164`                       | **0** — low-hanging fruit |
| 22  | `modelEnrichmentService` | `core/providers/model-enrichment-service.ts:32` | **0** — low-hanging fruit |

#### Grupo 4 — Infraestructura (3 pendientes)

| #   | Singleton                | Archivo:Línea                                    | Consumidores activos |
| --- | ------------------------ | ------------------------------------------------ | -------------------- |
| 23  | `observabilityService`   | `core/observability/observability-service.ts:84` | 1                    |
| 24  | `circuitBreakerRegistry` | `core/circuit-breaker.ts:101`                    | 1                    |
| 25  | `rateLimiter`            | `core/tools/web-fetch/rate-limiter.ts:60`        | 2                    |
| 26  | `webFetchCache`          | `core/tools/web-fetch/cache.ts:77`               | 1                    |

---

## Problemas Cross-Cutting

### `any` types: 315 ocurrencias en código no-test

| Directorio      | Count |
| --------------- | ----- |
| `routes/`       | 64    |
| `core/tools/`   | 61    |
| `core/` (root)  | 29    |
| `core/session/` | 27    |
| `ai/`           | 22    |
| `ws/`           | 18    |

### `as any` casts: 88 ocurrencias

Distribuidos en `ws/` (12), `core/custom-tools/` (12), `ai/` (12), `routes/` (11).

### Archivos > 300 líneas: 25

| Líneas                   | Archivo                                 | Estado                 |
| ------------------------ | --------------------------------------- | ---------------------- |
| **1396**                 | `routes/sessions.ts`                    | Dead code              |
| **981**                  | `routes/files.ts`                       | Activo                 |
| **903**                  | `core/tools/factory-tool.ts`            | Activo                 |
| **762**                  | `core/tools/manage-delegations-tool.ts` | Activo                 |
| **705**                  | `ws/factory.ts`                         | Dead code (no montado) |
| 599                      | `routes/teams.ts`                       | Activo                 |
| 545                      | `core/session/prompt-builder.ts`        | Activo                 |
| 500                      | `core/scope/scope-config-manager.ts`    | Activo                 |
| 496                      | `core/mcp-registry.ts`                  | Activo                 |
| + 16 más entre 300 y 430 | —                                       | Activos                |

### `ai/` directory: 22 archivos sobreviven

Todo el directorio `ai/` sigue vivo y compartido entre el código viejo y nuevo. Los archivos principales: `model-registry.ts`, `session-persistence.ts`, `compaction-manager.ts`, `context-estimator.ts`, `resource-loader.ts`, `bash-tool.ts`, + 8 tools en `ai/tools/`. Esto es el puente entre ambos mundos.

---

## Priorización de Correcciones

### 🔴 Bloqueantes (deben resolverse ya)

1. **`team-prompt-runner.ts:222` crashea** — reemplazar shim de `streamSimple` por `IModelProvider.streamComplete()` de `@spaces/providers`
2. **`session-manager.ts:21` `type AgentSession = any`** — reemplazar por `IAgentRuntime` de `@spaces/core`
3. **`agent-runtime.ts:54` `IAgentRuntime | any`** — eliminar el `| any`, usar `createAgent()` del engine
4. **Eliminar carpeta `ws/` vieja** — migrar 6 consumidores de `broadcastToUser`/`broadcastToSession` al `IEventBus` del engine, eliminar los 4 archivos

### 🟠 Alta Prioridad

5. **Eliminar 1500 líneas de dead code** — borrar `routes/sessions.ts` y `routes/sessions/session-crud.ts`
6. **Unificar `SessionManager`** — eliminar los 41 `new SessionManager()`, usar solo `appContext.sessionManager`
7. **Eliminar 3 singletons sin consumidores** — `pipelineExecutionStack`, `serverSpacesHost`, `modelEnrichmentService`

### 🟡 Media Prioridad

8. Continuar Plan 18 con los 22 singletons restantes
9. Reducir `any` types (315 → meta < 50)
10. Partir archivos > 300 líneas

---

_Auditoría realizada sobre ~270 archivos de `apps/server/src/` y `packages/`. Basado en 4 subagentes de exploración en paralelo._
