# Spaces — Deuda Técnica Estructural

> Este documento analiza 5 áreas de deuda técnica identificadas tras análisis profundo del codebase.
> Son problemas de arquitectura y mantenibilidad, no de features faltantes.
> Resolverlos es pre-condición para cualquier crecimiento saludable del monorepo.

---

## Área 1: Singleton Hell → Dependency Injection

### Diagnóstico

El codebase tiene 10+ singletons a nivel de módulo que se instancian al importar:

| Singleton              | Módulo                         | Problema                                                  |
| ---------------------- | ------------------------------ | --------------------------------------------------------- |
| `mcpRegistry`          | `core/mcp-registry.ts`         | Estado global por proceso, imposible de aislar por tenant |
| `sessionManager`       | `core/session-manager.ts`      | Dependencia circular con delegation-registry              |
| `delegationRegistry`   | `core/delegation-registry.ts`  | Importado como singleton, lazy-imports para romper ciclos |
| `sessionToolFactory`   | `core/session-tool-factory.ts` | Acoplado al singleton de sessionManager                   |
| `userConfigManager`    | `core/user-config-manager.ts`  | Estado compartido entre todas las sesiones                |
| `sessionMetadataStore` | `session/metadata-store.ts`    | Un store por módulo, no por instancia                     |
| `sessionPromptBuilder` | `ai/session-prompt-builder.ts` | Depende de múltiples singletons para armar prompts        |
| `memoryRegistry`       | `core/memory/registry.ts`      | Estado global de memory engines                           |
| `serverSpacesHost`     | `core/spaces-host.ts`          | Singleton del host, referenciado desde routes y ws        |
| `uiApprovalRegistry`   | `core/ui-approval-registry.ts` | Registro global de handlers de UI                         |

Las dependencias circulares se resuelven con lazy imports:

```typescript
// agent-session.ts:618
const { delegationRegistry } = await import("../core/delegation-registry");
```

Esto es frágil: rompe tree-shaking, complica el orden de inicialización y hace imposible crear instancias aisladas para testing. Cada test que toca una ruta levanta el servidor entero con todos los singletons.

### Qué hace ADK

Solo existen singletons intencionales: `PluginManager` y `LLMRegistry` para registro global. El resto de servicios se inyectan vía el constructor de `Runner` o a través de `InvocationContext`. Cada request recibe su propio contexto con referencias a los servicios que necesita.

### Lo que falta

- **AppContext o ServerContext**: un objeto que contenga todas las referencias a servicios, creado por request o por tenant. Pasado por parámetros en lugar de importado.
- **Constructor injection**: refactorizar las clases que hoy dependen de singletons para recibir dependencias por constructor.
- **Interfaces para romper ciclos**: extraer interfaces para `SessionManager`, `DelegationRegistry`, `McpRegistry` y que los módulos dependan de la interfaz, no del singleton concreto.
- **Factory functions**: reemplazar `export const x = new X()` por `export function createX(deps) { return new X(deps) }`.
- **Testing sin levantar el servidor**: cada servicio debe poder instanciarse con mocks. Hoy es imposible testear `AgentSession` sin levantar `SessionManager`, `DelegationRegistry`, `McpRegistry` y todo el árbol de dependencias.

### Volumen estimado

| Módulo                          | Archivos afectados         | Complejidad                                               |
| ------------------------------- | -------------------------- | --------------------------------------------------------- |
| AppContext + interfaces         | ~5 nuevos, ~15 modificados | Alta — diseño arquitectónico                              |
| Refactor singletons a factories | ~20 archivos               | Media — mecánico pero requiere cuidado con inicialización |
| Romper dependencias circulares  | ~8 archivos                | Alta — requiere extraer interfaces y reordenar imports    |
| Testing isolation               | ~10 archivos de test       | Media — una vez que la DI existe                          |

---

## Área 2: God Object AgentSession

### Diagnóstico

`agent-session.ts` tiene 852 líneas y mezcla responsabilidades no relacionadas:

