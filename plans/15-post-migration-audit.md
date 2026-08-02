# Auditoría Post-Migración — Estado Real de `the-spaces`

> Estado del código después de completar los 9 Hitos del Plan 15. Basado en auditoría de 4 subagentes sobre ~300 archivos de `apps/server`, `apps/client`, y `packages/`.

---

## Resumen Ejecutivo

| Métrica                                              | Cantidad                                           |
| ---------------------------------------------------- | -------------------------------------------------- |
| Funcionalidades desconectadas                        | 2 (server y client tienen v2 aislado sin integrar) |
| Archivos con código muerto                           | 70+ (vendor directory intacto)                     |
| Funcionalidades duplicadas                           | 14 pares de implementaciones en conflicto          |
| Singletons activos (debían eliminarse)               | 26                                                 |
| Archivos > 300 líneas en cliente (debían ser < 300)  | 30                                                 |
| Features de Hito 9 ("Integración Final") completadas | **0**                                              |

**Veredicto**: La migración creó una base hexagonal sólida (`@spaces/core`, `@spaces/engine`, etc.) y componentes v2 limpios, pero **nunca los integró al sistema productivo**. El servidor y el cliente siguen funcionando 100% con código legacy. Es una reescritura paralela que quedó aislada.

---

## 1. Funcionalidades Desconectadas

### 1.1 Server: Dos arquitecturas en paralelo

El entry point (`apps/server/src/index.ts`) monta **dos sistemas coexistentes**:

```
Línea 77:  serverContext = createServerContext()     ← OLD: singletons, NUNCA se usa
Línea 78:  appContext    = await createAppContext()  ← NEW: @spaces/engine

Línea 81:  registerEngineWsRoute(app, appContext)   ← NEW: /ws/v2
Línea 139: app.get("/ws", upgradeWebSocket(...))     ← OLD: /ws, 16 msg types
```

- `/ws` usa `createWsContext()` que importa `sessionManager` y `uiApprovalRegistry` singletons
- `/ws/v2` usa `IAgentRuntime` de `@spaces/engine`
- `serverContext` se crea en línea 77 pero nunca se referencia después → **variable muerta**

La línea 11 importa `memoryRegistry` singleton estáticamente. Las líneas 161 y 177 importan `sessionManager` dinámicamente para auto-cleanup. Las líneas 225 y 232 usan `memoryRegistry.shutdownAll()` en handlers de SIGTERM/SIGINT.

### 1.2 Server: Rutas de sesiones montadas 3 veces

`routes/sessions/index.ts` (líneas 8-21) monta tres routers bajo `/api/sessions/`:

```typescript
router.route("/v2", createEngineSessionCrudRouter(appContext)); // NEW engine
router.route("/", defaultSessionCrudRouter); // OLD (sessionManager singleton)
router.route("/", legacySessionsRouter); // OLD (1338 líneas, sessionManager)
```

### 1.3 Cliente: Dos codebases paralelos

El router (`App.tsx` → `AppRoutes`) tiene:

- `/v2` → usa `Layout` (22 líneas, componentes nuevos, `@spaces/core` types, `useChat`, `useSessions`, `apiFetch` nuevo, `WsClient` nuevo a `/ws/v2`)
- `*` → usa `AppRouter` → `MainLayout` (804 líneas) → TODAS las páginas viejas con `lib/api.ts`, `lib/ws-client.ts`, `SessionsContext` viejo

**Nadie puede llegar a `/v2` en uso normal** — no hay links, redirects, ni ruta default que lleven ahí.

---

## 2. Código Muerto

### 2.1 `ai/vendor/` — 70+ archivos, ~702 KB, intacto y activo

Debía eliminarse en Hito 9. **No solo sigue presente, sino que es importado activamente por 6 archivos externos:**

