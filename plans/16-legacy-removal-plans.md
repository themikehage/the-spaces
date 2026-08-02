# Planes 16–21 — Remoción Definitiva de Código Legacy

> Secuencia de 6 planes encadenados para eliminar todo el código legacy detectado en la auditoría post-migración (`plans/15-post-migration-audit.md`). Cada plan depende del anterior y es verificable de forma independiente.

---

## Dependencias entre Planes

```
Plan 16: Cablear AppContext + WS Core
  │  (establece el nuevo punto de entrada productivo)
  ▼
Plan 17: Eliminar ai/vendor/ + AgentSession
  │  (elimina el god object y su vendor, mayor fuente de acoplamiento)
  ▼
Plan 18: Eliminar 26 singletons → DI
  │  (rompe la última dependencia del patrón anti-arquitectura)
  ▼
Plan 19: Unificar duplicaciones
  │  (limpia tool registries, session stores, event buses, prompt builders)
  ▼
Plan 20: Limpiar cliente
  │  (integra componentes v2, elimina apiFetch/wsClient legacy)
  ▼
Plan 21: Limpieza final
  (rutas restantes, shared package, SDK)
```

---
## ✅ Plan 16 — Cablear AppContext y Migrar WebSocket + Rutas Core de Sesiones (COMPLETADO)