```typescript
// Un solo archivo contiene:
class AgentSession {
  // Tool registry
  registerTool(), getTools(), listTools()

  // Event bus
  on(), emit(), removeListener()

  // Session state
  restore(), getState()

  // Model management
  switchModel(), getModelConfig(), setThinkingLevel()

  // Skill loading
  loadSkills(), getAvailableSkills()

  // Prompt construction
  buildSystemPrompt(), getContext()

  // Context estimation
  estimateContextUsage()

  // Session stats
  getStats(), trackUsage()

  // Compaction
  compact(), shouldCompact()

  // Tree navigation
  getParentSession(), getChildSessions(), getTreePath()

  // Lifecycle
  abort(), steer(), followUp(), dispose()
}
```

Esto viola el Principio de Responsabilidad Única. Cualquier cambio en el modelo de prompts, el sistema de compaction o el event bus toca el mismo archivo. El archivo crece con cada feature nueva.

### Qué hace ADK

`BaseAgent` (~200 líneas) define el contrato mínimo. `LlmAgent` (~1240 líneas) implementa el loop, pero delega responsabilidades:

- **Request/Response processors**: cada uno es una clase separada con una responsabilidad clara
- **PluginManager**: hooks de ciclo de vida del agente
- **Pipeline**: composición de processors, no lógica monolítica

### Lo que falta

- **ToolRegistry**: módulo independiente que gestione registro, lookup y activación de tools.
- **EventBus**: extraer la lógica de eventos (hoy mezclada en AgentSession) a una clase `TypedEventEmitter` reutilizable.
- **SkillLoader**: separar Discovery (`findSkillFiles`) de Inyección (`injectSkillContext`). Hoy están en `load-skills.ts` + `resource-loader.ts` + `agent-session.ts`.
- **PromptBuilder**: consolidar `session-prompt-builder.ts` + `resource-loader.ts` + lógica inline de AgentSession en un solo módulo con responsabilidad clara.
- **ContextEstimator**: extraer `estimateContextUsage()` a un módulo con su propia estrategia de token counting.
- **CompactionManager**: extraer `compact()` + `shouldCompact()` + integración con `harness/compaction/` en un módulo independiente.
- **SessionNavigator**: extraer abort, steer, followUp, y navegación del árbol de sesiones a `NavigationController`.
- **AgentSession como orchestrator**: después de extraer todo, AgentSession queda como capa fina que orquesta los módulos extraídos. Idealmente <200 líneas.

### Volumen estimado

| Extracción                  | Nuevo archivo                   | Líneas movidas | Riesgo                                   |
| --------------------------- | ------------------------------- | -------------- | ---------------------------------------- |
| ToolRegistry                | `core/tool-registry.ts`         | ~80            | Bajo — extracción mecánica               |
| EventBus                    | `core/event-bus.ts`             | ~60            | Bajo — interfaz simple                   |
| SkillLoader                 | `ai/skill-loader.ts`            | ~100           | Medio — integración con filesystem       |
| PromptBuilder               | `ai/prompt-builder.ts`          | ~150           | Medio — consolidación de 3 fuentes       |
| ContextEstimator            | `ai/context-estimator.ts`       | ~50            | Bajo — lógica autocontenida              |
| CompactionManager           | `ai/compaction-manager.ts`      | ~120           | Medio — dependencia con JSONL tree       |
| NavigationController        | `core/navigation-controller.ts` | ~150           | Alto — abort/steer/followUp son críticos |
| AgentSession (orchestrator) | `agent-session.ts`              | ~200 restantes | Alto — cambia la API pública             |

---

## Área 3: Dual SessionManager — Nombres Confusos

### Diagnóstico

Dos clases con el mismo nombre, responsabilidades distintas:

| Archivo                         | Clase            | Responsabilidad                                                                              | Import alias             |
| ------------------------------- | ---------------- | -------------------------------------------------------------------------------------------- | ------------------------ |
| `src/ai/session-persistence.ts` | `SessionManager` | Persistencia en JSONL: escribir entradas, reconstruir contexto, navegar el árbol de sesiones | —                        |
| `src/core/session-manager.ts`   | `SessionManager` | Orquestador de aplicación: crear sesiones, asignar tools, modelos, workspace, hooks          | `VendoredSessionManager` |

El archivo `src/core/session-manager.ts` importa al otro como:

```typescript
import { SessionManager as VendoredSessionManager } from "../ai/session-persistence.js";
```

Para un contributor nuevo, encontrar `SessionManager` en dos lugares con responsabilidades completamente distintas pero relacionadas es confuso. El alias `Vendored` sugiere que es código externo (no lo es). La palabra "vendor" en el codebase se usa para `@vendor/agent`, no para persistencia.

### Qué hace ADK

Nombres explícitos que describen la responsabilidad:

- `InMemorySessionService` — sesiones en memoria
- `DatabaseSessionService` — sesiones en base de datos
- `VertexAiSessionService` — sesiones en Vertex AI

No hay ambigüedad sobre qué hace cada clase.

### Lo que falta

- **Renombrar `src/ai/session-persistence.ts`**: la clase `SessionManager` → `JsonlSessionStore`. El archivo puede mantener su nombre o renombrarse a `jsonl-session-store.ts`.
- **Renombrar `src/core/session-manager.ts`**: mantener `SessionManager` (es el orquestador principal, merece el nombre canónico) o renombrar a `SessionOrchestrator`.
- **Actualizar todos los imports**: ~30 archivos que importan desde `session-persistence.ts` o `session-manager.ts`.
- **Agregar JSDoc**: documentar la responsabilidad exacta de cada clase, sus dependencias y su ciclo de vida.
- **Eliminar el alias `Vendored`**: el prefijo "vendor" debe reservarse para `@vendor/agent` y `@vendor/ai`.

### Volumen estimado

| Tarea                                  | Archivos                        | Complejidad                                 |
| -------------------------------------- | ------------------------------- | ------------------------------------------- |
| Renombrar `JsonlSessionStore`          | 2 archivos (definición + tests) | Baja                                        |
| Actualizar imports en todo el codebase | ~30 archivos                    | Baja — buscar y reemplazar                  |
| JSDoc en ambas clases                  | 2 archivos                      | Baja                                        |
| Verificar que nada se rompe            | —                               | Media — requiere correr test suite completa |

---

## Área 4: Route Files — Monolitos de 1000+ Líneas

### Diagnóstico

Los archivos de rutas concentran demasiadas responsabilidades:

| Archivo                  | Líneas | Rutas que contiene                                                                                                                             |
| ------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/sessions.ts` | 1287   | CRUD, prompt, stream SSE, modelos, tools, permisos, contexto, skills, export (3 formatos), delegaciones, subagentes, tareas, logs de ejecución |
| `src/routes/teams.ts`    | Grande | CRUD de equipos, miembros, asignación de agentes, ejecución                                                                                    |
| `src/routes/agents.ts`   | Grande | CRUD de agentes, config de modelos, tools, skills                                                                                              |

Un solo archivo con 1287 líneas mezcla:

- Operaciones REST (GET, POST, PUT, DELETE)
- Lógica de streaming (SSE)
- Validación de permisos
- Transformación de formatos (export JSON, Markdown, texto)
- Manejo de errores

El problema no es solo estético: dos personas trabajando en features distintas de sesiones (ej: export en formato nuevo + streaming de delegaciones) tocan el mismo archivo y generan conflictos de merge. Además, el archivo es difícil de navegar y hace que los code reviews sean más lentos de lo necesario.

### Qué hace ADK

Responsabilidades separadas en archivos enfocados. Las rutas se generan a partir de specs, no se escriben a mano como monolitos. Cada archivo tiene un propósito claro y es razonable de revisar en una sentada.

### Lo que falta

- **Directorio `src/routes/sessions/`**: dividir `sessions.ts` en sub-routers:
  - `session-crud.ts` — crear, leer, actualizar, eliminar sesiones
  - `session-prompt.ts` — ejecutar prompts, manejar respuesta
  - `session-stream.ts` — streaming SSE de respuestas del agente
  - `session-models.ts` — obtener y cambiar modelo de sesión
  - `session-tools.ts` — permisos de tools, MCP tools por sesión
  - `session-delegations.ts` — crear, listar, seguir delegaciones
  - `session-export.ts` — exportar en JSON, Markdown, texto
  - `session-tasks.ts` — CRUD de tareas y logs de ejecución
  - `index.ts` — montar todos los sub-routers en un `Hono` router raíz

- **Directorio `src/routes/teams/`**: misma estrategia de división por responsabilidad.

- **Directorio `src/routes/agents/`**: misma estrategia de división por responsabilidad.

- **Guideline de tamaño máximo**: establecer 300 líneas como techo por archivo de ruta. Si un archivo crece más, es señal de que necesita dividirse.

- **Hono route grouping**: usar `new Hono().route('/sessions', sessionsRouter)` para componer rutas sin perder la estructura de paths.

### Volumen estimado

| Tarea                                  | Archivos nuevos               | Archivo original                    | Complejidad                                        |
| -------------------------------------- | ----------------------------- | ----------------------------------- | -------------------------------------------------- |
| Split `sessions.ts`                    | ~9 sub-routers + 1 index      | Reducir a <50 líneas (solo montaje) | Media — requiere entender dependencias entre rutas |
| Split `teams.ts`                       | ~5 sub-routers + 1 index      | Reducir a <50 líneas                | Media                                              |
| Split `agents.ts`                      | ~5 sub-routers + 1 index      | Reducir a <50 líneas                | Media                                              |
| Actualizar imports en server bootstrap | 1 archivo (`server/index.ts`) | —                                   | Baja                                               |

---

## Área 5: WebSocket — Contrato Sin Estandarizar

### Diagnóstico

La comunicación WebSocket entre cliente y servidor no tiene un contrato compartido:

- Los mensajes se construyen y parsean inline en `ws/factory.ts`
- No hay tipos en `packages/shared` para el protocolo WS
- Cliente y servidor no comparten schemas de validación
- Agregar un nuevo tipo de mensaje requiere tocar código en 3 lugares distintos

Ejemplo del problema:

```typescript
// ws/factory.ts — mensaje construido con string literals
ws.send(JSON.stringify({ type: "session_stream", sessionId, data }));

// Cliente — parseo sin validación
const msg = JSON.parse(event.data);
if (msg.type === "session_stream") {
  /* confía en la forma */
}
```

Si el servidor cambia la forma del payload, el cliente no se entera hasta que rompe en runtime. No hay type safety de punta a punta.

### Qué hace ADK

Usa un sistema de eventos tipado con clases concretas:

- `Event`, `ContentEvent`, `ToolCallEvent`, `ToolResultEvent`
- `ThoughtEvent`, `ErrorEvent`, etc.
- El protocolo A2A tiene specs en YAML y tests de conformidad cross-language

Cada mensaje tiene un tipo bien definido y tanto emisor como receptor validan contra el mismo schema.

### Lo que falta

- **Tipos compartidos en `packages/shared`**: definir en un archivo `packages/shared/src/ws-messages.ts`:

  ```typescript
  // Discriminated union con type field
  export type WsMessage =
    | { type: "session_stream"; sessionId: string; chunk: string }
    | { type: "team_broadcast"; teamId: string; payload: unknown }
    | { type: "approval_request"; requestId: string; tool: string; params: unknown }
    | { type: "approval_response"; requestId: string; approved: boolean }
    | { type: "ui_action"; action: string; sessionId: string }
    | { type: "heartbeat"; timestamp: number }
    | { type: "error"; code: string; message: string };
  ```

- **Zod schemas para validación**: un schema por tipo de mensaje, compuesto en un discriminated union con `z.discriminatedUnion('type', [...])`.

- **Validación en ambos lados**:
  - Servidor: validar mensajes entrantes antes de procesarlos. Rechazar con error tipado.
  - Cliente: validar mensajes entrantes del servidor. Ignorar o loguear malformed messages.

- **Documentación del protocolo**: un `docs/websocket-protocol.md` que liste cada tipo de mensaje, su dirección (client→server, server→client, bidireccional), el schema y un ejemplo de payload.

- **Migración progresiva**: no es necesario migrar todos los mensajes de una vez. Se puede empezar con los más críticos (session_stream, approval) y agregar el resto incrementalmente. Durante la transición, mensajes sin tipo definido pasan por un fallback genérico.

### Volumen estimado

| Tarea                         | Archivos                           | Complejidad                                  |
| ----------------------------- | ---------------------------------- | -------------------------------------------- |
| Tipos + Zod schemas en shared | 1 nuevo (`ws-messages.ts`)         | Baja — definir schemas                       |
| Actualizar `ws/factory.ts`    | 1 archivo                          | Media — refactorizar builders y parsers      |
| Validación en cliente         | ~3 archivos (hooks WS del cliente) | Media — agregar Zod parse en cada handler    |
| Documentación del protocolo   | 1 archivo                          | Baja                                         |
| Migrar mensajes uno por uno   | Iterativo, ~10 tipos               | Media — incremental, riesgo bajo por mensaje |

---

## Resumen: las 5 áreas y su impacto

```
Área 1 — Singleton Hell → DI
├── Causa raíz de: imposibilidad de testear en aislamiento, acoplamiento global
├── Bloquea: testing de integración real, multi-tenancy por proceso
└── Esfuerzo: alto (cambia la forma de instanciar todo)

