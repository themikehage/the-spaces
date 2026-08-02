# Auditoría Final — Post-Implementación Planes 16-21

> Estado real del código después de ejecutar los 6 planes de remoción de código legacy. Basado en 3 subagentes de auditoría.

---

## Resumen Ejecutivo

| Área                     | Puntaje                         | Estado                        |
| ------------------------ | ------------------------------- | ----------------------------- |
| `apps/server/src/`       | **83%** (58/70)                 | 12 issues pendientes          |
| `apps/client/src/`       | **97%** (32/33)                 | 1 warning trivial             |
| `packages/` (8 paquetes) | **100%** (todas las categorías) | Impecable                     |
| **Global**               | **~91%**                        | El lastre está en el servidor |

---

## 1. Funcionalidades Desconectadas — ✅ 7/7

Todo el cableado está correcto:

- `index.ts` monta 19 rutas con un solo `AppContext`
- Los 29 imports de rutas resuelven a archivos existentes
- Solo un WebSocket endpoint (`/ws` vía `registerEngineWsRoute`)
- El WS handler usa `appContext.createSessionAgent()` → `IAgentRuntime` del engine
- `routes/sessions/` tiene solo 3 archivos: `index.ts`, `engine-session-crud.ts`, `session-ws.ts`
- El viejo `sessions.ts` (1396 líneas) fue eliminado

---

## 2. Código Muerto — ✅ 26/26

Todos los archivos target fueron eliminados:

| Categoría                                              | Archivos     |
| ------------------------------------------------------ | ------------ |
| `ai/vendor/` (70+ archivos)                            | ✅ Eliminado |
| `ai/agent-session.ts` (862 líneas)                     | ✅ Eliminado |
| `core/server-context.ts`                               | ✅ Eliminado |
| `core/event-bus.ts`                                    | ✅ Eliminado |
| `core/tool-registry.ts`                                | ✅ Eliminado |
| `ai/prompt-builder.ts`                                 | ✅ Eliminado |
| `ai/session-persistence.ts`                            | ✅ Eliminado |
| `core/sandbox/permission-engine.ts`                    | ✅ Eliminado |
| `ws/` (4 archivos: handler, factory, registry, logger) | ✅ Eliminado |
| `routes/sessions.ts` + `session-crud.ts`               | ✅ Eliminado |
| `core/navigation-controller.ts`                        | ✅ Eliminado |
| Preview server (3 archivos + ruta)                     | ✅ Eliminado |
| Gallery, Backup routes                                 | ✅ Eliminado |
| Image/Video/Vision tools                               | ✅ Eliminado |
| Exa search, Pipelines                                  | ✅ Eliminado |

**El cliente también eliminó correctamente:**

- `api/client.ts` y `api/ws.ts` (unificados en `lib/`)
- 7 componentes v2 huérfanos (`Layout.tsx`, `ChatArea.tsx`, `ChatInput.tsx`, `MessageList.tsx`, `MessageBubble.tsx`, `Markdown.tsx`, `SessionList.tsx`)
- Ruta `/v2`

---

## 3. Funcionalidades Duplicadas — ⚠️ 5/7

| Concepto                                                                   | Estado |
| -------------------------------------------------------------------------- | ------ |
| `ISessionStore` — solo 2 impls en `@spaces/storage`                        | ✅     |
| `IToolRegistry` — solo `DefaultToolRegistry` en `@spaces/tools`            | ✅     |
| `IPermissionEngine` — solo en `@spaces/engine`                             | ✅     |
| `IPromptBuilder` — solo en `@spaces/engine`                                | ✅     |
| `IEventBus` — solo en `@spaces/engine`                                     | ✅     |
| `ToolRegistry` de `shared` — marcado `@deprecated` pero aún existe         | ⚠️     |
| `ISessionStore` de `shared` — marcado `@deprecated`, contrato en conflicto | ⚠️     |

Los 2 warnings son artefactos legacy en `shared` que ya están marcados `@deprecated`. No hay implementaciones activas que los usen. Bajo riesgo.

---

## 4. Pendiente Post-Migración que Debería Eliminarse — 🔴 7/12

### 4.1 Singletons activos en `core/`

**15+ singletons siguen vivos con `export const`:**

