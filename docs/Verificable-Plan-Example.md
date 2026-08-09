# Refactorización: Ports First & Dependency Injection

**Backend Rules violadas**: Regla 1 (Ports First) y Regla 2 (Inyección de Dependencias vía ServerContext).

---

## 1. Estado Actual (As-Is) — Mediciones Concretas

### 1.1 Ports First: Violaciones en `core/ports/`

| Archivo de Puerto | Violación |
|---|---|
| `agent-runtime.port.ts` L2 | Importa `AgentSessionEvent` directamente desde la implementación `core/session/agent-session.ts`. |
| `agent-runtime.port.ts` L11–L18 | 7 propiedades tipadas como `any`: `messages`, `model`, `resourceLoader`, `sessionManager`, `sessionStore`, `authStorage`, `modelRegistry`, `customTools`. |
| `agent-runtime.port.ts` L27, L29, L30, L34, L37–L39 | 6 métodos con parámetros/retornos `any`. Total: **14 ocurrencias de `any`** en un único puerto. |
| `core-services.port.ts` L26, L31, L37–L48 | `IMcpRegistry`, `IDelegationRegistry` con parámetros tipados `any`. |
| `core/ports/` — completo | **No existen puertos para `AgentRegistry` ni para `WorkspaceResolver`**. Ambos servicios exponen singletons globales sin contrato de interfaz. |

### 1.2 Dependency Injection: Singletons Globales sin Inyección

**`agentRegistry` singleton importado directamente en 16 archivos** (excluyendo tests):

| Archivo | Capa |
|---|---|
| `routes/agents.ts` | Route |
| `routes/sessions.ts` | Route |
| `routes/teams.ts` | Route |
| `routes/gallery.ts` | Route |
| `routes/backup.ts` | Route |
| `core/session/create-user-session.ts` | Service |
| `core/session/agent-runtime.ts` | Service |
| `core/tools/extensions/factory.tool.ts` | Tool |
| `core/tools/extensions/manage-delegations.tool.ts` | Tool |
| `core/infra/spaces-host.ts` | Infra |
| `teams/team-prompt-runner.ts` | Service |
| `teams/orchestration/orchestration-runner.ts` | Service |
| `core/multi-agent/agent-prompt-runner.ts` | Service |
| `routes/files.ts` (dynamic import) | Route |

**`sessionManager` singleton importado directamente en 27 archivos** (excluyendo tests):

| Archivo | Capa |
|---|---|
| `routes/sessions.ts` | Route |
| `routes/agents.ts` | Route |
| `routes/teams.ts` | Route |
| `routes/sessions/session-crud.ts` | Route |
| `routes/files.ts` | Route |
| `routes/env.ts` | Route |
| `routes/models.ts` | Route |
| `routes/settings.ts` | Route |
| `routes/providers.ts` | Route |
| `routes/backup.ts` | Route |
| `ws/factory.ts` | WebSocket |
| `core/session/create-user-session.ts` | Service |
| `core/sandbox/subagent-permissions.ts` | Service |
| `core/tools/extensions/factory.tool.ts` | Tool |
| `core/tools/extensions/manage-delegations.tool.ts` | Tool |
| `core/tools/extensions/vision.tool.ts` | Tool |
| `core/tools/extensions/video-gen.tool.ts` | Tool |
| `core/tools/extensions/task.tool.ts` | Tool |
| `core/tools/extensions/image-gen.tool.ts` | Tool |
| `core/tools/extensions/exa-search.tool.ts` | Tool |
| `core/tools/extensions/deep-research/search-provider.ts` | Tool |
| `core/schedules/schedule-service.ts` | Service |
| `core/custom-tools/manage-custom-tools-tool.ts` | Tool |
| `teams/team-prompt-runner.ts` | Service |
| `teams/orchestration/orchestration-runner.ts` | Service |

### 1.3 Situación de `ServerContext`

`createServerContext()` existe en `core/infra/server-context.ts` y se llama en `index.ts` L78.
**El resultado se descarta**: el `serverContext` local no se propaga a ninguna ruta, servicio ni al WebSocket. Es código muerto funcional.

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

Criterios **binarios y verificables automáticamente**. La refactorización está completa cuando todos son `true`.

### 2.A Ports First

- [ ] **A1** — `core/ports/agent-runtime.port.ts` no importa ningún módulo de `core/session/` ni de `core/infra/`. Cero dependencias hacia infraestructura.
- [ ] **A2** — `core/ports/agent-runtime.port.ts` tiene cero ocurrencias de `any`. Todos los tipos son interfaces propias del puerto o genéricos estándar de TypeScript.
- [ ] **A3** — `core/ports/core-services.port.ts` tiene cero ocurrencias de `any`.
- [ ] **A4** — Existe `core/ports/agent-registry.port.ts` con la interfaz `IAgentRegistry` que cubre todos los métodos públicos usados por las capas Route, Service y Tool.
- [ ] **A5** — Existe `core/ports/workspace-resolver.port.ts` con la interfaz `IWorkspaceResolver`.

