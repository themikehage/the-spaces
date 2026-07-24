# Spaces — Next Steps: lo que queda después del Core SDK

> Este documento describe todo lo que **no** entra en el plan de las Fases 0-2 del Core SDK, pero que necesita resolverse para tener una plataforma extensible y sostenible.  
> Ordenado por impacto vs. riesgo de dejarlo sin atender.

---

## Tier 1 — Deuda crítica (bloquea features futuras)

### 1. `ToolActivationEngine` hardcodeado

**Dónde:** `core/session/tool-activation-engine.ts`

La lista `alwaysOnTools` está hardcodeada. Hay un caso especial para `lab-architect` en línea 40. Esto significa que cada nueva tool que quieras activar condicionalmente requiere tocar este archivo.

**Lo que falta:**

- Puerto `ToolActivationPolicy` que reciba context (agentId, projectId, workspaceConfig) y devuelva el conjunto de tools activas
- La `WorkspaceConfig` de Fase 2 debería poder agregar o quitar tools de la lista activa para ese workspace
- Eliminar el `if (resolvedAgentId === "lab-architect")` hardcodeado y moverlo a config de ese agente

---

### 2. `SessionPromptBuilder` importa `sessionManager` de forma circular

**Dónde:** `core/session/prompt-builder.ts:35`

```ts
const { sessionManager } = await import("../session-manager");
```

Es una importación dinámica para romper un ciclo. El prompt builder depende del session manager y el session manager llama al prompt builder. Esta circularidad es una bomba de tiempo.

**Lo que falta:**

- Invertir la dependencia: el prompt builder no debería saber del session manager
- Los datos que necesita (user settings, etc.) deben inyectarse como parámetros al llamarlo, no obtenerse desde dentro
- `BuildPromptsParams` debería incluir `userSettings` directamente

---

### 3. `DelegationRegistry` importa `sessionManager` directamente

**Dónde:** `core/delegation-registry.ts:3` y `core/delegation-registry.ts:25`

```ts
import { sessionManager } from "./session-manager";
// luego usa: sessionManager.userConfig.ensureUserDir(username)
```

La registry debería recibir `userDir` como parámetro, no resolver singletons internamente.

**Lo que falta:**

- `DelegationService` (de Fase 1) debería encapsular esta interacción
- `DelegationRegistry` debería operar solo con paths, no con el session manager

---

### 4. Tool list duplicada en 4+ lugares

**Evidencia:**

- `tool-activation-engine.ts` — `alwaysOnTools`, `definedToolNames`
- `shared/schemas.ts` — `AVAILABLE_TOOLS` (catálogo canónico)
- `metadata-store.ts` — fallback tools para teams Negotiation
- `manage-delegations-tool.ts` — tools mínimas para spawn/delegate

**Lo que falta:**

- Un único `ToolCatalog` en `shared` con grupos semánticos: `fs-tools`, `communication-tools`, `meta-tools`, `memory-tools`, etc.
- Cada contexto declara qué grupos quiere, no listas ad-hoc
- Esto también resuelve el problema de "always-on tools" siendo una lista string hardcoded

---

## Tier 2 — Stubs que aparentan funcionar pero no lo hacen

### 5. Memory auto-inject — no-op

**Dónde:** `core/session/session-memory-enricher.ts`

La función `enrichSessionWithMemory` está importada y llamada en `session-manager.ts` pero `injectMemoryContext` es internamente un no-op. El sistema carga memoria en SQLite, la tools de memory funcionan, pero nunca se inyecta contexto automático en el system prompt.

**Lo que falta:**

- Decidir si queremos auto-inject o solo on-demand via tool
- Si se quiere auto-inject: conectar `buildContext(query)` del provider con el system prompt en el momento correcto (post-build, pre-primer-turno)
- Si no: eliminar el `enrichSessionWithMemory` call del session manager para no confundir

---

### 6. `pipelines/*` y `laboratory/*` — módulos ausentes

**Dónde:** `core/tools/manage-pipelines-tool.ts` importa módulos que no existen.

Si un agente llama `manage_pipelines`, el tool falla en runtime. El tool está registrado en `alwaysOnTools` implícitamente por estar en `tool-factory.ts`.

**Lo que falta:**

- O implementar los módulos ausentes
- O remover el tool del registro hasta que esté listo (con feature flag)
- Agregar test de smoke que llame cada tool registrada y verifique que no explota al importar

---

### 7. `getExtensions()` — API de plugins vacía

**Dónde:** en vendor `agent.ts`

`getExtensions()` retorna array vacío. Es el punto de extensión oficial del vendor para hooks adicionales.

**Lo que falta:**

- Evaluar si es el mecanismo correcto para conectar el `afterToolCall` y otras extensiones
- Si sí: usarlo en lugar del hook manual de Fase 0
- Documentar qué pueden hacer las extensiones y qué no

---

## Tier 3 — Arquitectura pendiente (necesaria para escalar)

### 8. Dos paths de creación de sesión

**Evidencia:**

- `getOrCreateSession` — path principal desde HTTP/WS
- `createAgentServer` — path alternativo con toolsets distintos (usado en teams?)

**Lo que falta:**

- Determinar exactamente qué diferencia a `createAgentServer` de `getOrCreateSession`
- Unificar en un único factory con opciones, o documentar explícitamente por qué deben ser dos paths
- El riesgo: features nuevas implementadas en un path no están disponibles en el otro

---

### 9. Multi-tenant y aislamiento de procesos MCP

**Dónde:** `core/mcp-registry.ts`, `core/mcp-client.ts`

