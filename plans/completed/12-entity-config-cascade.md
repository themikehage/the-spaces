# Spaces — 12 · Configuración por Entidad con CascadeConfigLoader

> Este documento analiza el estado actual de la configuración por entidad (agente, proyecto, equipo, global) en Spaces, diagnostica los gaps de consumo del archivo `.spaces/config.json`, y diseña un `CascadeConfigLoader` genérico, desacoplado y extensible con herencia en cascada.

---

## Diagnóstico de Partida

### Estructura de Workspaces por Entidad (YA EXISTE)

Cada entidad tiene su propio directorio `workspace/` en disco, definido en `packages/shared/src/paths.ts`:

```
{SPACES_DATA_PATH}/users/{username}/
├── workspace/                          ← Global
│   └── .spaces/config.json            ← Config global
├── agents/{agentId}/
│   └── workspace/                      ← Agente
│       └── .spaces/config.json        ← Config del agente
├── projects/{projectId}/
│   └── workspace/                      ← Proyecto
│       └── .spaces/config.json        ← Config del proyecto
└── teams/{teamId}/
    └── workspace/                      ← Equipo
        └── .spaces/config.json        ← Config del equipo
```

| Entidad  | Función en `paths.ts`                         | Resolución de workspace                    |
| -------- | --------------------------------------------- | ------------------------------------------ |
| Global   | `getWorkspaceDir(username)`                   | `users/{username}/workspace`               |
| Agente   | `getAgentWorkspaceDir(username, agentId)`     | `users/{username}/agents/{id}/workspace`   |
| Proyecto | `getProjectWorkspaceDir(username, projectId)` | `users/{username}/projects/{id}/workspace` |
| Equipo   | `getTeamWorkspaceDir(username, teamId)`       | `users/{username}/teams/{id}/workspace`    |

La resolución de workspace por entidad ya funciona con prioridad (`workspace-resolver.ts:202-213`):

```
teamId > projectId > agentId > global
```

Y `scopeConfigManager.getAgentMembership()` ya resuelve membresía de agentes a proyectos (`scope-config-manager.ts:277-293`): si un agente pertenece a un proyecto, se usa el workspace del proyecto.

### El Contrato `WorkspaceConfig` — Diseñado pero NO Consumido

**Archivo:** `apps/server/src/core/ports/workspace-config.port.ts:2-8`

```ts
export interface WorkspaceConfig {
  rules?: string[];
  skills?: string[];
  workflows?: string[];
  defaultModel?: string;
  permissionOverrides?: Record<string, "allow" | "deny" | "ask">;
}
```

**Archivo:** `apps/server/src/core/session/workspace-config-loader.ts`

`FileWorkspaceConfigLoader` implementa `WorkspaceConfigPort` y sabe leer `.spaces/config.json` del disco. **Pero ningún runtime lo consume:**

| Campo                 | Estado                                                                    |
| --------------------- | ------------------------------------------------------------------------- |
| `defaultModel`        | Definido en la interfaz. `DefaultModelResolver` NO lo consulta.           |
| `permissionOverrides` | Definido en la interfaz. `PermissionEngine.evaluate()` NO lo consulta.    |
| `skills`              | Definido en la interfaz. `DefaultResourceLoader.reload()` NO lo consulta. |
| `rules`               | Definido en la interfaz. No tiene consumidor.                             |
| `workflows`           | Definido en la interfaz. No tiene consumidor.                             |

El único lugar donde se expone es `ServerSpacesHost.config.load()` (`spaces-host.ts:108-111`), que delega a `workspaceConfigLoader.load()`. Ninguna otra parte del runtime lo invoca.

### Patrones de Merge/Herencia Ya Existentes (Reutilizables)

El codebase ya tiene varios patrones de merge en cascada que pueden reutilizarse:

| Patrón                          | Archivo                           | Mecanismo                                                                              |
| ------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| **ToolActivationEngine**        | `tool-activation-engine.ts:34-81` | Merge de `sessionTools` + `alwaysOnTools` + `customTools` con `add`/`remove`           |
| **ScopeConfigManager cascade**  | `scope-config-manager.ts:295-318` | Resuelve tools para un agente: global → proyecto → agente-específico                   |
| **PromptFragmentRegistry**      | `prompts/registry.ts:45-57`       | Overrides de workspace (`prompt-overrides.json`) pisan defaults                        |
| **Subagent permissions**        | `subagent-permissions.ts:117-182` | Merge 3-capas: system defaults → parent constraints → user decisions (last-match-wins) |
| **AgentRuntime tool overrides** | `agent-runtime.ts:136-141`        | Custom tools pisan factory tools por nombre (Set-based merge)                          |
| **SessionMetadataStore merge**  | `metadata-store.ts:45`            | `Object.assign(metadata, data)` — shallow merge de campos nuevos sobre existentes      |

---

## Diseño Propuesto

### 1. `EntityConfig` — Interfaz Extensible

Se extiende `WorkspaceConfig` para soportar todas las entidades configurables actuales y futuras:

```ts
// apps/server/src/core/config/entity-config.port.ts

export interface EntityConfig {
  // === Modelos ===
  defaultModel?: string;

  // === Tools ===
  toolOverrides?: {
    add?: string[];
    remove?: string[];
  };

  // === Permisos ===
  permissionOverrides?: Record<string, "allow" | "deny" | "ask">;

  // === Skills ===
  skills?: string[];

  // === Rules (extensión futura) ===
  rules?: string[];

  // === Workflows (extensión futura) ===
  workflows?: string[];

  // === Hooks (extensión futura) ===
  hooks?: Record<string, unknown>;

  // === Extensible: cualquier campo futuro ===
  [key: string]: unknown;
}
```

### 2. `CascadeConfigLoader` — Loader Genérico

Un loader que, dada una entidad, resuelve el workspace correspondiente, carga `.spaces/config.json`, y mergea con la configuración global:

```ts
// apps/server/src/core/config/cascade-config-loader.ts

export interface EntityRef {
  agentId?: string;
  projectId?: string;
  teamId?: string;
}

export class CascadeConfigLoader {
  constructor(
    private readonly loader: WorkspaceConfigPort,
    private readonly scopeResolver: ScopeConfigManager,
  ) {}

  async load(username: string, entity: EntityRef): Promise<EntityConfig> {
    const globalConfig = await this.loadGlobal(username);
    const entityConfig = await this.loadEntity(username, entity);
    return deepMerge(globalConfig, entityConfig);
  }

  private async loadGlobal(username: string): Promise<EntityConfig> {
    const workspaceDir = getWorkspaceDir(username);
    const config = await this.loader.load(workspaceDir);
    return config ?? {};
  }

  private async loadEntity(username: string, entity: EntityRef): Promise<EntityConfig> {
    const workspaceDir = this.resolveWorkspace(username, entity);
    if (!workspaceDir) return {};
    const config = await this.loader.load(workspaceDir);
    return config ?? {};
  }

  private resolveWorkspace(username: string, entity: EntityRef): string | null {
    // Misma prioridad que workspace-resolver.ts:202-213
    if (entity.teamId) return getTeamWorkspaceDir(username, entity.teamId);
    if (entity.projectId) return getProjectWorkspaceDir(username, entity.projectId);
    if (entity.agentId) {
      // Si el agente pertenece a un proyecto, usar el workspace del proyecto
      const membership = this.scopeResolver.getAgentMembership(username, entity.agentId);
      if (membership?.type === "project") {
        return getProjectWorkspaceDir(username, membership.id);
      }
      return getAgentWorkspaceDir(username, entity.agentId);
    }
    return null;
  }
}
```

### 3. `ConfigMerger` — Merge Profundo con Override

```ts
// apps/server/src/core/config/config-merger.ts

export function deepMerge(base: EntityConfig, override: EntityConfig): EntityConfig {
  const result: EntityConfig = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;

    const baseValue = result[key];

    // Arrays: concat y dedup (skills, rules, workflows, toolOverrides.add)
    if (Array.isArray(value)) {
      const baseArr = Array.isArray(baseValue) ? baseValue : [];
      result[key] = [...new Set([...baseArr, ...value])];
      continue;
    }

    // Records: merge profundo (permissionOverrides)
    if (isRecord(value)) {
      const baseRecord = isRecord(baseValue) ? baseValue : {};
      result[key] = { ...baseRecord, ...value };
      continue;
    }

    // Scalares: override directo (defaultModel)
    result[key] = value;
  }

  // toolOverrides.remove: restar del resultado merged
  if (override.toolOverrides?.remove && Array.isArray(result.toolOverrides?.add)) {
    const removeSet = new Set(override.toolOverrides.remove);
    result.toolOverrides = {
      ...result.toolOverrides,
      add: (result.toolOverrides.add as string[]).filter((t) => !removeSet.has(t)),
    };
  }

  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
```