### 2.B Dependency Injection

- [ ] **B1** — `ServerContext` incluye los campos `agentRegistry: IAgentRegistry` y `workspaceResolver: IWorkspaceResolver`.
- [ ] **B2** — Existe `core/middleware/server-context.middleware.ts` con el middleware Hono que inyecta `serverContext` en `c.var`.
- [ ] **B3** — `index.ts` registra `serverContextMiddleware` globalmente antes de las rutas.
- [ ] **B4** — **Cero** archivos en `routes/**` importan `agentRegistry` o `sessionManager` directamente. Acceso exclusivo vía `c.var.serverContext`.
- [ ] **B5** — **Cero** archivos en `ws/**` importan `sessionManager` directamente. El `serverContext` se pasa como parámetro a `createWsContext`.
- [ ] **B6** — `core/session/create-user-session.ts` recibe sus dependencias (`agentRegistry`, `teamStore`, `sessionManager`) como parámetros explícitos en lugar de importarlas como singletons.
- [ ] **B7** — La suite de tipos pasa sin errores: `pnpm --filter server run typecheck` → exit code 0.
- [ ] **B8** — Los tests existentes pasan: `pnpm --filter server test` → exit code 0.

---

## 3. Hitos Innegociables

Los hitos se ejecutan en orden estricto. **Cada hito termina con su verificación automatizable antes de comenzar el siguiente.**

---

### Hito 1: Limpiar los Puertos (sin dependencias hacia infra)

**Responsabilidad**: Aislar el contrato del dominio.

**Artefactos**:

1. **NUEVO** `core/ports/agent-registry.port.ts`
   - Interfaz `IAgentRegistry` con métodos: `get`, `list`, `listScoped`, `register`, `update`, `stop`, `setAvatarUrl`, `reloadUserAgents`.
   - Solo tipos de `shared` en los parámetros.

2. **NUEVO** `core/ports/workspace-resolver.port.ts`
   - Interfaz `IWorkspaceResolver` con métodos: `resolveSessionWorkspace`, `resolveProjectDir`, `resolveCanonicalProjectId`, `getResolvedSkillPaths`.

3. **MODIFICAR** `core/ports/agent-runtime.port.ts`
   - Mover la definición de `AgentSessionEvent` a este archivo (o a `core/ports/events.port.ts`).
   - Eliminar el import de `core/session/agent-session.ts`.
   - Reemplazar todos los `any` por interfaces tipadas definidas dentro de `core/ports/`.

4. **MODIFICAR** `core/ports/core-services.port.ts`
   - Tipificar `event: any` en `IDelegationRegistry.onEvent` como `AgentSessionEvent`.
   - Tipificar `result: any` como `DelegationResult` (nuevo tipo en `packages/shared`).

**Verificación del Hito 1**:
```bash
grep -rn "from \"../session/" apps/server/src/core/ports/
grep -rn ": any" apps/server/src/core/ports/
# Ambos deben producir cero líneas.
pnpm --filter server run typecheck
```

---

### Hito 2: Extender `ServerContext` y crear el middleware de inyección

**Responsabilidad**: Hacer de `ServerContext` el único punto de ensamble de dependencias.

**Artefactos**:

1. **MODIFICAR** `core/infra/server-context.ts`
   - Agregar `agentRegistry: IAgentRegistry` a la interfaz `ServerContext`.
   - Agregar `workspaceResolver: IWorkspaceResolver` a la interfaz `ServerContext`.
   - `createServerContext()` importa los singletons únicamente aquí y los resuelve como implementación por defecto de las interfaces.

2. **NUEVO** `core/middleware/server-context.middleware.ts`
   - Middleware Hono que llama a `c.set("serverContext", ctx)`.
   - Declara el augment de `ContextVariableMap` para que `c.get("serverContext")` sea tipado como `ServerContext`.

3. **MODIFICAR** `index.ts`
   - Registrar `app.use("/*", serverContextMiddleware(serverContext))` inmediatamente después de `createServerContext()`.

**Verificación del Hito 2**:
```bash
pnpm --filter server run typecheck
# ServerContext debe exponer agentRegistry e IWorkspaceResolver sin errores de tipo.
```

---

### Hito 3: Migrar Rutas HTTP y WebSocket

**Responsabilidad**: Eliminar todos los imports de singletons en las capas de entrega HTTP y WS.