Los procesos MCP se cargan por usuario y persisten en memoria. No hay límite de procesos, no hay restart automático si un proceso MCP muere.

**Lo que falta:**

- Health check de procesos MCP activos
- Restart automático de procesos muertos
- Límite de procesos MCP simultáneos por usuario
- `McpPort` del plan SDK debería abstraer esto para que el host (Hono) sea el único que sabe de procesos

---

### 10. Compaction manual — sin trigger automático

**Dónde:** `ai/agent-session.ts`, `harness/compaction/*`

La compaction existe y funciona, pero es una API explícita. Si una sesión acumula contexto indefinidamente (team sessions, delegaciones largas), el modelo empieza a fallar silenciosamente al alcanzar el límite de contexto.

**Lo que falta:**

- Trigger automático de compaction cuando `buildSessionContext()` supera N tokens
- Métricas de tamaño de contexto expuestas en la sesión para que la UI pueda mostrar un warning
- La `WorkspaceConfig` podría configurar `autoCompactThreshold` por workspace

---

### 11. Audit log — casi inexistente

**Dónde:** `core/audit-log.ts` — 690 bytes, minimal

Solo hay un log para env-access. No hay trazabilidad de:

- Qué tools llamó cada agente
- Qué delegaciones se crearon/completaron
- Qué archivos se leyeron/escribieron
- Decisiones de HITL (permitir/denegar)

**Lo que falta:**

- El `afterToolCall` de Fase 0 es el punto de inserción natural para audit
- Schema de evento de audit (toolName, args hash, result status, duration, sessionId, parentSessionId)
- Storage: puede ser append-only JSONL por sesión (mismo patrón que el JSONL tree existente)

---

## Tier 4 — UX de configuración (lo que el usuario necesita hacer desde la UI)

### 12. UI para gestionar `.spaces/config.json`

Una vez que el loader de workspace config existe (Fase 2), los usuarios no deberían editar JSON manualmente.

**Lo que falta:**

- Pantalla de configuración de proyecto que permita:
  - Seleccionar modelo default para el proyecto
  - Activar/desactivar skills específicos
  - Configurar permission overrides
- El factory tool (`manage_factory`) debería poder escribir `.spaces/config.json`

---

### 13. Vista de árbol de delegaciones en tiempo real

La UI actual muestra delegaciones pero sin jerarquía visual del árbol padre-hijo.

**Lo que falta:**

- Evento WS `delegation_tree_update` cuando cambia la jerarquía
- Componente de árbol en el client que muestre el estado de cada nodo
- Indicador visual de qué sesiones están activas, bloqueadas, completadas en el árbol

---

### 14. Gestión de modelos por entidad desde la UI

Hoy el modelo se configura solo a nivel de usuario global.

**Lo que falta:**

- En la vista de agente: selector de modelo default para ese agente
- En la vista de proyecto: selector de modelo default para el proyecto
- Persistir en `agent.json` / `project.json` / `.spaces/config.json` según corresponda
- El `DefaultModelResolver` de Fase 1 ya soportaría esto automáticamente

---

## Resumen de prioridades

| #   | Item                                             | Riesgo si no se resuelve                      | Esfuerzo                  |
| --- | ------------------------------------------------ | --------------------------------------------- | ------------------------- |
| 1   | ToolActivationEngine hardcodeado                 | Features nuevas requieren tocar código core   | Medio                     |
| 2   | Circular import prompt-builder → session-manager | Bugs de inicialización difíciles de debuggear | Bajo                      |
| 3   | DelegationRegistry → sessionManager              | Intestable, acoplamiento circular             | Bajo                      |
| 4   | Tool list duplicada                              | Drift entre catálogos, herramientas fantasma  | Medio                     |
| 5   | Memory auto-inject no-op                         | Confusión — parece funcionar pero no          | Bajo                      |
| 6   | Pipelines/lab módulos ausentes                   | Crash en runtime al llamar el tool            | URGENTE — fácil de fixear |
| 7   | getExtensions() vacío                            | Extensibilidad bloqueada                      | Medio                     |
| 8   | Dos paths de sesión                              | Features incompletas según el path            | Alto                      |
| 9   | MCP sin health check                             | Procesos zombie, degradación silenciosa       | Medio                     |
| 10  | Compaction sin trigger auto                      | Sesiones largas fallan silenciosamente        | Alto                      |
| 11  | Audit log mínimo                                 | Cero visibilidad operacional                  | Medio                     |
| 12  | UI para workspace config                         | Config manual en JSON                         | Bajo (después de backend) |
| 13  | Vista árbol delegaciones                         | UX confusa para multi-agent                   | Medio                     |
| 14  | Modelos por entidad desde UI                     | Config solo vía API                           | Bajo (después de backend) |

---

## Lo que el Core SDK de Fases 0-2 SÍ resuelve

Para no perder de vista el progreso:

- ✅ Puerto `WorkspaceConfigPort` — config por workspace extensible
- ✅ `ModelResolver` unificado — cascada correcta y sin duplicación
- ✅ `DelegationService` — lógica de delegación testeable aislada
- ✅ Envelope v2 con `outputs` — payloads estructurados entre agentes
- ✅ `afterToolCall` cableado — punto de extensión para audit y side-effects
- ✅ Lazy requires eliminados en `metadata-store` — ciclos de dependencia cortados
- ✅ `.spaces/config.json` — mecanismo de config por workspace funcional

Los items del Tier 1 y 2 son el trabajo inmediato post-Fase 2.