### 4. Cascada de Herencia

El `CascadeConfigLoader` aplica la siguiente cascada:

```
1. Config Global        → {SPACES}/users/{username}/workspace/.spaces/config.json
2. Config de Entidad    → {workspace de la entidad}/.spaces/config.json
                           (team > project > agent, según membresía)
```

La entidad pisa cualquier campo de la configuración global. Los arrays se concatenan (no reemplazan). Los records se mergean en profundidad. Los scalares se reemplazan.

---

## Fases de Implementación

### Fase 1: Core del ConfigLoader (Día 1–2)

| #   | Tarea                                                                       | Archivo(s)                                | Tipo         |
| --- | --------------------------------------------------------------------------- | ----------------------------------------- | ------------ |
| 1.1 | Definir `EntityConfig` extendido en `core/config/entity-config.port.ts`     | Nuevo                                     | Contrato     |
| 1.2 | Implementar `deepMerge()` en `core/config/config-merger.ts`                 | Nuevo                                     | Utilidad     |
| 1.3 | Implementar `CascadeConfigLoader` en `core/config/cascade-config-loader.ts` | Nuevo                                     | Core         |
| 1.4 | Exportar barrel en `core/config/index.ts`                                   | Nuevo                                     | Organización |
| 1.5 | Tests unitarios de `deepMerge()` y `CascadeConfigLoader`                    | `__tests__/cascade-config-loader.test.ts` | Nuevo        | Verificación |

**Dependencias externas:** Ninguna. Solo usa `FileWorkspaceConfigLoader` (ya existe), `ScopeConfigManager` (ya existe), y `paths.ts` (ya existe).

**Validación:** `pnpm --filter server run typecheck` + tests unitarios.

### Fase 2: Cableado en los Runtimes (Día 2–4)

| #   | Tarea                                                                                                                      | Archivo                           | Cambio     |
| --- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ---------- |
| 2.1 | Inyectar `CascadeConfigLoader` en `resolveAgentContext()` y añadir `entityConfig` al `ResolvedAgentContext`                | `agent-context-resolver.ts`       | ~5 líneas  |
| 2.2 | Consumir `config.defaultModel` en `DefaultModelResolver.resolve()` como último fallback de la cascada (prioridad más baja) | `model-resolver.ts:9-15`          | ~5 líneas  |
| 2.3 | Consumir `config.toolOverrides` en `ToolActivationEngine.resolveActiveTools()` pasándolo como `toolOverrides` adicional    | `tool-activation-engine.ts:18-82` | ~5 líneas  |
| 2.4 | Consumir `config.permissionOverrides` en `PermissionEngine.evaluate()` como capa adicional entre static rules y ASK rules  | `permission-engine.ts:154-219`    | ~10 líneas |
| 2.5 | Consumir `config.skills` en `DefaultResourceLoader` añadiendo paths al `additionalSkillPaths`                              | `resource-loader.ts:90-106`       | ~5 líneas  |
| 2.6 | Pasar `entityConfig` desde `createAgentRuntime()` a todos los hooks y resolvers                                            | `agent-runtime.ts`                | ~5 líneas  |
| 2.7 | Tests de integración: verificar que el config de workspace pisa el comportamiento                                          | `__tests__/`                      | Nuevos     |

**Validación:** `pnpm build` + `pnpm --filter server run typecheck`.

### Fase 3: API REST (Día 4–5)