| Archivo                         | Línea | Importa de vendor/                                    |
| ------------------------------- | ----- | ----------------------------------------------------- |
| `core/tool-registry.ts`         | 2     | `../ai/vendor/agent/src/types.ts`                     |
| `core/navigation-controller.ts` | 3     | `../ai/vendor/agent/src/agent.ts`                     |
| `core/tools/image-gen-tool.ts`  | 4-5   | `../../ai/vendor/ai/src/image-models.ts`, `images.ts` |
| `core/tools/vision-tool.ts`     | 4     | `../../ai/vendor/ai/src/compat.ts`                    |
| `teams/team-prompt-runner.ts`   | 8     | `../ai/vendor/ai/src/compat.ts`                       |
| `ai/agent-session.ts`           | 13-21 | `./vendor/agent/src/agent.ts`, `compat.ts`, etc.      |

### 2.2 `AgentSession` (god object de 862 líneas) — no eliminado

**Definición**: `ai/agent-session.ts:68`, **862 líneas**. Importado por **9 archivos**:

- `ai/index.ts:3`, `core/session-manager.ts:5`, `core/session/agent-runtime.ts:6`, `core/session/mcp-attach.ts:2`, `core/session/session-event-publisher.ts:2`, `core/session/session-memory-enricher.ts:2`, `core/custom-tools/pipeline-engine.ts:2`, `core/ports/core-services.port.ts:2`, `agents/types.ts:4`, `__tests__/agent-session.test.ts:5`

### 2.3 `createServerContext()` — fábrica huérfana

- `core/server-context.ts` (48 líneas): importada en `index.ts:15`, invocada en línea 77
- El objeto retornado **nunca se usa**
- Archivo entero debe eliminarse junto con su re-export en `core/index.ts:7`

### 2.4 `Old core/stores/` — implementaciones legacy vs `@spaces/storage`

| Archivo legacy                        | Reemplazado por                            |
| ------------------------------------- | ------------------------------------------ |
| `core/stores/file-session-store.ts`   | `@spaces/storage` `FilesystemSessionStore` |
| `core/stores/memory-session-store.ts` | `@spaces/storage` `MemorySessionStore`     |

`ServerSpacesHost` (línea 18) todavía usa `FileSessionStore` legacy.

---

## 3. Funcionalidades Duplicadas

### 3.1 Dos event buses incompatibles

| Ubicación                     | Clase                  | API                                             |
| ----------------------------- | ---------------------- | ----------------------------------------------- |
| `core/event-bus.ts`           | `TypedEventEmitter<T>` | `on(listener)`, `emit(event)` — Set-based       |
| `@spaces/engine/event-bus.ts` | `EventBus<T>`          | `on(type, handler)` — Map-based con keyed types |

`AgentSession` usa el viejo. `@spaces/engine` usa el nuevo. **Incompatibles**.

### 3.2 Cuatro implementaciones de session store + 2 interfaces distintas

**Dos definiciones de interfaz:**

- `@spaces/core/ports/session.port.ts:17` → `ISessionStore` canonical
- `shared/stores/session-store.ts:54` → `ISessionStore` legacy (**distinto contrato**)

**Cuatro implementaciones:**

| Archivo                               | Implementa                                       |
| ------------------------------------- | ------------------------------------------------ |
| `@spaces/storage/filesystem.store.ts` | `ISessionStore` (@spaces/core)                   |
| `@spaces/storage/memory.store.ts`     | `ISessionStore` (@spaces/core)                   |
| `core/stores/file-session-store.ts`   | `ISessionStore` (shared) — LEGACY                |
| `core/stores/memory-session-store.ts` | `ISessionStore` (shared) — LEGACY                |
| `ai/session-persistence.ts`           | `JsonlSessionStore` — ni siquiera tiene interfaz |

### 3.3 Cinco tool registries