**Archivos a modificar** (orden de prioridad):

| # | Archivo | Singletons a eliminar |
|---|---|---|
| 1 | `routes/sessions.ts` | `sessionManager`, `agentRegistry`, `delegationRegistry` |
| 2 | `routes/agents.ts` | `agentRegistry`, `sessionManager`, `serverSpacesHost` |
| 3 | `routes/teams.ts` | `agentRegistry`, `sessionManager` |
| 4 | `routes/sessions/session-crud.ts` | `sessionManager` |
| 5 | `routes/files.ts` | `sessionManager` |
| 6 | `routes/gallery.ts` | `agentRegistry` |
| 7 | `routes/backup.ts` | `agentRegistry`, `sessionManager` |
| 8 | `routes/env.ts`, `routes/models.ts`, `routes/settings.ts`, `routes/providers.ts` | `sessionManager` |
| 9 | `ws/factory.ts` | `sessionManager`, `uiApprovalRegistry` |

**Patrón de migración en rutas**:
```ts
// ANTES
import { sessionManager } from "../core/session/session-manager";
import { agentRegistry } from "../agents";

// DESPUÉS — sin imports de singletons
router.get("/:id", async (c) => {
  const { sessionManager, agentRegistry } = c.get("serverContext");
  // ...
});
```

**Patrón de migración en WebSocket**:
```ts
// ANTES: createWsContext(upgradeWebSocket)
// DESPUÉS: createWsContext(upgradeWebSocket, serverContext: ServerContext)
```

**Verificación del Hito 3**:
```bash
grep -rn "import { sessionManager }" apps/server/src/routes/ apps/server/src/ws/
grep -rn "import { agentRegistry }" apps/server/src/routes/ apps/server/src/ws/
# Ambos deben producir cero líneas.
pnpm --filter server run typecheck
pnpm --filter server test
```

---

### Hito 4: Migrar Servicios de Dominio y Herramientas

**Responsabilidad**: Eliminar acoplamiento de singletons en la capa de lógica de negocio y herramientas.

**Archivos a modificar**:

| Archivo | Acción |
|---|---|
| `core/session/create-user-session.ts` | Recibir `{ agentRegistry, teamStore, sessionManager }` como parámetros explícitos. |
| `teams/team-prompt-runner.ts` | Recibir `{ agentRegistry, sessionManager }` por parámetro. |
| `teams/orchestration/orchestration-runner.ts` | Ídem. |
| `core/tools/extensions/factory.tool.ts` | Recibir `agentRegistry` y `sessionManager` en `CreateSessionToolsParams`. |
| `core/tools/extensions/manage-delegations.tool.ts` | Ídem. |
| `core/tools/extensions/exa-search.tool.ts` | Recibir `sessionManager` por parámetro. |
| `core/tools/extensions/vision.tool.ts` | Ídem. |
| `core/tools/extensions/video-gen.tool.ts` | Ídem. |
| `core/tools/extensions/task.tool.ts` | Ídem. |
| `core/tools/extensions/image-gen.tool.ts` | Ídem. |
| `core/tools/extensions/deep-research/search-provider.ts` | Ídem. |
| `core/schedules/schedule-service.ts` | Recibir `sessionManager` por parámetro. |
| `core/custom-tools/manage-custom-tools-tool.ts` | Ídem. |
| `core/sandbox/subagent-permissions.ts` | Ídem. |

**Verificación final del Hito 4 (= Completion de la refactorización)**:
```bash
grep -rn "import { sessionManager }" apps/server/src/routes/ apps/server/src/ws/
grep -rn "import { agentRegistry }" apps/server/src/routes/ apps/server/src/ws/
grep -rn "import { sessionManager }" apps/server/src/core/ apps/server/src/teams/
grep -rn "import { agentRegistry }" apps/server/src/core/ apps/server/src/teams/
grep -rn ": any" apps/server/src/core/ports/
grep -rn "from \"../session/" apps/server/src/core/ports/
pnpm --filter server run typecheck
pnpm --filter server test
# TODOS los grep deben producir cero líneas. Ambos pnpm deben finalizar con exit code 0.
```

---

## 4. Restricciones No Negociables de Ejecución

1. **Orden estricto de hitos**: 1 → 2 → 3 → 4. Sin solapamiento.
2. **Sin cambios de comportamiento**: Solo cambia de dónde proviene la dependencia, nunca qué hace.
3. **Un commit por hito**: `refactor(ports): hito-1-clean-ports`, `refactor(di): hito-2-server-context`, etc.
4. **Typecheck en verde al final de cada hito**.
5. **Vendor intocable**: `apps/server/src/vendor/` no se modifica en ningún hito.
6. **Tests se adaptan, nunca se eliminan**.