> **Documento de finalización:** Ver [16-cablear-appcontext-ws-core.md](file:///c:/Users/themi/AgentWorkspace/the-spaces/plans/completed/16-cablear-appcontext-ws-core.md)

### Contexto

Este plan es el **prerrequisito de todos los demás**. Sin él, no se puede eliminar nada sin romper el sistema.

La auditoría reveló que `createAppContext()` (nuevo, usa `@spaces/engine`) y `createServerContext()` (viejo, envuelve singletons) coexisten en `index.ts`. El nuevo está aislado en `/ws/v2`. El viejo domina las 26 rutas y el WebSocket productivo (`/ws`).

**Rol en el plan general**: establecer `AppContext` como el **único** punto de entrada del servidor, migrar el WebSocket productivo al engine, y crear el patrón que todas las rutas usarán para acceder a dependencias. Todo lo demás (eliminar vendor, singletons, `AgentSession`) depende de que este cableado funcione.

### Motivación

- El `AgentSession` y los singletons no pueden eliminarse hasta que el engine esté efectivamente sirviendo tráfico productivo
- El WebSocket es el componente más crítico — es por donde fluye el chat. Si el engine puede manejar el WS productivo, está listo para reemplazar todo
- Una vez que el WS productivo usa `@spaces/engine`, se puede empezar a cortar dependencias legacy

### Tareas

| # | Tarea | Archivos | Detalle |
|---|---|---|---|
| 16.1 | **Eliminar `createServerContext()`** | `core/server-context.ts` (borrar), `core/index.ts` (quitar re-export), `index.ts` (quitar líneas 15, 77) | Ya no se usa. Es código huérfano. |
| 16.2 | **Migrar `createAppContext()` a único contexto** | `context.ts` | Asegurar que `AppContext` expone TODO lo que las rutas necesitan: `sessionStore`, `toolRegistry`, `modelProvider`, `sandbox`, `eventBus`, `hookRunner`, `permissionEngine`, `promptBuilder`, `approvalChannel`, `scheduleService` |
| 16.3 | **Migrar WS handler productivo** | `ws/handler.ts` → reescribir, `index.ts` línea 139 | Reemplazar el `upgradeWebSocket` de `/ws` por el que usa `appContext`. El nuevo handler: recibe `prompt` → llama `agent.prompt()`, recibe `abort` → llama `agent.abort()`, forwardea `agent.events` al cliente WS. Eliminar `/ws/v2` (ya no hace falta). |
| 16.4 | **Migrar `POST /sessions`** | `routes/sessions/sessions-v2.ts` (nuevo) | Usar `appContext.sessionStore.create()` + `createAgent()` de `@spaces/engine`. Cachear el agente en `appContext.agentCache`. Devolver `{ id, name, createdAt }`. |
| 16.5 | **Migrar `GET /sessions`** | `routes/sessions/sessions-v2.ts` | Usar `appContext.sessionStore.listSessions()`. |
| 16.6 | **Migrar `DELETE /sessions/:id`** | `routes/sessions/sessions-v2.ts` | `agent.dispose()` + `sessionStore.delete()`. |
| 16.7 | **Migrar `GET /sessions/:id/messages`** | `routes/sessions/sessions-v2.ts` | `appContext.sessionStore.getMessages(id)`. |
| 16.8 | **Montar nuevas rutas como default** | `routes/sessions/index.ts`, `index.ts` | Reemplazar `defaultSessionCrudRouter` y `legacySessionsRouter` por `sessions-v2.ts`. Las rutas viejas se mueven a `routes/sessions/legacy/` para referencia. |
| 16.9 | **Crear `GET /api/health`** | `routes/health.ts` | Usar `appContext` para verificar que todos los servicios están vivos. |
| 16.10 | **Limpiar `index.ts`** | `index.ts` | Quitar `createServerContext`, quitar imports de singletons (`memoryRegistry` línea 11, `sessionManager` líneas 161/177), reemplazar handlers SIGTERM/SIGINT por `appContext.dispose()`. |

### Rutas que permanecen sin cambios en este plan

Todas las rutas que no son `/sessions` ni `/ws` siguen funcionando con código legacy. Esto es intencional — se migran en planes posteriores. La clave de este plan es que el loop de chat y sesiones básicas ya funcionan con el engine.

### Verificación

```bash
pnpm typecheck                          # 0 errores
pnpm --filter @spaces/server typecheck  # 0 errores
pnpm dev                                # server + client arrancan
# Prueba manual:
# - Crear sesión → POST /api/sessions → 201
# - Enviar prompt por WS → streaming funciona
# - Listar sesiones → GET /api/sessions → 200
# - Eliminar sesión → DELETE /api/sessions/:id → 200
# - GET /api/health → 200
```

---

## Plan 17 — Eliminar `ai/vendor/` y `AgentSession`

### Contexto

`ai/vendor/` (70+ archivos, ~702 KB) es el mayor lastre del código legacy. Contiene el agent loop original, el sistema de compaction, las sesiones tipo tree, el compat layer de streaming y los providers vendorizados. **Seis archivos externos aún lo importan directamente**.

`AgentSession` (862 líneas en `ai/agent-session.ts`) es el god object que el plan de migración prometió eliminar en Hito 9. Lo importan 9 archivos. Es el corazón de la arquitectura vieja.

**Rol en el plan general**: este plan elimina la fuente principal de acoplamiento. Después de esto, los singletons quedan "huérfanos" de su runtime subyacente y se vuelven eliminables en el Plan 18.

### Motivación

- Mientras `ai/vendor/` exista, cualquier archivo puede importarlo y perpetuar el acoplamiento
- `AgentSession` es la razón por la que `sessionManager` y otros singletons existen — sin él, no tienen propósito
- El engine ya implementa el agent loop, el prompt builder, los hooks, y el permission engine. El vendor es redundante

### Mapa de Dependencias a Romper

```
ai/vendor/agent/src/agent.ts       ← core/navigation-controller.ts:3
ai/vendor/agent/src/types.ts       ← core/tool-registry.ts:2
ai/vendor/agent/src/harness/*      ← ai/agent-session.ts:14-21
ai/vendor/agent/src/agent-loop.ts  ← ai/agent-session.ts (indirecto)
ai/vendor/ai/src/compat.ts         ← ai/agent-session.ts:21, teams/team-prompt-runner.ts:8, core/tools/vision-tool.ts:4
ai/vendor/ai/src/image-models.ts   ← core/tools/image-gen-tool.ts:4-5
ai/vendor/ai/src/images.ts         ← core/tools/image-gen-tool.ts:5
```

### Tareas

| # | Tarea | Archivos | Detalle |
|---|---|---|---|
| 17.1 | **Migrar `core/navigation-controller.ts`** | `core/navigation-controller.ts` | Deja de importar de `ai/vendor/agent/src/agent.ts`. Usa `IAgentRuntime.abort()` del engine. El `steer()` y `followUp()` se implementan como hooks en el engine. Si no se usa activamente, eliminar el archivo. |
| 17.2 | **Migrar `core/tool-registry.ts`** | `core/tool-registry.ts` | Reemplazar import de `ai/vendor/agent/src/types.ts` por `ITool` de `@spaces/core`. Si es redundante con `@spaces/tools`, eliminar el archivo. |
| 17.3 | **Migrar `core/tools/vision-tool.ts`** | `core/tools/vision-tool.ts` | Reemplazar `streamSimple` de vendor por `IModelProvider.streamComplete()` de `@spaces/providers`. |
| 17.4 | **Migrar `core/tools/image-gen-tool.ts`** | `core/tools/image-gen-tool.ts` | Reemplazar imports de vendor (`image-models.ts`, `images.ts`) por lógica propia que use `fetch` directo a las APIs de imagen. |
| 17.5 | **Migrar `teams/team-prompt-runner.ts`** | `teams/team-prompt-runner.ts` | Reemplazar `streamSimple` de vendor por `IModelProvider.streamComplete()`. |
| 17.6 | **Eliminar `ai/agent-session.ts`** | `ai/agent-session.ts` (borrar) | Migrar los 9 importadores a usar `IAgentRuntime` de `@spaces/engine`. Ver lista abajo. |
| 17.7 | **Migrar importadores de AgentSession** | Ver tabla abajo | Cada archivo que importa `AgentSession` debe recibir `IAgentRuntime` vía `AppContext` |
| 17.8 | **Eliminar `ai/vendor/`** | `ai/vendor/` (borrar directorio completo) | Verificar que ningún archivo hace `import` del vendor. |
| 17.9 | **Eliminar `ai/index.ts`** (si solo re-exportaba AgentSession) | `ai/index.ts` | Si tenía otros exports, mantenerlos. |

### Archivos que importan `AgentSession` y su migración

| Archivo | Migración |
|---|---|
| `ai/index.ts:3` | Eliminar re-export |
| `core/session-manager.ts:5` | Reemplazar por `IAgentRuntime` del engine, crear vía factory de `AppContext` |
| `core/session/agent-runtime.ts:6` | Ya tiene acceso a `AppContext`, usar `createAgent()` del engine |
| `core/session/mcp-attach.ts:2` | Recibir `IToolRegistry` en lugar de `AgentSession` |
| `core/session/session-event-publisher.ts:2` | Usar `IEventBus` del engine |
| `core/session/session-memory-enricher.ts:2` | Usar `IMemoryProvider` |
| `core/custom-tools/pipeline-engine.ts:2` | Recibir `IToolExecutor` del engine |
| `core/ports/core-services.port.ts:2` | Eliminar tipo `AgentSession` del port, usar `IAgentRuntime` |
| `agents/types.ts:4` | Usar `IAgentRuntime` |

### Verificación

```bash
# Verificar que no quedan imports del vendor
rg "ai/vendor" apps/server/src/ --type ts
# Debe devolver 0 resultados

# Verificar que AgentSession no se importa
rg "AgentSession" apps/server/src/ --type ts
# Debe devolver 0 resultados (salvo strings/comentarios)

pnpm typecheck  # 0 errores
pnpm build      # exitoso

# Prueba funcional: chat vía WS sigue funcionando
```

---

## Plan 18 — Eliminar los 26 Singletons → Dependency Injection

### Contexto

La auditoría encontró **26 singletons** activos, todos definidos como `export const` a nivel de módulo. Cinco fueron marcados explícitamente en el plan de migración: `sessionManager`, `mcpRegistry`, `memoryRegistry`, `uiApprovalRegistry`, `delegationRegistry`.

**Rol en el plan general**: este plan completa la transición arquitectónica. Después de esto, el servidor cumple con el principio innegociable "cero singletons — todo se inyecta por constructor o AppContext". Es el prerequisito para poder unificar código duplicado en el Plan 19.

### Motivación

- Cada singleton es una dependencia oculta que hace el código imposible de testear
- La regla de arquitectura dice "0 tolerancia a singletons"
- Los singletons son la causa de las duplicaciones (cada uno tiene su propia implementación en vez de compartir la del engine)

### Estrategia

No se eliminan todos de golpe. Se agrupan por dominio y se migran en orden:

1. **Primero los 5 críticos** (más referenciados, mayor impacto)
2. **Luego servicios de sesión** (dependen de que `sessionManager` ya no exista)
3. **Luego servicios de dominio** (tools, prompts, permisos, memoria)
4. **Finalmente infraestructura** (observability, circuit breaker)

### Tareas — Grupo 1: Los 5 Singletons Críticos

| # | Tarea | Singleton | Archivos a modificar |
|---|---|---|---|
| 18.1 | **Migrar `sessionManager` → `AppContext.sessionStore`** | `core/session-manager.ts:340` | 17 importadores. Cada uno recibe `ISessionStore` del `AppContext`. Las rutas acceden vía `c.get("appContext")`. Los tools vía `ToolContext`. |
| 18.2 | **Migrar `delegationRegistry` → `AppContext.delegationService`** | `core/delegation-registry.ts:224` | 6 importadores. Reemplazar por servicio inyectable que implementa `IDelegationService`. La lógica de registro de delegaciones se mueve al engine como hooks. |
| 18.3 | **Migrar `mcpRegistry` → `AppContext.mcpRegistry`** | `core/mcp-registry.ts:481` | 5 importadores. Ya existe `McpRegistry` en `@spaces/tools`. Unificar. |
| 18.4 | **Migrar `memoryRegistry` → `AppContext.memoryProvider`** | `core/memory/registry.ts:47` | 3 importadores. Reemplazar por `IMemoryProvider` del core. |
| 18.5 | **Migrar `uiApprovalRegistry` → `AppContext.approvalChannel`** | `core/ui-approval-registry.ts:144` | 3 importadores. Ya existe `IApprovalChannel` en `@spaces/core/ports/approval.port.ts`. |

### Tareas — Grupo 2: Servicios de Sesión

| # | Tarea | Singleton | Detalle |
|---|---|---|---|
| 18.6 | `sessionPromptBuilder` → `AppContext.promptBuilder` | `core/session/prompt-builder.ts:545` | Usar `IPromptBuilder` del engine |
| 18.7 | `sessionLister` → `AppContext.sessionStore.listSessions()` | `core/session/session-lister.ts:294` | Ya está en `ISessionStore` |
| 18.8 | `sessionToolFactory` → `AppContext.toolRegistry` | `core/session/tool-factory.ts:202` | Usar `IToolRegistry` |
| 18.9 | `sessionMetadataStore` → `AppContext.sessionStore` | `core/session/metadata-store.ts:231` | Extender `ISessionStore` con metadata si es necesario |
| 18.10 | `userConfigManager` → `AppContext.config` | `core/session/user-config.ts:216` | Nuevo port `IUserConfig` en core |
| 18.11 | `workspaceConfigLoader` → `AppContext.workspaceConfig` | `core/session/workspace-config-loader.ts:25` | Usar `IWorkspaceProvider` existente |

### Tareas — Grupo 3: Servicios de Dominio

| # | Tarea | Singleton | Detalle |
|---|---|---|---|
| 18.12 | `scopeConfigManager` → `AppContext.scopeConfig` | `core/scope/scope-config-manager.ts:487` | Nuevo port o integrar en `IPermissionEngine` |
| 18.13 | `permissionEngine` → `AppContext.permissionEngine` | `core/sandbox/permission-engine.ts:237` | Ya existe `IPermissionEngine` en `@spaces/engine`. Unificar reglas DENY/ASK. |
| 18.14 | `userPermissionStore` → `AppContext.permissionEngine` | `core/sandbox/user-permission-store.ts:71` | Integrar en `PermissionEngine` |
| 18.15 | `promptFragmentRegistry` → `AppContext.promptBuilder` | `core/prompts/registry.ts:76` | Las secciones de prompt se registran en `IPromptBuilder` |
| 18.16 | `promptComposer` → `AppContext.promptBuilder` | `core/prompts/composer.ts:163` | El engine ya compone prompts |
| 18.17 | `customToolStorage` → `AppContext.customTools` | `core/custom-tools/storage.ts:145` | Nuevo port `ICustomToolStore` o integrar en `IToolRegistry` |
| 18.18 | `pipelineExecutionStack` → `AppContext.pipelineEngine` | `core/custom-tools/runtime.ts:6` | Estado por request, no global |
| 18.19 | `scheduleService` → `AppContext.scheduleService` | `core/schedules/index.ts:5` | Ya existe `IScheduleService` en `@spaces/core/ports/schedule.port.ts` |
| 18.20 | `approvalManager` → `AppContext.approvalChannel` | `core/approvals/approval-manager.ts:168` | Ya existe `IApprovalChannel` |
| 18.21 | `serverSpacesHost` → `AppContext.spacesHost` | `core/spaces-host.ts:164` | Ya existe interface |
| 18.22 | `modelEnrichmentService` → `AppContext.modelRegistry` | `core/providers/model-enrichment-service.ts:32` | Integrar en `ProviderRegistry` de `@spaces/providers` |

### Tareas — Grupo 4: Infraestructura

| # | Tarea | Singleton | Detalle |
|---|---|---|---|
| 18.23 | `observabilityService` → `AppContext.observability` | `core/observability/observability-service.ts:84` | Nuevo port `IObservabilityService` |
| 18.24 | `circuitBreakerRegistry` → `AppContext.circuitBreaker` | `core/circuit-breaker.ts:101` | Nuevo port `ICircuitBreaker` |
| 18.25 | `rateLimiter` (web-fetch) → `AppContext.rateLimiter` | `core/tools/web-fetch/rate-limiter.ts:60` | Por request, no global |
| 18.26 | `webFetchCache` → `AppContext.webFetchCache` | `core/tools/web-fetch/cache.ts:77` | Por request o inyectado |

### Patrón de Migración (para cada singleton)

```typescript
// ANTES (singleton)
import { sessionManager } from "../core/session-manager";
const session = sessionManager.getSession(id);

// DESPUÉS (DI)
// En la ruta:
const ctx = c.get("appContext");
const session = ctx.sessionStore.getMessages(id);

// En un tool:
// El ToolContext incluye appContext
async execute(args: unknown, toolCtx: ToolContext): Promise<ToolResult> {
  const session = toolCtx.appContext.sessionStore;
}
```

### Verificación

```bash
# Verificar 0 exports de singletons
rg "export const [a-z]" apps/server/src/core/ --type ts
# Solo deben quedar constantes de configuración, no servicios

# Verificar que sessionManager no se importa
rg "sessionManager" apps/server/src/ --type ts
# 0 resultados

pnpm typecheck  # 0 errores
```

---

## Plan 19 — Unificar Funcionalidades Duplicadas

### Contexto

La auditoría encontró **14 pares de implementaciones duplicadas**. Esto es residuo directo de haber mantenido dos arquitecturas en paralelo. Con los singletons ya eliminados (Plan 18), las duplicaciones se vuelven visibles y eliminables.

**Rol en el plan general**: este plan es puramente de higiene. Elimina el "doble mantenimiento" y asegura que hay una sola implementación canónica por cada concepto. Sin este plan, cualquier cambio futuro requeriría tocar dos lugares.

### Motivación

- Mantener dos implementaciones del mismo concepto es fuente de bugs (divergencia)
- Las duplicaciones violan DRY
- Los contratos en conflicto (`shared` vs `@spaces/core`) causan confusión sobre cuál es la fuente de verdad

### Tareas

| # | Duplicación | Acción | Archivos |
|---|---|---|---|
| 19.1 | **Dos event buses** | Eliminar `core/event-bus.ts` (`TypedEventEmitter`). Migrar consumidores a `@spaces/engine` `EventBus`. | `core/event-bus.ts` (borrar), consumidores |
| 19.2 | **Dos ISessionStore interfaces** | `@spaces/core/ports/session.port.ts` es el canónico. `shared/stores/session-store.ts` se marca como deprecated. | Agregar `@deprecated` JSDoc en shared |
| 19.3 | **Cuatro session store impls** | Eliminar `core/stores/file-session-store.ts` y `core/stores/memory-session-store.ts`. `@spaces/storage` es canónico. `JsonlSessionStore` se elimina con `ai/session-persistence.ts`. | Borrar 3 archivos, migrar `ServerSpacesHost:18` |
| 19.4 | **Cinco tool registries** | `@spaces/tools` `DefaultToolRegistry` es canónico. Eliminar `@spaces/engine` `ToolRegistry` (en `tool-executor.ts`), `core/tool-registry.ts`, `shared/tools/tool-registry.ts`. El engine recibe `IToolRegistry` del `AppContext`. | Modificar `engine/tool-executor.ts`, `engine/factories/default.agent.ts`, borrar legacy |
| 19.5 | **Tres prompt builders** | `@spaces/engine` `PromptBuilder` es canónico. Eliminar `ai/prompt-builder.ts`. `SessionPromptBuilder` (546 líneas) se descompone en `PromptSection[]` registradas en el engine. | Borrar 2 archivos, crear secciones |
| 19.6 | **Dos permission engines** | `@spaces/engine` `PermissionEngine` es canónico. Migrar reglas DENY/ASK del legacy (`core/sandbox/permission-engine.ts`) como `Rule[]` inyectables. | Borrar `core/sandbox/permission-engine.ts`, migrar reglas |
| 19.7 | **Dos pipelines de sesiones** | Unificar en `createSessionAgent()` de `context.ts`. Eliminar `bootstrapAgentSession()`, `createAgentSession()`. | `context.ts`, borrar factories legacy |
| 19.8 | **Dos WebSocket endpoints** | Eliminar `/ws/v2`, unificar en `/ws` con el engine. Ya hecho en Plan 16.3. Verificar. | `index.ts`, `ws/handler.ts` |
| 19.9 | **`@spaces/engine` ToolRegistry = `@spaces/tools` DefaultToolRegistry** | Eliminar el del engine. El engine recibe `IToolRegistry` del `AppContext`, no crea el suyo. | `engine/tool-executor.ts:14-57` (borrar clase `ToolRegistry`), `engine/factories/default.agent.ts` |
| 19.10 | **Resolved `z.unknown()` en core schemas** | `message.schema.ts:8`: reemplazar `z.array(z.unknown())` por `z.array(ContentBlockSchema)` definiendo `ContentBlockSchema` correctamente. | `core/schemas/message.schema.ts` |
| 19.11 | **Eliminar `as any` en engine/tools/sandbox** | Extraer `zodToJsonSchema()` como utility en `@spaces/core`. Reemplazar hacks de `as any` en `tool-executor.ts` y `tool-registry.ts`. Reemplazar `as any` de Bun glob en `local.sandbox.ts` por type guard. | 4 archivos |
| 19.12 | **Agregar `IProviderRegistry` a core** | `@spaces/providers` tiene `ProviderRegistry` concreto sin interfaz. Crear `IProviderRegistry` en `core/ports/provider.port.ts`. | `core/ports/provider.port.ts` (nuevo) |

### Verificación

```bash
# Verificar que core/event-bus.ts fue eliminado
ls apps/server/src/core/event-bus.ts  # Debe fallar

# Verificar que core/stores/ fue eliminado
ls apps/server/src/core/stores/  # Debe estar vacío o no existir

# Verificar que core/tool-registry.ts fue eliminado
ls apps/server/src/core/tool-registry.ts  # Debe fallar

# Verificar que ai/prompt-builder.ts fue eliminado
ls apps/server/src/ai/prompt-builder.ts  # Debe fallar

# Verificar que shared contracts tienen @deprecated
rg "@deprecated" packages/shared/src/stores/

pnpm typecheck  # 0 errores
pnpm build      # exitoso
```

---

## Plan 20 — Limpiar Cliente (Integrar v2, Eliminar Componentes Legacy)

### Contexto

La auditoría del cliente reveló la misma situación que el servidor: una isla `/v2` con componentes limpios y hooks nuevos, mientras el 100% del tráfico real usa componentes legacy con `lib/api.ts` (49 consumidores), `lib/ws-client.ts` (3 consumidores), y `SessionsContext` viejo.

30 componentes superan las 300 líneas, con casos extremos como `GeneralTab` (1193), `AgentsPage` (1136), `ToolCallRow` (1115) y el propio `MainLayout` (804).

**Rol en el plan general**: este plan cierra la brecha del frontend. Sin él, el servidor ya está limpio pero el cliente sigue siendo una carga de deuda técnica. El objetivo NO es migrar todas las páginas avanzadas (eso es Plan 21), sino eliminar la duplicación de infraestructura (apiFetch, WsClient, hooks, componentes core de chat).

### Motivación

- Dos `apiFetch` con firmas incompatibles = riesgo de bugs silenciosos
- Dos `WsClient` conectando a endpoints distintos = confusión
- Componentes core de chat duplicados (ChatArea 927 vs 51 líneas, MessageList 852 vs 40) = doble mantenimiento
- `SessionsContext` viejo (225 líneas) vs `useSessions` nuevo (105 líneas) = dos fuentes de verdad para el mismo estado

### Tareas — Infraestructura

| # | Tarea | Archivos | Detalle |
|---|---|---|---|
| 20.1 | **Unificar `apiFetch`** | `lib/api.ts` → reescribir, 49 consumidores | Reescribir `lib/api.ts` para que use la firma del nuevo `api/client.ts`: `apiFetch<T>(path, init?) → Promise<T>` con JSON parseado y `ApiError`. Eliminar `api/client.ts`. Migrar los 2 consumidores nuevos (`useChat.ts`, `useSessions.ts`) a importar de `lib/api.ts`. |
| 20.2 | **Unificar `WsClient`** | `lib/ws-client.ts` → reescribir, 3 consumidores | Reescribir `lib/ws-client.ts` con el nuevo `WsClient` de `api/ws.ts` (conexión a `/ws`, `AgentEvent` types, reconexión). Eliminar `api/ws.ts`. Migrar `useWebSocket.ts` a importar de `lib/ws-client.ts`. Los consumidores legacy (`attention-store.ts`, `useConnectionAware.ts`, `useTeam.ts`) se actualizan a la nueva API. |
| 20.3 | **Unificar gestión de sesiones** | `contexts/SessionsContext.tsx` → reescribir, consumidores | Reescribir `SessionsContext` para que use `useSessions` internamente. Mantener la interfaz pública (`SessionsProvider`, `useSessions` context) para no romper consumidores. Agregar kanban columns y status helpers como selectors sobre el estado base. |

### Tareas — Componentes Core de Chat

| # | Tarea | Archivos | Detalle |
|---|---|---|---|
| 20.4 | **Reemplazar `chat/ChatArea.tsx`** (927 líneas) | `components/chat/ChatArea.tsx` | Reemplazar por la versión v2 (51 líneas) + features del viejo que sean necesarios (tool calls inline, attachments, model selector). Migrar features uno a uno, manteniendo el componente bajo 300 líneas. |
| 20.5 | **Reemplazar `chat/MessageList.tsx`** (852 líneas) | `components/chat/MessageList.tsx` | Versión v2 (40 líneas) + scroll automático + renderizado de tool calls. Extraer tool call rendering a `ToolCallCard.tsx` (< 150 líneas). |
| 20.6 | **Reemplazar `chat/ChatInput.tsx`** (659 líneas) | `components/chat/ChatInput.tsx` | Versión v2 (70 líneas) + toolbar de attachments + model selector (extraído a prop). Extraer toolbar a `ChatToolbar.tsx` (< 100 líneas). |
| 20.7 | **Reemplazar `layout/MainLayout.tsx`** (804 líneas) | `components/layout/MainLayout.tsx` | Descomponer en: `AppShell.tsx` (< 100 líneas), `AppSidebar.tsx` (< 150), `AppHeader.tsx` (< 100). Mantener soporte de mobile. |

### Tareas — Eliminar `/v2` Island

| # | Tarea | Archivos | Detalle |
|---|---|---|---|
| 20.8 | **Eliminar ruta `/v2`** | `router/routes.tsx`, `App.tsx` | Quitar `Layout` (22 líneas) y sus componentes hijos del router. Ya no hacen falta — los componentes principales fueron reemplazados. |
| 20.9 | **Eliminar componentes v2 huérfanos** | `components/Layout.tsx`, `components/ChatArea.tsx`, `components/ChatInput.tsx`, `components/MessageList.tsx`, `components/MessageBubble.tsx`, `components/Markdown.tsx`, `components/SessionList.tsx` | Todos fueron mergeados a sus contrapartes en `components/chat/` y `components/layout/`. Borrar. |

### Verificación

```bash
# Verificar que no hay dos apiFetch
rg "from \"@/api/client\"" apps/client/src/ --type ts
# 0 resultados (solo debe existir lib/api.ts)

# Verificar que no hay dos WsClient
rg "from \"@/api/ws\"" apps/client/src/ --type ts
# 0 resultados (solo debe existir lib/ws-client.ts)

# Verificar que no hay ruta /v2
rg "/v2" apps/client/src/router/ --type ts
# 0 resultados

# Verificar que chat/ChatArea.tsx < 300 líneas
wc -l apps/client/src/components/chat/ChatArea.tsx

# Verificar que MainLayout fue eliminado
ls apps/client/src/components/layout/MainLayout.tsx
# Debe fallar

pnpm typecheck  # 0 errores
pnpm build      # exitoso
# Prueba manual: chat funciona, sesiones se listan/crean/eliminan
```

---

## Plan 21 — Limpieza Final

### Contexto

Este es el plan de cierre. Después de los Planes 16-20, el sistema ya funciona con la arquitectura hexagonal y sin código duplicado. Este plan aborda lo que queda: rutas legacy no migradas, el paquete `shared` en conflicto, el SDK sin build, y features del gap analysis que nunca se cubrieron.

**Rol en el plan general**: es el "barrido final". Los planes 16-20 eliminaron el código legacy y las duplicaciones. Este plan decide qué hacer con las rutas y features que el plan original marcó como "no migran" y con los paquetes shared/SDK que quedaron en un limbo.

### Motivación

- Las 23 rutas legacy que coexisten con las nuevas son deuda técnica viviente
- `packages/shared` y `@spaces/core` tienen contratos en conflicto — hay que decidir cuál sobrevive
- `packages/spaces-sdk` no tiene build — o se arregla o se elimina
- El gap analysis (`plans/15-gap-analysis.md`) identificó ~60 features no cubiertas — hay que decidir cuáles se migran y cuáles se descartan

### Tareas

| # | Tarea | Archivos | Detalle |
|---|---|---|---|
| 21.1 | **Decidir destino de `packages/shared`** | `packages/shared/` | Opción A: migrar schemas y tipos relevantes a `@spaces/core` (fuente única de verdad), eliminar `shared`. Opción B: mantener `shared` como paquete de compatibilidad pero sin implementaciones. **Recomendación: Opción A**. |
| 21.2 | **Migrar schemas del gap analysis que sean necesarios** | `@spaces/core/src/schemas/` | Session, message y tool schemas ya están. Agregar: agent, team, project, schedule si estas features se mantienen. |
| 21.3 | **Arreglar `packages/spaces-sdk`** | `packages/spaces-sdk/` | Agregar `tsconfig.json`, `devDependencies`, scripts de build. Re-exportar desde `@spaces/core` + `@spaces/engine` en lugar de `shared`. |
| 21.4 | **Migrar o eliminar rutas legacy** | `routes/` | Decidir por cada ruta no migrada: migrar a thin handler que usa `AppContext`, o eliminar. Las críticas (auth, agents, teams, settings) se migran. Las postergables (preview, gallery, backup) se eliminan con flag feature. |
| 21.5 | **Eliminar archivos legacy residuales** | `ai/`, `core/` | Barrer todo `ai/` (ya debería estar vacío después del Plan 17). Eliminar `core/session-manager.ts` y cualquier otro archivo legacy que haya sobrevivido. |
| 21.6 | **Actualizar `AGENTS.md` y `about.md`** | raíz | Reflejar la arquitectura final: hexagonal, sin singletons, sin vendor, sin god objects. |
| 21.7 | **Verificación final** | Workspace completo | `pnpm typecheck`, `pnpm build`, `pnpm lint`, smoke test manual de todas las features activas. |

### Decisión sobre Features del Gap Analysis

Basado en `plans/15-gap-analysis.md`, features no cubiertas y su destino:

| Feature | Destino | Razón |
|---|---|---|
| Auth | **Migrar** — crear `routes/auth.ts` thin, usar `AppContext` | Crítico para seguridad |
| Proyectos | **Migrar** — `routes/projects.ts` thin | Core del producto |
| Workspace archivos | **Migrar** — `routes/files.ts` thin | Core del producto |
| Model Registry UI | **Migrar** — `routes/models.ts`, `routes/providers.ts` | Configuración esencial |
| Settings / Env Vars | **Migrar** — `routes/settings.ts`, `routes/env.ts` | Configuración esencial |
| Entity Config | **Migrar** — `routes/config.ts` | Feature arquitectónico |
| Skills | **Migrar** — `routes/skills.ts` | Feature activo |
| Tools Scoping | **Migrar** — `routes/agents.ts` scope endpoints | Feature activo |
| Compaction | **Migrar** — hook en `@spaces/engine` | Necesario para sesiones largas |
| Task Runner | **Migrar** — tool en `@spaces/tools` | Feature activo |
| Factory | **Migrar** — `routes/factory.ts` | Feature activo |
| SDK público | **Migrar** — `packages/spaces-sdk` | Estrategia open source |
| Landing page | **Sin cambios** — `apps/landing` independiente | No depende de la migración |
| Preview Server | **Postergar** — eliminar ruta, mantener código como referencia | Complejo, bajo uso |
| Gallery | **Postergar** — eliminar ruta | Bajo uso |
| Backup | **Postergar** — eliminar ruta | Bajo uso |
| Image/Video Generation | **Postergar** — eliminar tools | Pueden reimplementarse como tools standalone |
| Exa Search | **Postergar** | Puede volver como tool |
| Pipelines | **Postergar** | Feature experimental |
| Navigation Controller | **Eliminar** | El engine no tiene tree navigation en MVP |
| Attention Hub | **Migrar** — componente UI existente | Se conecta al approval channel del engine |
| Breadcrumbs | **Migrar** — componente UI existente | No depende de arquitectura |
| Dashboard/Kanban/Timeline | **Migrar** — páginas existentes | Usan la misma API |
| Analytics | **Migrar** — página existente | Usa la misma API |
| Mobile/i18n/Theme | **Migrar** — sin cambios | Infraestructura UI, no depende de arquitectura |

### Verificación Final

```bash
pnpm typecheck          # 0 errores en TODO el workspace
pnpm build              # exitoso en todos los paquetes y apps
pnpm lint               # 0 errores

# Verificaciones de integridad
rg "from \"../ai/" apps/server/src/ --type ts           # 0 resultados
rg "from \"../core/session-manager" apps/server/src/ --type ts  # 0 resultados
rg "AgentSession" apps/server/src/ --type ts             # 0 resultados
rg "ai/vendor" apps/server/src/ --type ts                # 0 resultados

# Verificar que no hay singletons
rg "export const [a-z][a-zA-Z]+ =" apps/server/src/core/ --type ts
# Solo constantes de configuración

# Verificar tamaño de archivos
# Ningún .ts/.tsx > 300 líneas

# Smoke test manual
# - Login
# - Crear sesión
# - Chat con streaming
# - Listar/eliminar sesiones
# - Crear agente
# - Crear equipo
# - Configurar provider
# - Todas las páginas del cliente cargan sin errores
```

---

## Resumen de Estimación

| Plan | Alcance | Esfuerzo estimado | Depende de |
|---|---|---|---|
| 16 — Cablear AppContext + WS Core | `context.ts`, `ws/handler.ts`, `routes/sessions/`, `index.ts` | **6h** | — |
| 17 — Eliminar vendor + AgentSession | `ai/vendor/`, `ai/agent-session.ts`, 6 importadores de vendor, 9 importadores de AgentSession | **8h** | Plan 16 |
| 18 — Eliminar 26 singletons | 26 archivos de singleton, ~60 importadores | **12h** | Plan 17 |
| 19 — Unificar duplicaciones | 12 pares de duplicaciones, contratos `shared` vs `core` | **8h** | Plan 18 |
| 20 — Limpiar cliente | `lib/api.ts`, `lib/ws-client.ts`, `SessionsContext`, 4 componentes core, eliminar `/v2` | **10h** | Plan 16 (puede solaparse con 17-19) |
| 21 — Limpieza final | Rutas restantes, `shared`, SDK, docs | **6h** | Plan 17-20 |
| **Total** | | **~50h** | |

---

*Basado en la auditoría `plans/15-post-migration-audit.md` y el gap analysis `plans/15-gap-analysis.md`.*