| Ubicación                            | Clase                      | Estado                                           |
| ------------------------------------ | -------------------------- | ------------------------------------------------ |
| `@spaces/core/ports/tool.port.ts:19` | `IToolRegistry` (interfaz) | Canonical                                        |
| `@spaces/engine/tool-executor.ts:14` | `ToolRegistry`             | Canonical (57 líneas)                            |
| `@spaces/tools/tool-registry.ts:3`   | `DefaultToolRegistry`      | **Copia byte-por-byte** del anterior (47 líneas) |
| `core/tool-registry.ts:4`            | `ToolRegistry`             | Legacy, importa de vendor                        |
| `shared/tools/tool-registry.ts:4`    | `ToolRegistry`             | Legacy, usa `BaseTool`                           |

### 3.4 Tres prompt builders

| Ubicación                            | Clase                                          | Líneas  |
| ------------------------------------ | ---------------------------------------------- | ------- |
| `@spaces/engine/prompt-builder.ts:3` | `PromptBuilder implements IPromptBuilder`      | 24      |
| `ai/prompt-builder.ts:5`             | `PromptBuilder` (no implementa IPromptBuilder) | 21      |
| `core/session/prompt-builder.ts:44`  | `SessionPromptBuilder`                         | **546** |

### 3.5 Dos permission engines con APIs incompatibles

| Ubicación                               | API                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------ |
| `@spaces/engine/permission-engine.ts:3` | `evaluate(RuleContext): Promise<RuleResult>`                                         |
| `core/sandbox/permission-engine.ts:131` | `evaluate(toolName, args, options): PermissionVerdict` — **singleton** de 238 líneas |

### 3.6 Dos pipelines de creación de sesiones

- OLD: `bootstrapAgentSession()` → `createAgentSession()` → `AgentSession`
- NEW: `createSessionAgent()` → `createAgent()` de `@spaces/engine`

### 3.7 Dos WebSocket endpoints

- OLD: `/ws` (16 client→server msg types, 28 server→client types)
- NEW: `/ws/v2` (2 msg types: prompt + abort)

### 3.8 Cliente: Dos apiFetch con firmas incompatibles

| Archivo               | Líneas | Firma                                            | Consumidores    |
| --------------------- | ------ | ------------------------------------------------ | --------------- |
| `api/client.ts` (NEW) | 45     | `apiFetch<T>(path) → Promise<T>` (JSON parseado) | 2 archivos      |
| `lib/api.ts` (OLD)    | 9      | `apiFetch(url) → Promise<Response>` (raw)        | **49 archivos** |

### 3.9 Cliente: Dos WsClient incompatibles

| Archivo                  | Líneas | Endpoint | Consumidores   |
| ------------------------ | ------ | -------- | -------------- |
| `api/ws.ts` (NEW)        | 215    | `/ws/v2` | 1 archivo      |
| `lib/ws-client.ts` (OLD) | 250    | `/ws`    | **3 archivos** |

### 3.10 Cliente: Dos sistemas de gestión de sesiones

| Archivo                              | Patrón           | Líneas | API                             |
| ------------------------------------ | ---------------- | ------ | ------------------------------- |
| `hooks/useSessions.ts` (NEW)         | Hook simple      | 105    | `@/api/client`                  |
| `contexts/SessionsContext.tsx` (OLD) | Context Provider | 225    | `@/lib/api` + `@/lib/ws-client` |

### 3.11 Cliente: Componentes duplicados

| Componente  | OLD (producción)                    | NEW (/v2 aislado)             |
| ----------- | ----------------------------------- | ----------------------------- |
| ChatArea    | `chat/ChatArea.tsx` — 927 líneas    | `ChatArea.tsx` — 51 líneas    |
| ChatInput   | `chat/ChatInput.tsx` — 659 líneas   | `ChatInput.tsx` — 70 líneas   |
| MessageList | `chat/MessageList.tsx` — 852 líneas | `MessageList.tsx` — 40 líneas |

### 3.12 `@spaces/engine` ToolRegistry = `@spaces/tools` DefaultToolRegistry (código idéntico)

`engine/src/tool-executor.ts:14-57` y `tools/src/tool-registry.ts:1-46` contienen **exactamente** el mismo `toLLMFormat()` con los mismos hacks `as any` en las mismas líneas.

