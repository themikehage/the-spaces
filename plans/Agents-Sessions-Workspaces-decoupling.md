Análisis de los 3 sistemas principales (**Agentes**, **Sesiones**, **Workspaces / Sandboxes**) en `apps/server/src` cotejándolos con los principios de [backend.rules.md](file:///c:/Users/themi/AgentWorkspace/the-spaces/.agents/rules/backend.rules.md).


---

### 1. Mapa de Interacción entre los 3 Sistemas

```
 ┌────────────────┐       Crea/Supervisa       ┌────────────────┐
 │    AGENTES     │ ◄───────────────────────── │    SESIONES    │
 │ AgentRegistry  │                            │ SessionManager │
 │ AgentServer    │ ─────────────────────────► │ AgentRuntime   │
 └────────────────┘   Resuelve especificación   └────────────────┘
         │                                             │
         │ Acceso a disco                              │ Asigna CWD y Permisos
         ▼                                             ▼
 ┌──────────────────────────────────────────────────────────────┐
 │                    WORKSPACES / SANDBOXES                    │
 │ WorkspaceResolver | LocalSandbox | PermissionEngine          │
 └──────────────────────────────────────────────────────────────┘
```

---

### 2. Violaciones Directas a `backend.rules.md`

#### 🔴 Regla 1: Ports First
- En [agent-runtime.port.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/core/ports/agent-runtime.port.ts#L2), la interfaz de port importa directamente `AgentSessionEvent` desde la implementación concreta `core/session/agent-session.ts`, invirtiendo el sentido de la abstracción.
- Servicios clave como `SessionManager`, `AgentRegistry` y `WorkspaceResolver` **no tienen interfaz de puerto** definida en `core/ports/`.

#### 🔴 Regla 2: Dependency Injection vía `ServerContext`
- Se creó [server-context.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/core/infra/server-context.ts), pero el código lo ignora casi por completo.
- Se importan **singletons globales** directamente (`sessionManager`, `agentRegistry`, `userConfigManager`, `mcpRegistry`) en:
  - Servicios: [agent-runtime.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/core/session/agent-runtime.ts), [create-user-session.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/core/session/create-user-session.ts), [spawn-subagent.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/core/session/spawn-subagent.ts).
  - Websocket: [ws/factory.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/ws/factory.ts).
  - Rutas: [routes/sessions.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/routes/sessions.ts), [routes/agents.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/routes/agents.ts), [routes/teams.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/routes/teams.ts), [routes/files.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/routes/files.ts).

#### 🔴 Regla 3: Sub-Router Pattern
- Dominios con múltiples sub-recursos se mantienen como **God Files** masivos en lugar de carpetas descompuestas:
  - [routes/sessions.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/routes/sessions.ts) (1.193 líneas) coexiste con [routes/sessions/index.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/routes/sessions/index.ts) que solo delega partes CRUD. Falta descomponer sub-recursos (`prompts`, `stream/sse`, `tools`, `delegations`).
  - [routes/files.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/routes/files.ts) (848 líneas).
  - [routes/teams.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/routes/teams.ts) (495 líneas).
  - [routes/agents.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/routes/agents.ts) (373 líneas).

#### 🔴 Regla 4: Zod Validation en Cada Ruta
- Hay endpoints que procesan JSON directamente con `await c.req.json()` sin pasar por `zValidator`:
  - `routes/sessions.ts#L1224`: `const { status } = await c.req.json();`
  - `routes/prompts.ts#L14` y `routes/config.ts#L68`.
  - Múltiples handlers en `routes/files.ts`.

#### 🔴 Regla 5: `AppError` para Todos los Errores
- Se lanzan `throw new Error(...)` nativos o clases custom derivando directamente de `Error` (ej. `SessionDomainError` en [create-user-session.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/core/session/create-user-session.ts#L8), y en [agent-registry.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/agents/agent-registry.ts#L84), `routes/files.ts`, `routes/preview.ts`) en lugar de estructurarse bajo la jerarquía `AppError`.

#### 🔴 Regla 6: `ToolRegistry` como Fuente Única de Verdad
- [tool-activation-engine.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/core/session/tool-activation-engine.ts#L42-L46) contiene arreglos con nombres de herramientas hardcodeados (`"bash"`, `"exa_search"`, `"web_fetch"`, `"manage_preview"`, `"memory"`).
- [tool-factory.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/core/session/tool-factory.ts) instancia arreglos ad-hoc en lugar de consultar y registrar dinámicamente mediante `ToolRegistry`.

#### 🔴 Regla 7: Tipos Compartidos en `packages/shared`
- Interfaces de contrato como `CreateUserSessionInput`, `CreatedSessionDto`, `AgentRuntimeConfig` están definidas inline dentro de `apps/server/src/core/session/` en lugar de centralizarse en `packages/shared`.

#### 🔴 Regla 8: TypeScript Estricto, Sin `any`
- Contratos de puertos centrales ([core-services.port.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/core/ports/core-services.port.ts) y [agent-runtime.port.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/core/ports/agent-runtime.port.ts)) contienen abundante tipado `any` (`messages: any[]`, `customTools?: any[]`, `listener: (username: string, event: any) => void`, `result: any`).

#### 🔴 Regla 9: Sin Comentarios en Código de Producción
- Comentarios explicativos de flujo presentes en código de producción (ej. en [session-manager.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/core/session/session-manager.ts#L87-L130): `// 1. Cancelar TODAS las delegaciones...`, `// 2. Subagentes en disco...`).

#### 🔴 Regla 10: Archivos ≤ 300 Líneas (God Objects)
12 archivos superan el límite estricto de 300 líneas:
1. `routes/sessions.ts` — **1.193 líneas**
2. `routes/files.ts` — **848 líneas**
3. `core/session/agent-session.ts` — **791 líneas**
4. `core/stores/session-persistence.ts` — **647 líneas**
5. `core/session/prompt-builder.ts` — **502 líneas**
6. `routes/teams.ts` — **495 líneas**
7. `core/session/agent-utils.ts` — **405 líneas**
8. `core/session/agent-runtime.ts` — **373 líneas**
9. `routes/agents.ts` — **373 líneas**
10. `agents/agent-registry.ts` — **359 líneas**
11. `core/session/session-manager.ts` — **334 líneas**
12. `core/session/workspace-resolver.ts` — **320 líneas**

---

### 3. Acoplamientos y Duplicaciones entre los 3 Sistemas

1. **Agentes ↔ Sesiones (Duplicación en Subagentes & Nombres Confusos)**:
   - `spawn-subagent.ts` recrea manualmente la estructura en disco y metadatos de sesión para subagentes en lugar de reutilizar `SessionManager.getOrCreateSession`.
   - En [agent-session.ts](file:///c:/Users/themi/AgentWorkspace/the-spaces/apps/server/src/core/session/agent-session.ts#L88), la propiedad `sessionManager` es un alias a `JsonlSessionStore` (persistencia JSONL), generando colisión conceptual con la clase orchestradora `SessionManager`.

2. **Workspaces/Sandboxes ↔ Sesiones (Resolución Fragmentada de Habilidades y Permisos)**:
   - La búsqueda de carpetas de habilidades (`.spaces/skills`, `.agents/skills`, `.pi/skills`) y rutas de workspace está duplicada entre `workspace-resolver.ts`, `workspace-config-loader.ts`, `user-config.ts` y `agent-runtime.ts`.
   - `LocalSandbox` se crea como un componente plano en `server-context.ts` sin contexto de sesión. La seguridad y chequeos de path traversal se efectúan de forma dispersa entre `beforeToolCallHook`, `PermissionEngine`, `subagent-permissions.ts` y comprobaciones inline en `routes/files.ts` / `routes/preview.ts`.

3. **Agentes ↔ Workspaces (I/O Directo a Disco)**:
   - `AgentRegistry` realiza I/O directo contra `.spaces/agents` o directorios de usuario para persistencia de definiciones JSON, ignorando la capa de abstracción de workspace (`SpacesHost` / `WorkspaceResolver`).

---

¿Querés que planifiquemos la refactorización comenzando por algún módulo específico (por ejemplo, descomponer `routes/sessions.ts` o migrar las dependencias centrales a `ServerContext`)?