| #   | Tarea                                                                                               | Endpoint                   | Archivo |
| --- | --------------------------------------------------------------------------------------------------- | -------------------------- | ------- |
| 3.1 | `GET /api/config/:entityType/:entityId` — Leer config de una entidad (global, agent, project, team) | `routes/config.ts` (nuevo) |
| 3.2 | `PUT /api/config/:entityType/:entityId` — Escribir config de una entidad                            | `routes/config.ts`         |
| 3.3 | `GET /api/config/:entityType/:entityId/resolved` — Devuelve el config mergeado (global + entidad)   | `routes/config.ts`         |
| 3.4 | `GET /api/sessions/:id/config` — Devuelve el config resuelto para la sesión activa (conveniencia)   | `routes/sessions.ts`       |
| 3.5 | Montar `configRouter` en `apps/server/src/index.ts` bajo `/api/config`                              | `index.ts`                 |

**Schemas Zod necesarios en `packages/shared/src/schemas.ts`:**

- `EntityTypeSchema = z.enum(["global", "agent", "project", "team"])`
- `EntityConfigSchema` — validación del `EntityConfig`

### Fase 4: UI de Configuración por Entidad (Día 5–7)

| #   | Componente                                                                                           | Descripción                                                             |
| --- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 4.1 | `ConfigPanel` — Panel genérico de configuración por entidad (modelo, tools, skills, permisos)        | Reutiliza `ModelSelector`, `ToolsSelector`, `SkillsSelector` existentes |
| 4.2 | `AgentConfigTab` — Pestaña en el panel de detalle de agente                                          | Integrar en `AgentDetailPanel`                                          |
| 4.3 | `ProjectConfigSection` — Sección en el panel de proyecto                                             | Integrar en `ProjectFloorPanel`                                         |
| 4.4 | `GlobalConfigPage` — Página de configuración global                                                  | Nueva ruta en el sidebar admin                                          |
| 4.5 | Indicador visual de overrides — Badge que muestra cuándo una entidad tiene config que pisa la global | Componente compartido                                                   |

---

## Volumen Estimado

| Fase            | Archivos nuevos | Archivos modificados | Líneas estimadas |
| --------------- | --------------- | -------------------- | ---------------- |
| Fase 1 (Core)   | 3               | 0                    | ~150             |
| Fase 2 (Wiring) | 0               | 6                    | ~40              |
| Fase 3 (API)    | 1               | 2                    | ~120             |
| Fase 4 (UI)     | 2               | 4                    | ~300             |
| **Total**       | **6**           | **12**               | **~610**         |

---

## Verificación

- `pnpm build` — compila todos los workspaces sin errores
- `pnpm --filter server run typecheck` — TypeScript estricto sin `any`
- Tests unitarios del `deepMerge` y `CascadeConfigLoader`
- Tests de integración: config de workspace pisa comportamiento de modelo, tools, permisos

---

## Extensibilidad Futura

El diseño del `EntityConfig` con `[key: string]: unknown` y el `CascadeConfigLoader` genérico permiten añadir nuevas secciones de configuración sin modificar el core:

```ts
// Ejemplo: añadir "hooks" en el futuro
interface EntityConfig {
  // ... existente
  hooks?: {
    beforeToolCall?: string[]; // lista de hook IDs
    afterToolCall?: string[]; // lista de hook IDs
  };
}
```

El `deepMerge` maneja automáticamente cualquier campo nuevo. Solo hay que consumirlo en el runtime correspondiente.

---

## Riesgos y Mitigaciones

| Riesgo                                                                                                 | Mitigación                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El `deepMerge` de arrays puede causar duplicados si se recarga el config                               | Usar `Set` para dedup en arrays                                                                                                                                                                                                                             |
| `permissionOverrides` podría entrar en conflicto con reglas estáticas del `PermissionEngine`           | Las reglas estáticas (DENY crítico) siempre tienen prioridad sobre overrides de workspace                                                                                                                                                                   |
| La UI podría ser confusa si hay muchas capas de herencia                                               | Mostrar indicador visual de "N campos heredados de global, M sobreescritos"                                                                                                                                                                                 |
| ScopeConfigManager ya tiene su propio archivo de scope; ¿entra en conflicto con `.spaces/config.json`? | No. ScopeConfigManager gestiona membresía y asignación de tools a entidades. `.spaces/config.json` gestiona overrides de configuración. Son complementarios: scope dice "este agente es del proyecto X", config dice "en el proyecto X se usa el modelo Y". |