---

## 4. Pendiente Post-Migración que Debería Eliminarse

### 4.1 Los 5 singletons clave — TODOS activos

| Singleton            | Definido en                    | Línea | Importado por   |
| -------------------- | ------------------------------ | ----- | --------------- |
| `sessionManager`     | `core/session-manager.ts`      | 340   | **17 archivos** |
| `mcpRegistry`        | `core/mcp-registry.ts`         | 481   | 5 archivos      |
| `memoryRegistry`     | `core/memory/registry.ts`      | 47    | 3 archivos      |
| `uiApprovalRegistry` | `core/ui-approval-registry.ts` | 144   | 3 archivos      |
| `delegationRegistry` | `core/delegation-registry.ts`  | 224   | 6 archivos      |

### 4.2 26 singletons totales detectados

| Archivo                                       | Línea | Singleton                |
| --------------------------------------------- | ----- | ------------------------ |
| `core/approvals/approval-manager.ts`          | 168   | `approvalManager`        |
| `core/circuit-breaker.ts`                     | 101   | `circuitBreakerRegistry` |
| `core/delegation-registry.ts`                 | 224   | `delegationRegistry`     |
| `core/mcp-registry.ts`                        | 481   | `mcpRegistry`            |
| `core/custom-tools/storage.ts`                | 145   | `customToolStorage`      |
| `core/custom-tools/runtime.ts`                | 6     | `pipelineExecutionStack` |
| `core/memory/registry.ts`                     | 47    | `memoryRegistry`         |
| `core/observability/observability-service.ts` | 84    | `observabilityService`   |
| `core/schedules/index.ts`                     | 5     | `scheduleService`        |
| `core/ui-approval-registry.ts`                | 144   | `uiApprovalRegistry`     |
| `core/prompts/registry.ts`                    | 76    | `promptFragmentRegistry` |
| `core/prompts/composer.ts`                    | 163   | `promptComposer`         |
| `core/providers/model-enrichment-service.ts`  | 32    | `modelEnrichmentService` |
| `core/scope/scope-config-manager.ts`          | 487   | `scopeConfigManager`     |
| `core/spaces-host.ts`                         | 164   | `serverSpacesHost`       |
| `core/session-manager.ts`                     | 340   | `sessionManager`         |
| `core/sandbox/permission-engine.ts`           | 237   | `permissionEngine`       |
| `core/sandbox/user-permission-store.ts`       | 71    | `userPermissionStore`    |
| `core/session/metadata-store.ts`              | 231   | `sessionMetadataStore`   |
| `core/session/prompt-builder.ts`              | 545   | `sessionPromptBuilder`   |
| `core/session/session-lister.ts`              | 294   | `sessionLister`          |
| `core/session/tool-factory.ts`                | 202   | `sessionToolFactory`     |
| `core/session/user-config.ts`                 | 216   | `userConfigManager`      |
| `core/session/workspace-config-loader.ts`     | 25    | `workspaceConfigLoader`  |
| `core/tools/web-fetch/rate-limiter.ts`        | 60    | `rateLimiter`            |
| `core/tools/web-fetch/cache.ts`               | 77    | `webFetchCache`          |

### 4.3 Archivos legacy que deben eliminarse

| Archivo/Directorio                    | Líneas       | Reemplazado por                            |
| ------------------------------------- | ------------ | ------------------------------------------ |
| `ai/vendor/` completo                 | 70+ archivos | `@spaces/engine` + `@spaces/providers`     |
| `ai/agent-session.ts`                 | 862          | `@spaces/engine` `AgentRuntime`            |
| `ai/session-persistence.ts`           | 733          | `@spaces/storage`                          |
| `ai/prompt-builder.ts`                | 21           | `@spaces/engine` `PromptBuilder`           |
| `core/server-context.ts`              | 48           | `context.ts` `createAppContext()`          |
| `core/stores/file-session-store.ts`   | —            | `@spaces/storage` `FilesystemSessionStore` |
| `core/stores/memory-session-store.ts` | —            | `@spaces/storage` `MemorySessionStore`     |
| `core/tool-registry.ts`               | 48           | `@spaces/tools` `DefaultToolRegistry`      |
| `core/event-bus.ts`                   | —            | `@spaces/engine` `EventBus`                |

