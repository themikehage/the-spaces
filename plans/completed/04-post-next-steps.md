# Spaces — Lo que viene después de resolver los 14 ítems

> Este documento asume que los 14 ítems del `03-core-sdk-next-steps.md` están completamente implementados.
> La pregunta que responde: ¿qué territorio nuevo se abre cuando eso esté hecho?

---

## Qué tendremos cuando los 14 ítems estén completos

Antes de planificar lo que sigue, hay que ser precisos sobre el suelo que pisaremos:

| Capacidad                    | Estado post-14 ítems                                                 |
| ---------------------------- | -------------------------------------------------------------------- |
| `ToolActivationPolicy`       | Configurable por workspace/agente — sin hardcoding                   |
| `ToolCatalog` unificado      | Una fuente de verdad con grupos semánticos                           |
| `prompt-builder` desacoplado | Sin importaciones circulares, testeable en aislamiento               |
| `DelegationRegistry` limpio  | Opera solo con paths, no con singletons                              |
| Memory: decisión tomada      | O auto-inject funcional, o eliminado como no-op                      |
| Pipelines/lab                | Feature-flaggeado o implementado — no crashea en runtime             |
| `getExtensions()` evaluado   | Decisión documentada, posiblemente conectado                         |
| Path de sesión único         | `getOrCreateSession` y `createAgentServer` unificados o documentados |
| MCP con health check         | Sin procesos zombie, restart automático                              |
| Auto-compaction              | Sesiones largas no fallan silenciosamente                            |
| Audit log real               | Trazabilidad de tool calls vía `afterToolCall`                       |
| UI workspace config          | Usuario gestiona `.spaces/config.json` desde la UI                   |
| Vista árbol delegaciones     | Jerarquía padre-hijo visible en tiempo real                          |
| Modelos por entidad desde UI | Selector de modelo en vista de agente y proyecto                     |

Con esto resuelto, la plataforma tiene una base arquitectónicamente limpia, operacionalmente observable y extensible. **Es el momento correcto para crecer**.

---

## Territorio que se abre

### 1. SDK público (`packages/sdk-*`)

Esto es lo que bloqueamos explícitamente en las Fases 0-2 con "No crear `packages/sdk-*` todavía". Cuando los 14 ítems estén completos, **ese bloqueo desaparece**.

**Por qué ahora y no antes:**

- `ToolCatalog` unificado (ítem 4) es necesario para que un SDK tenga una API de tools coherente
- `ToolActivationPolicy` (ítem 1) permite que el SDK sea extensible sin tocar código interno
- Path de sesión único (ítem 8) garantiza que el SDK exponga UN solo punto de entrada, no dos
- Memory y pipelines decididos (ítems 5 y 6) evitan que el SDK publique APIs no-op o rotas

**Lo que involucra:**

```
packages/core      → tipos + Zod (desde shared, ya existe)
packages/runtime   → createAgentRuntime, hooks, session factory
packages/tools     → factories con Host inyectado
packages/providers → ProviderAdapter[]
```

**Decisiones pendientes en ese momento:**

- Versionado semver desde el día 1 vs. internal-only por ahora
- Estrategia de publicación: monorepo público, npm privado, o solo uso interno
- Si `AgentHarness` del vendor se expone directamente o se abstrae

---

### 2. `SpacesHost` como contrato de integración

Una vez que el SDK existe, cualquier sistema externo (otra aplicación, un CLI, un worker serverless) necesita implementar `SpacesHost`. Hoy ese contrato está esbozado en `core-architecture-report.md` pero no existe como código:

```ts
interface SpacesHost {
  fs: WorkspaceFs;
  env: EnvStore;
  models: ModelRegistryPort;
  events: EventBus;
  approvals: ApprovalPort;
  delegations: DelegationPort;
  config: WorkspaceConfigPort;
  memory?: MemoryPort;
  mcp?: McpPort;
  agents?: AgentDirectoryPort;
  teams?: TeamDirectoryPort;
  scope?: ScopePort;
}
```

**Lo que queda por definir:**