| Singleton               | Consumidores | Ubicación                                 |
| ----------------------- | ------------ | ----------------------------------------- |
| `delegationRegistry`    | 8            | `core/delegation-registry.ts`             |
| `mcpRegistry`           | 8            | `core/mcp-registry.ts`                    |
| `memoryRegistry`        | 3            | `core/memory/registry.ts`                 |
| `uiApprovalRegistry`    | 5            | `core/ui-approval-registry.ts`            |
| `approvalManager`       | varios       | `core/approvals/approval-manager.ts`      |
| `userPermissionStore`   | varios       | `core/sandbox/user-permission-store.ts`   |
| `scopeConfigManager`    | 10           | `core/scope/scope-config-manager.ts`      |
| `sessionMetadataStore`  | 13           | `core/session/metadata-store.ts`          |
| `sessionPromptBuilder`  | 2            | `core/session/prompt-builder.ts`          |
| `sessionToolFactory`    | 2            | `core/session/tool-factory.ts`            |
| `userConfigManager`     | 17           | `core/session/user-config.ts`             |
| `workspaceConfigLoader` | 3            | `core/session/workspace-config-loader.ts` |
| `promptComposer`        | 3            | `core/prompts/composer.ts`                |
| `scheduleService`       | 3            | `core/schedules/index.ts`                 |
| `customToolStorage`     | 2            | `core/custom-tools/storage.ts`            |

### 4.2 `packages/shared` — 73 imports en `apps/server`

`shared` sigue fuertemente acoplado al servidor para:

- Paths (`SPACES_DATA_PATH`, `getUserDir`, `getSessionDir`)
- Tipos (`AgentDefinition`, `Team`, `TeamMember`, `BaseTool`, `EnvelopeResult`)
- Schemas (`CreateSessionSchema`, prompt schemas)
- Catálogos (`AVAILABLE_TOOLS`, `TOOL_GROUPS`, `SessionPrefix`)

Esto no es una regresión — es código legacy que nunca se migró. Pero es el 73% de los imports del servidor que aún dependen de `shared` en vez de `@spaces/core`.

### 4.3 `SessionManager` (337 líneas) en `core/session-manager.ts`

Todavía existe y es importado por `context.ts`, `agents.ts`, `files.ts`, `teams.ts`, y varios tools. Crea agentes internamente y envuelve `mcpRegistry`/`memoryRegistry`/`delegationRegistry`. Debía ser reemplazado por engine-driven session CRUD.

### 4.4 `about.md` con referencias obsoletas

- Línea 41: menciona "generación de imágenes" (tool eliminada)
- Línea 42: menciona "previsualización en vivo" (ruta eliminada)
- Líneas 58-59: lista `preview`, `gallery`, `backup` como rutas activas

---

## 5. Cosas No Hechas que Deberían Añadirse — ✅ 16/19

### Paquetes — 100% completos

| Requisito                                                         | Estado |
| ----------------------------------------------------------------- | ------ |
| `@spaces/core/ports/provider.port.ts` con `IProviderRegistry`     | ✅     |
| Schemas migrados: agent, team, project, schedule                  | ✅     |
| `zodToJsonSchema` utility en `@spaces/core`                       | ✅     |
| `z.unknown()` eliminado de `message.schema.ts`                    | ✅     |
| `as any` eliminado de `engine/tool-executor.ts`                   | ✅     |
| `as any` eliminado de `tools/tool-registry.ts`                    | ✅     |
| `as any` eliminado de `sandbox/local.sandbox.ts` (usa type guard) | ✅     |
| `shared/package.json` marcado deprecated                          | ✅     |
| `shared` ISessionStore marcado `@deprecated`                      | ✅     |
| `shared` ToolRegistry marcado `@deprecated`                       | ✅     |
| `spaces-sdk` tiene `tsconfig.json` + build script                 | ✅     |
| `spaces-sdk` re-exporta de `@spaces/core` + `@spaces/engine`      | ✅     |
| `engine/tool-executor.ts` sin clase `ToolRegistry` duplicada      | ✅     |
| `AGENTS.md` refleja arquitectura final                            | ✅     |
| Cross-package: cero imports entre siblings                        | ✅     |
| Cross-package: core no depende de nadie                           | ✅     |

### Cliente — Casi perfecto