### 4.4 Ciclo de dependencias bidireccional `ai/ ↔ core/`

`ai/` importa de `core/` (5 imports), y `core/` importa de `ai/` (10+ imports). Esto es una violación arquitectónica que debe romperse.

### 4.5 30 componentes > 300 líneas en el cliente

| Componente                      | Líneas   | Debía ser |
| ------------------------------- | -------- | --------- |
| `GeneralTab.tsx`                | **1193** | < 300     |
| `AgentsPage.tsx`                | **1136** | < 300     |
| `ToolCallRow.tsx`               | **1115** | < 300     |
| `ChatArea.tsx`                  | **927**  | < 300     |
| `MessageList.tsx`               | **852**  | < 300     |
| `MainLayout.tsx`                | **804**  | < 300     |
| `DashboardPage.tsx`             | **735**  | < 300     |
| `MCPMarketplacePage.tsx`        | **700**  | < 300     |
| `ChatInput.tsx`                 | **659**  | < 300     |
| `SessionSidebar.tsx`            | **533**  | < 300     |
| + 20 más entre 300 y 530 líneas | —        | < 300     |

---

## 5. Cosas No Hechas que Deberían Añadirse

### 5.1 Violaciones de Integridad en Paquetes Nuevos

| Archivo                                  | Línea      | Violación                        |
| ---------------------------------------- | ---------- | -------------------------------- |
| `@spaces/core/schemas/message.schema.ts` | 8          | `z.array(z.unknown())` = `any[]` |
| `@spaces/engine/tool-executor.ts`        | 33, 40, 42 | `as any` para Zod internals      |
| `@spaces/tools/tool-registry.ts`         | 22, 29, 31 | `as any` duplicado del engine    |
| `@spaces/sandbox/local.sandbox.ts`       | 120-121    | `as any` para Bun glob           |

### 5.2 Schemas Zod `shared` vs `@spaces/core` en conflicto

| Concepto             | `shared`                                                            | `@spaces/core`                      |
| -------------------- | ------------------------------------------------------------------- | ----------------------------------- |
| `ISessionStore`      | `create(session: SessionData)` con `username`, `listUserSessions()` | `create(id, name?)`, sin `username` |
| `IMemoryStore`       | `recall()`, `store()`, `forget()`, `buildContext()`                 | `search()`, `store()`, `delete()`   |
| `ToolResult`         | `{ content: string \| any[] }`                                      | `{ toolCallId, output, isError? }`  |
| `BaseTool` / `ITool` | `execute(id, args, signal?)`                                        | `execute(args, ctx)`                |

Son contratos **completamente distintos** con los mismos nombres. Peligro de confusión.

### 5.3 `spaces-sdk` sin build

`packages/spaces-sdk/package.json` no tiene `tsconfig.json`, `devDependencies`, ni scripts de build. Si debe compilarse, no puede.

### 5.4 Falta `IProviderRegistry` en `@spaces/core`

`@spaces/providers` tiene `ProviderRegistry` como clase concreta sin contrato en core.

---

## Mapa Visual del Estado Actual