- ¿Qué puertos son obligatorios vs. opcionales para arrancar un runtime mínimo?
- ¿Cómo maneja el Host errores parciales? (memory down, MCP process dead)
- Tests de integración que validen que el Host de Spaces sigue cumpliendo el contrato

---

### 3. Workflows como ciudadanos de primera clase

`WorkspaceConfig` ya tiene un campo `workflows?: string[]` pero no hay motor que los ejecute. Una vez que:

- `ToolCatalog` existe (ítem 4)
- `ToolActivationPolicy` funciona (ítem 1)
- `DelegationService` es estable (ya en Fase 1)

...los workflows pasan de ser un campo ignorado a ser ejecutables.

**Lo que involucra:**

- Motor de workflows: una secuencia declarativa de tool calls con condiciones y branches
- Triggers: manual (tool `run_workflow`), automático (on file change, on delegation complete, on schedule)
- Persistencia: estado del workflow en el JSONL tree (mismo patrón que task-state)
- UI: lista de workflows disponibles para un workspace, estado de ejecución en tiempo real

**Por qué esto importa para el posible SDK:** los workflows son el mecanismo que permite a usuarios no-técnicos definir automatizaciones sin escribir código de agente.

---

### 4. Observabilidad real (más allá del audit log)

El ítem 11 de los 14 da trazabilidad de tool calls. Eso es el piso de observabilidad. Lo que viene después es la capa de análisis:

**Métricas por sesión/agente/proyecto:**

- Tokens usados por sesión (ya están en metadata) → agregados por proyecto
- Tool calls más frecuentes por agente → para optimizar tool activation
- Delegaciones que fallan o se bloquean frecuentemente → para mejorar los prompts de delegación
- Latencia por tool → para identificar tools lentas

**Dashboard de operaciones:**

- Vista de todas las sesiones activas en tiempo real
- Árbol de delegaciones global (no por sesión individual)
- Alertas: sesión sin actividad > N minutos, contexto > X tokens, MCP process down

**Prerequisito del ítem 11:** sin el audit log estructurado, este punto es imposible. Por eso el orden importa.

---

### 5. Multi-workspace y tenancy avanzada

Hoy cada usuario tiene un workspace global y proyectos. Una vez que:

- `WorkspaceConfigPort` funciona (Fases 0-2)
- `ToolActivationPolicy` por workspace funciona (ítem 1)
- MCP está aislado correctamente (ítem 9)

...se puede plantear tenancy más sofisticada:

**Organizaciones / equipos:**

- Un workspace compartido por organización con config base
- Merge de configs: `org → proyecto → override de sesión`
- Permisos a nivel de organización (quién puede crear agentes, qué tools puede usar)

**Aislamiento fuerte:**

- Procesos MCP por organización, no solo por usuario
- Filesystem namespacing más granular
- Rate limiting por organización vs. por usuario

**Por qué no antes:** con el `ToolActivationEngine` hardcodeado (ítem 1 sin resolver), cualquier política de organización requeriría tocar código core. Con `ToolActivationPolicy` configurable, se pueden definir políticas por org en config.

---

### 6. Testing de agentes

Hoy no hay una forma de testear el comportamiento de un agente de forma determinista. Esto es crítico si queremos:

- Garantizar que un agente definido en `agent.json` se comporta como se espera
- Hacer CI/CD sobre cambios en prompts o skills
- Permitir a usuarios testear sus agentes antes de deployarlos a producción

**Lo que involucra:**

- `AgentTestHarness`: modo de ejecución determinista con tools mockeadas
- Fixtures de conversación: input/output esperados para un agente dado
- Runner en CI: ejecutar test suites contra un agente

**Prerequisito:** `DelegationRegistry` limpio (ítem 3) y `prompt-builder` desacoplado (ítem 2) son necesarios para poder testear agentes en aislamiento. Con singletons y ciclos, mockear el entorno es imposible.

---

### 7. Pipelines como producto

El ítem 6 resuelve el crash (feature flag o módulos implementados). Lo que viene después es construir pipelines como una capacidad real:

**Pipeline engine completo:**