Área 2 — God Object AgentSession
├── Causa raíz de: archivos que crecen sin control, merges conflictivos
├── Bloquea: contributor velocity, onboarding de nuevos developers
└── Esfuerzo: alto (refactor con riesgo de regresión)

Área 3 — Dual SessionManager
├── Causa raíz de: confusión para nuevos contributors, nombres engañosos
├── Bloquea: nada crítico, pero erosiona la calidad percibida del codebase
└── Esfuerzo: bajo (rename mecánico)

Área 4 — Route Files Monolíticos
├── Causa raíz de: conflictos de merge, code review lento, navegación difícil
├── Bloquea: trabajo paralelo en features de sesiones/teams/agentes
└── Esfuerzo: medio (split mecánico con verificación de rutas)

Área 5 — WebSocket Sin Contrato
├── Causa raíz de: bugs silenciosos en runtime, type safety ausente
├── Bloquea: agregar nuevos tipos de mensaje con confianza
└── Esfuerzo: medio (schemas + migración incremental)
```

---

## Prioridad

**Área 3 (Dual SessionManager) primero.** Es la más barata, no tiene riesgo de regresión, y elimina una fuente de confusión que todo contributor nuevo encuentra en su primer día. Se puede completar en una sesión. Sirve como calentamiento para las refactorizaciones más grandes.

**Área 1 (Singleton Hell → DI) segundo.** Es la que más valor entrega: habilita testing aislado, rompe dependencias circulares de raíz, y establece el patrón de inyección que las demás áreas van a necesitar. Sin DI, el refactor de AgentSession (Área 2) es más difícil y riesgoso. Hacer DI antes de dividir AgentSession es la secuencia correcta.

**Área 2 (AgentSession) tercero.** Con la DI resuelta, extraer módulos de AgentSession es más seguro: cada módulo extraído recibe sus dependencias por constructor en lugar de importar singletons. El orden de extracción recomendado: EventBus → ToolRegistry → ContextEstimator → SkillLoader → PromptBuilder → CompactionManager → NavigationController. De menos a más acoplado.

**Área 5 (WebSocket) y Área 4 (Route Files) en paralelo o al final.** Son independientes entre sí y de las primeras 3 áreas. La de WebSocket es más urgente si se planea agregar nuevos tipos de mensaje pronto. La de rutas es más urgente si el equipo crece y hay conflictos de merge frecuentes en `sessions.ts`.

---

## Pregunta que hay que responder antes de empezar

**¿Hacemos las 5 áreas secuencialmente o en olas?**

- **Secuencial**: Área 3 → Área 1 → Área 2 → Área 4 → Área 5. Menos riesgo de conflictos de merge, pero más lento. Cada área se mergea a main antes de empezar la siguiente.
- **Olas paralelas**: Un developer toma Área 3+1+2 (dependientes entre sí), otro toma Área 4+5 (independientes). Más rápido pero requiere coordinación para no generar conflictos en archivos compartidos como `session-manager.ts` y `agent-session.ts`.

La respuesta depende de cuántos developers hay disponibles y qué tan urgente es cada área para el roadmap de features.