```
┌─────────────────────────────────────────────────────────────┐
│                    apps/server/index.ts                      │
│                                                             │
│  serverContext ◄── createServerContext()  ← NUNCA SE USA    │
│  appContext    ◄── createAppContext()      ← @spaces/*      │
│                                                             │
│  /ws      → createWsContext()  → sessionManager singleton   │
│  /ws/v2   → registerEngineWsRoute() → @spaces/engine        │
│                                                             │
│  /api/sessions/     → 3 routers montados                    │
│    /v2   → NEW engine routes                                │
│    /     → OLD defaultSessionCrudRouter (sessionManager)     │
│    /     → OLD legacySessionsRouter (1338 líneas)           │
│                                                             │
│  /api/* (23 rutas)  → TODAS usan singletons legacy          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    apps/client/App.tsx                        │
│                                                             │
│  /v2  → Layout (22 líneas) → componentes nuevos             │
│          useChat, useSessions, apiFetch (nuevo)             │
│          WsClient /ws/v2 (@spaces/core types)               │
│                                                             │
│  /*   → AppRouter → MainLayout (804 líneas)                 │
│          SessionsProvider (viejo)                            │
│          lib/api.ts (49 consumidores)                        │
│          lib/ws-client.ts (3 consumidores)                   │
│          TODAS las páginas viejas intactas                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│             packages/ — Paquetes Nuevos                      │
│                                                             │
│  @spaces/core        ✅ Completo (1 violación any)          │
│  @spaces/engine      ✅ Completo (3 violaciones as any)     │
│  @spaces/tools       ✅ 7 tools, registry (duplicado engine)│
│  @spaces/providers   ✅ OpenAICompatibleProvider             │
│  @spaces/storage     ✅ Memory + Filesystem stores           │
│  @spaces/sandbox     ✅ LocalSandbox (2 violaciones as any) │
│                                                             │
│  shared              ❌ Activo, contratos en conflicto       │
│  spaces-sdk          ❌ Sin build, legacy                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│        apps/server/src/ — Código Legacy Intacto              │
│                                                             │
│  ai/vendor/           70+ archivos (~702 KB) — activo       │
│  ai/agent-session.ts  862 líneas — 9 importadores           │
│  ai/session-persistence.ts  733 líneas                      │
│  core/                26 singletons activos                  │
│  core/stores/         2 implementaciones duplicadas          │
│  core/tool-registry.ts  Legacy, importa de vendor            │
│  core/server-context.ts  Huérfano (nunca usado)             │
│                                                             │
│  Ciclo ai/ ↔ core/    Bidireccional, ~15 imports            │
└─────────────────────────────────────────────────────────────┘
```

---

## Priorización de Correcciones

### Bloqueadores (deben resolverse primero)

1. **Eliminar `ai/vendor/`** — requiere migrar 6 archivos que aún lo importan
2. **Unificar session store** — elegir `@spaces/storage`, eliminar `core/stores/`, migrar `ServerSpacesHost`
3. **Eliminar `AgentSession`** — migrar 9 importadores a `@spaces/engine`
4. **Resolver los 26 singletons** — convertir a DI vía `AppContext`

### Alta Prioridad

5. **Unificar apiFetch en el cliente** — migrar 49 consumidores de `lib/api.ts` a `api/client.ts`
6. **Unificar WsClient en el cliente** — migrar 3 consumidores de `lib/ws-client.ts`
7. **Integrar componentes v2** — reemplazar `chat/ChatArea.tsx` (927 líneas) por la versión de 51 líneas
8. **Resolver contratos en conflicto** entre `shared` y `@spaces/core`

### Media Prioridad

9. **Eliminar tool registries duplicados** — unificar `@spaces/engine` y `@spaces/tools`
10. **Unificar event buses** — migrar de `TypedEventEmitter` a `EventBus`
11. **Unificar permission engines** — el legacy no implementa `IPermissionEngine`
12. **Eliminar `createServerContext()` huérfano**

### Baja Prioridad (higiene)

13. **Eliminar `as any`** en `@spaces/engine`, `@spaces/tools`, `@spaces/sandbox`
14. **Tipar `message.schema.ts`** — reemplazar `z.unknown()` por `ContentBlock`
15. **Agregar `IProviderRegistry`** a `@spaces/core`
16. **Arreglar build de `spaces-sdk`**

---

_Auditoría realizada sobre ~300 archivos de `apps/server`, `apps/client`, y `packages/`. Basado en 4 subagentes de exploración en paralelo._