| Requisito                                                        | Estado                             |
| ---------------------------------------------------------------- | ---------------------------------- |
| `api/client.ts` y `api/ws.ts` eliminados                         | ✅                                 |
| `lib/api.ts` exporta `apiFetch<T>` + `ApiError`                  | ✅                                 |
| `lib/ws-client.ts` usa `AgentEvent` de `@spaces/core`            | ✅                                 |
| Cero imports de `@/api/client` o `@/api/ws`                      | ✅                                 |
| `SessionsContext.tsx` < 150 líneas, usa `useSessions`            | ✅                                 |
| `ChatArea.tsx` < 300 líneas (127)                                | ✅                                 |
| `MessageList.tsx` < 300 líneas (88)                              | ✅                                 |
| `ChatInput.tsx` < 300 líneas (105)                               | ✅                                 |
| `MainLayout.tsx` eliminado                                       | ✅                                 |
| `AppShell.tsx` (37), `AppSidebar.tsx` (28), `AppHeader.tsx` (69) | ✅                                 |
| `ToolCallCard.tsx` y `ChatToolbar.tsx` existen                   | ✅                                 |
| Ruta `/v2` eliminada                                             | ✅                                 |
| 7 componentes v2 eliminados                                      | ✅                                 |
| `PreviewPanel.tsx` eliminado                                     | ✅                                 |
| `AGENTS.md` actualizado                                          | ✅                                 |
| `about.md` actualizado                                           | ⚠️ referencias obsoletas           |
| 2 dead `PreviewRoute` stubs en router                            | ⚠️                                 |
| 33 archivos > 300 líneas en cliente                              | ⚠️ fuera del scope de Planes 16-21 |

---

## Paquetes — Auditoría de Integridad

Los 6 paquetes `@spaces/*` están **impecables**:

| Paquete     | `as any` | `any` types            | Archivos > 300 | Clases > 200 | Cross-imports |
| ----------- | -------- | ---------------------- | -------------- | ------------ | ------------- |
| `core`      | 0        | 1 (event bus genérico) | 0              | N/A          | Solo zod      |
| `engine`    | 0        | 2 (event bus)          | 0              | 0            | Solo core     |
| `tools`     | 0        | 0                      | 0              | 0            | Solo core     |
| `providers` | 0        | 0                      | 0              | 0            | Solo core     |
| `sandbox`   | 0        | 0                      | 0              | 0            | Solo core     |
| `storage`   | 0        | 0                      | 0              | 0            | Solo core     |

Dependencia: `core` → raíz. Todos los demás → solo `core`. SDK → `core` + `engine`. Cero ciclos.

---

## Priorización de Correcciones

### 🔴 Bloqueantes

1. **Eliminar 15+ singletons en `core/`** — migrar a DI vía `AppContext`
2. **Migrar 73 imports de `shared` en `apps/server`** → `@spaces/core`
3. **Reemplazar `SessionManager` (337 líneas)** por engine-driven session CRUD

### 🟡 Media

4. **Eliminar `ToolRegistry` e `ISessionStore` legacy de `shared`** (ya están deprecated, solo borrar)
5. **Corregir `about.md`** — quitar referencias a preview, gallery, backup, image gen
6. **Eliminar 2 dead `PreviewRoute` stubs** del router del cliente

### 🟢 Baja (fuera del scope original)

7. **33 archivos > 300 líneas en cliente** — descomposición futura (Plan 22)

---

## Comparativa: Antes vs Después

| Métrica                   | Antes (auditoría inicial)  | Ahora                   | Mejora              |
| ------------------------- | -------------------------- | ----------------------- | ------------------- |
| `ai/vendor/`              | 70+ archivos               | 0                       | ✅                  |
| `AgentSession`            | 862 líneas, 9 importadores | 0                       | ✅                  |
| Singletons en `core/`     | 26                         | 15                      | ⬇ 42%               |
| Duplicaciones activas     | 14 pares                   | 0 (2 legacy deprecated) | ✅                  |
| Dead code (archivos)      | 30+                        | 0                       | ✅                  |
| `/v2` island en cliente   | Activa, inalcanzable       | Eliminada               | ✅                  |
| Componentes cliente > 300 | 30                         | 33                      | ↔️ (fuera de scope) |
| `as any` en @spaces/*     | 5 ubicaciones              | 0                       | ✅                  |
| `any` types en @spaces/*  | 3 ubicaciones              | 3 (event bus)           | ↔️                  |
| Shared imports en server  | 100+                       | 73                      | ⬇ 27%               |

---

_Auditoría basada en 3 subagentes de exploración en paralelo sobre `apps/server/`, `apps/client/`, y `packages/`._