- Secuencias de tools con variables `{output.fieldName}` → siguiente step
- Branching condicional basado en output de un step
- Loops con límite de iteraciones
- Persistencia de estado intermedio (recovery si falla un step)

**UI de pipelines:**

- Builder visual drag-and-drop de steps
- Historial de ejecuciones con output por step
- Templates de pipelines comunes (ej: "analizar repo → generar reporte → compartir")

**Por qué es un producto:** pipelines son la manera en que usuarios no-técnicos componen herramientas sin delegaciones. Es más predecible que un agente autónomo y más potente que un script manual.

---

### 8. Extensibilidad real de la plataforma

Una vez que `getExtensions()` está evaluado (ítem 7) y el SDK existe, se puede construir un modelo de plugins formal:

**Plugin API:**

- Registrar tools nuevas sin tocar el server
- Registrar providers de modelo nuevos
- Hooks para eventos del sistema (session start, delegation complete, tool call)
- Configuración de plugin en `agent.json` / `.spaces/config.json`

**Casos de uso:**

- Un plugin de Notion que expone tools de Notion sin necesidad de MCP
- Un plugin de billing que trackea uso por usuario
- Un plugin de CI que dispara pipelines cuando un agente completa una tarea

**Prerequisito duro:** esto SOLO tiene sentido cuando el SDK está publicado y `ToolActivationPolicy` es configurable. Sin eso, un "plugin" es simplemente código interno más.

---

## Resumen: horizonte post-14 ítems

```
Corto plazo (inmediato después de los 14 ítems):
├── SDK packages/sdk-*
└── SpacesHost como contrato de integración

Medio plazo:
├── Workflows como ciudadanos de primera clase
├── Observabilidad y dashboard de operaciones
└── Testing de agentes (AgentTestHarness)

Largo plazo / producto maduro:
├── Multi-workspace / tenancy avanzada
├── Pipelines como producto con UI
└── Extensibilidad formal (plugin API)
```

---

## Lo que estos 14 ítems habilitan específicamente

Para cada ítem, qué territorio nuevo abre una vez resuelto:

| Ítem resuelto                     | Habilita                                                           |
| --------------------------------- | ------------------------------------------------------------------ |
| 1. ToolActivationPolicy           | SDK con API de tools extensible; plugins; políticas por org        |
| 2. Circular import prompt-builder | AgentTestHarness (testear prompts en aislamiento)                  |
| 3. DelegationRegistry limpio      | Tests de integración de delegaciones; DelegationPort en SDK        |
| 4. ToolCatalog unificado          | SDK con grupos semánticos de tools; UI de tool selection coherente |
| 5. Memory decisión                | SDK con MemoryPort documentado y funcional                         |
| 6. Pipelines/lab estables         | Pipeline engine como producto real                                 |
| 7. getExtensions() evaluado       | Arquitectura de extensiones formal                                 |
| 8. Path de sesión único           | `createAgentRuntime` con un solo contrato                          |
| 9. MCP con health check           | McpPort en SDK con ciclo de vida gestionado                        |
| 10. Auto-compaction               | Sesiones de long-running agents (days/weeks) viables               |
| 11. Audit log real                | Dashboard de observabilidad; métricas por agente                   |
| 12. UI workspace config           | Onboarding de usuarios sin JSON manual                             |
| 13. Vista árbol delegaciones      | Debugging de multi-agent viable; observabilidad del grafo          |
| 14. Modelos por entidad UI        | Configuración de fleets de agentes con modelos específicos         |

---

## Una pregunta que hay que responder antes del SDK

**¿Queremos que el SDK sea consumible desde fuera de Spaces, o es un SDK interno para organizar el propio monorepo?**

- **Interno:** las restricciones de publicación no aplican; el foco es la arquitectura limpia y la testabilidad
- **Externo:** versioning semver, breaking changes, documentación pública, ejemplos, compatibility policy

Esta decisión cambia significativamente el scope del trabajo. El diseño de los puertos (`SpacesHost`, etc.) puede ser idéntico en ambos casos, pero el packaging, la documentación y la política de cambios son muy distintos.

No es una pregunta urgente hoy, pero hay que tenerla respondida antes de empezar `packages/sdk-*`.
