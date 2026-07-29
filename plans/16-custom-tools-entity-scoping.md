# Plan 16 — Custom Tools Entity-Scoped: Add, Activate, Deactivate

## Objetivo

Que las custom tools tengan el mismo nivel de gestionabilidad por entidad que las skills y las built-in tools: poder **añadirlas**, **activarlas** y **desactivarlas** a nivel global, proyecto o agente individual, con UI correspondiente y actualización dinámica de sesiones activas.

---

## Diagnóstico — Estado Actual

### Lo que SÍ funciona

| Aspecto | Estado | Detalle |
|---|---|---|
| CRUD de custom tools | OK | `manage_custom_tools` tool: upsert, delete, toggle (`manage-custom-tools-tool.ts`) |
| Storage file-based | OK | `<userDir>/custom-tools/<name>.json` + `_index.json` (`storage.ts`) |
| ScopeConfigManager con tools por entidad | OK | `global.tools`, `projects[].tools`, `agentTools[agentId]` (`scope-config-manager.ts`) |
| API `PATCH /api/agents/scope/tools` | OK | Acepta `ToolScopeTarget` (global / project / agent) (`routes/agents.ts:153`) |
| Filtrado al bootstrap por scope | OK | `SessionToolFactory` resuelve `resolveToolsForAgent()` y filtra (`tool-factory.ts:157-165`) |
| Ejecución pipeline/ui | OK | `createCustomToolRuntime()` + `executePipeline()` (`runtime.ts`, `pipeline-engine.ts`) |
| UI de render de resultados | OK | `CustomToolBody.tsx` → `CustomUiRenderer.tsx` — 18 componentes |
| Broadcast WS en upsert/delete/toggle | OK | `manage_custom_tools` emite `entity-updated` con `entityType: "custom_tool"` |

### Lo que NO funciona (gaps)

| Gap | Impacto | Ubicación |
|---|---|---|
| **Scoping solo aditivo** | `resolveToolsForAgent()` hace unión pura de global + project + agent. Si una tool está en global, no se puede quitar de un agente específico. | `scope-config-manager.ts:290-313` |
| **No hay broadcast WS en cambio de scope** | Cuando se llama a `PATCH /api/agents/scope/tools`, las sesiones activas no se enteran del cambio. | `routes/agents.ts:162` |
| **No hay UI para asignar tools por entidad** | El endpoint de scope existe pero ningún componente del cliente lo consume. El usuario no puede ver ni modificar qué custom tools tiene cada entidad. | `apps/client` — inexistente |
| **No hay `GET /api/agents/scope/tools`** | El cliente no puede consultar la configuración actual de scope para mostrarla en UI. | `routes/agents.ts` |
| **Custom tools no se persisten en metadata de sesión** | A diferencia de las built-in tools (que van a `metadata.json` vía `sessionMetadataStore`), las custom tools no dejan rastro en la metadata de sesión. | `tool-activation-engine.ts:66` |
| **`ToolScopeTarget` no está en shared** | El tipo está definido localmente en `custom-tools/schemas.ts`, no en `packages/shared`. | `apps/server/src/core/custom-tools/schemas.ts:244-248` |
| **Scope config no soporta `agentTools` sustractivo** | `agentTools[agentId]` es `string[]` — solo adición. Para desactivar una tool heredada de global/project se necesita `{ add: string[], remove: string[] }`. | `scope-config-manager.ts:26` |

---

## Diseño Propuesto

### 1. Scoping sustractivo: `{ add, remove }` por agente

**Problema:** Hoy `agentTools[agentId]` es `string[]` con unión aditiva. Si `global.tools = ["tool_a"]` y un agente no debería tenerla, no hay forma de expresarlo.

**Solución:** Cambiar `agentTools` a un objeto con arrays de add y remove.

```typescript
// scope-config-manager.ts — ScopeConfig
export interface ScopeConfig {
  version: number;
  global: {
    agents: string[];
    tools: string[];
  };
  projects: Record<string, {
    agents: string[];
    tools: string[];
  }>;
  agentTools: Record<string, {
    add: string[];
    remove: string[];
  }>;
}
```

**Resolución final:**

```
resolved = (global.tools ∪ project.tools ∪ agentTools[id].add)
           \ agentTools[id].remove
```

El operador `\` (exclusión) solo es válido para agentes específicos. Para proyectos, solo se permite adición (no se quita lo que está en global).

### 2. Broadcast WS en cambio de scope

Cada vez que `setScopeTools()` persiste un cambio, notificar a las sesiones activas para que refresquen su tool registry.

```
setScopeTools() → persist → broadcastToUser("entity-updated", { entityType: "custom_tool_scope" })
```

Los consumidores del evento (cliente y sesiones activas) reaccionan refrescando.

### 3. API: `GET /api/agents/scope/tools`

Nuevo endpoint para que el cliente lea la configuración actual.

```
GET /api/agents/scope/tools?entityType=agent&entityId=agent_123

Response:
{
  "global": ["tool_a", "tool_b"],
  "project": ["tool_c"],
  "agent": { "add": ["tool_d"], "remove": ["tool_a"] },
  "resolved": ["tool_b", "tool_c", "tool_d"]
}
```

### 4. API: `GET /api/custom-tools` (extender si no existe)

Endpoint para listar todas las custom tools disponibles (nombre, label, enabled, pipeline/ui, dependencias) para que el UI muestre la lista completa al asignar.

### 5. UI: `EntityCustomToolsEditor`

Componente reutilizable inspirado en `EntitySkillsEditor` (Plan 15), integrado en los paneles de configuración existentes.

---

## Plan de Implementación

### Fase 1 — Backend: Tipos compartidos y scoping sustractivo

#### 1.1 Mover `ToolScopeTarget` a `packages/shared`

**Archivo:** `packages/shared/src/schemas.ts`

Mover el tipo y schema Zod desde `apps/server/src/core/custom-tools/schemas.ts`:

```typescript
export const ToolScopeTargetSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("global") }),
  z.object({ type: z.literal("project"), id: z.string() }),
  z.object({ type: z.literal("agent"), id: z.string() }),
]);

export type ToolScopeTarget = z.infer<typeof ToolScopeTargetSchema>;
```

Actualizar imports en `scope-config-manager.ts` y `routes/agents.ts`.

#### 1.2 Agregar tipos de respuesta de scope tools

**Archivo:** `packages/shared/src/schemas.ts`

```typescript
export const AgentToolsConfigSchema = z.object({
  add: z.array(z.string()),
  remove: z.array(z.string()),
});

export const EntityToolsScopeResponseSchema = z.object({
  global: z.array(z.string()),
  project: z.array(z.string()).optional(),
  agent: AgentToolsConfigSchema.optional(),
  resolved: z.array(z.string()),
});
```

#### 1.3 Cambiar `ScopeConfig.agentTools` a `{ add, remove }`

**Archivo:** `apps/server/src/core/scope/scope-config-manager.ts`

- Cambiar la interfaz `ScopeConfig.agentTools` de `Record<string, string[]>` a `Record<string, { add: string[]; remove: string[] }>`.
- Actualizar `ensureLoaded()` para valores por defecto.
- Actualizar `validate()` para limpiar entradas huérfanas (agentes eliminados o tools inexistentes).
- Migrar datos existentes: si `agentTools[id]` es un array (formato viejo), convertirlo a `{ add: array, remove: [] }`.

#### 1.4 Reescribir `resolveToolsForAgent()` con lógica sustractiva

**Archivo:** `apps/server/src/core/scope/scope-config-manager.ts:290-313`

```typescript
resolveToolsForAgent(username: string, agentId: string): string[] {
  this.ensureLoaded(username);
  const config = this.cache.get(username);
  if (!config) return [];

  const tools = new Set<string>(config.global.tools);

  const membership = this.getAgentMembership(username, agentId);
  if (membership?.type === "project") {
    const proj = config.projects[membership.id];
    proj?.tools?.forEach((t) => tools.add(t));
  }

  const agentConfig = config.agentTools[agentId];
  if (agentConfig) {
    agentConfig.add?.forEach((t) => tools.add(t));
    agentConfig.remove?.forEach((t) => tools.delete(t));
  }

  return Array.from(tools);
}
```

#### 1.5 Actualizar `setScopeTools()` para el nuevo formato

**Archivo:** `apps/server/src/core/scope/scope-config-manager.ts:352-369`

Para `target.type === "agent"`, aceptar `{ add: string[], remove: string[] }`. Para global y project, seguir usando `string[]`.

---

### Fase 2 — Backend: Broadcast y Metadata de Sesión

#### 2.1 Broadcast WS en cambio de scope

**Archivo:** `apps/server/src/routes/agents.ts:162`

Después de `setScopeTools()`, emitir broadcast:

```typescript
await scopeConfigManager.setScopeTools(username, target, tools);

const { broadcastToUser } = await import("../../ws/handler");
broadcastToUser(username, {
  type: "entity-updated",
  entityType: "custom_tool_scope",
  payload: { target },
});
```

#### 2.2 Persistir custom tool names en metadata de sesión

**Archivo:** `apps/server/src/core/session/tool-activation-engine.ts`

Asegurar que `resolveActiveTools()` incluye los nombres de custom tools en el array final de `activeTools`, para que `sessionMetadataStore.persistSessionTools()` los capture al persistir.

Esto ya ocurre parcialmente (línea 66: "always include enabled custom tools"), pero conviene explicitarlo en la lógica de `merged` para que quede trazable en `metadata.json`.

---

### Fase 3 — API: Endpoints nuevos/extendidos

#### 3.1 `GET /api/agents/scope/tools`

**Archivo:** `apps/server/src/routes/agents.ts`

Nuevo endpoint:

```
GET /api/agents/scope/tools?entityType=agent&entityId=agent_123
GET /api/agents/scope/tools?entityType=project&entityId=proj_456
GET /api/agents/scope/tools?entityType=global
```

Query params opcionales. Si no se pasan, devuelve la configuración global + lista de todas las entities configuradas.

Handler:
1. Cargar `scopeConfigManager.load(username)`.
2. Si `entityType=global`: devolver `global.tools`.
3. Si `entityType=project`: devolver `projects[id].tools` y `global.tools` (para que el UI sepa qué se hereda).
4. Si `entityType=agent`: devolver `global.tools`, project tools (si membership), `agentTools[id]`, y `resolved` (resultado de `resolveToolsForAgent`).

#### 3.2 `GET /api/custom-tools` (extender)

**Archivo:** `apps/server/src/routes/custom-tools.ts` (crear si no existe)

Endpoint para listar todas las custom tools del usuario:

```
GET /api/custom-tools

Response: CustomToolSummary[]
```

```typescript
interface CustomToolSummary {
  name: string;
  label?: string;
  description: string;
  enabled: boolean;
  executeType: "pipeline" | "ui";
  dependencies?: string[];
  createdAt?: string;
  updatedAt?: string;
}
```

Implementación: leer `customToolStorage.loadAll(username)` y mapear a summary.

---

### Fase 4 — UI: `EntityCustomToolsEditor`

#### 4.1 Hook `useEntityCustomTools`

**Archivo:** `apps/client/src/hooks/useEntityCustomTools.ts`

```typescript
function useEntityCustomTools(entityType: "global" | "project" | "agent", entityId?: string) {
  // GET /api/custom-tools → availableTools
  // GET /api/agents/scope/tools?entityType=X&entityId=Y → scopeConfig
  // PATCH /api/agents/scope/tools → saveScopeTools
  return { availableTools, scopeConfig, resolvedTools, saveScopeTools, isLoading };
}
```

#### 4.2 Componente `EntityCustomToolsEditor`

**Archivo:** `apps/client/src/components/settings/EntityCustomToolsEditor.tsx`

Componente reutilizable (inspirado en `EntitySkillsEditor` del Plan 15):

- **Lista de custom tools** con switches toggle.
- **Badge de herencia**: si una tool viene de global/project y estás viendo un agente, mostrarlo con tooltip. Si el nivel actual es agent, permitir `remove` (toggle OFF la agrega a `remove`).
- **Para global/project**: toggle simple (add/remove del array).
- **Para agent**: lógica dual — toggle ON agrega a `add`, toggle OFF de una tool heredada agrega a `remove`, toggle OFF de una tool propia la saca de `add`.
- **Indicador de dirty state** con botón Save.

#### 4.3 Integrar en paneles existentes

| Panel | Dónde insertarlo | Archivo |
|---|---|---|
| Global Settings | Nueva sección en `GeneralTab` o tab dedicado "Custom Tools" | `apps/client/src/pages/settings/` |
| Agent Settings | Modal de agente (después de Skills) | `apps/client/src/pages/agents/` |
| Project Settings | `ProjectSettingsModal` | `apps/client/src/pages/projects/` |
| Team Settings | `TeamDetailPage` (si aplica para tools) | `apps/client/src/pages/teams/` |

---

### Fase 5 — Verificación y Cierre

#### 5.1 Typecheck y build

```bash
pnpm --filter server run typecheck
pnpm --filter client run typecheck
pnpm build
```

#### 5.2 Pruebas manuales

- Crear una custom tool vía `manage_custom_tools` en una sesión de chat.
- Asignarla a un agente específico desde el UI del agente.
- Verificar que una sesión de ese agente la tiene disponible.
- Desactivarla para ese agente (remove) y verificar que desaparece de la sesión.
- Verificar que el broadcast WS actualiza sesiones activas al cambiar scope.

#### 5.3 Pruebas unitarias

- `scope-config-manager.test.ts`: `resolveToolsForAgent()` con combinaciones add/remove.
- `tool-activation-engine.test.ts`: custom tools en active tools final.
- Migración de formato viejo de `agentTools` al nuevo.

---

## Orden de Ejecución

| # | Fase | Esfuerzo | Depende de |
|---|---|---|---|
| 1 | **Fase 1** — Tipos compartidos + scoping sustractivo | Mediano | — |
| 2 | **Fase 2** — Broadcast + metadata | Chico | Fase 1 |
| 3 | **Fase 3** — Endpoints API | Mediano | Fase 1 |
| 4 | **Fase 4** — UI | Grande | Fase 3 |
| 5 | **Fase 5** — Verificación | Chico | Fase 4 |

---

## Archivos Afectados

### Backend

| Archivo | Cambio |
|---|---|
| `packages/shared/src/schemas.ts` | Agregar `ToolScopeTargetSchema`, `EntityToolsScopeResponseSchema`, `AgentToolsConfigSchema` |
| `apps/server/src/core/scope/scope-config-manager.ts` | Cambiar `agentTools` a `{ add, remove }`, reescribir `resolveToolsForAgent()`, migración de formato viejo |
| `apps/server/src/core/custom-tools/schemas.ts` | Remover `ToolScopeTarget` local, importar de shared |
| `apps/server/src/routes/agents.ts` | Agregar `GET /scope/tools`, broadcast WS en `PATCH /scope/tools`, actualizar schema de `PATCH` |
| `apps/server/src/core/session/tool-activation-engine.ts` | Explicitar inclusión de custom tool names en active tools |
| `apps/server/src/routes/custom-tools.ts` | Nuevo archivo: `GET /api/custom-tools` |

### Cliente

| Archivo | Cambio |
|---|---|
| `apps/client/src/hooks/useEntityCustomTools.ts` | Nuevo hook |
| `apps/client/src/components/settings/EntityCustomToolsEditor.tsx` | Nuevo componente |
| `apps/client/src/pages/settings/GeneralTab.tsx` | Integrar editor |
| `apps/client/src/pages/agents/` | Integrar en modal de agente |
| `apps/client/src/pages/projects/` | Integrar en modal de proyecto |

### Tests

| Archivo | Cambio |
|---|---|
| `apps/server/src/__tests__/scope-config-manager.test.ts` | Nuevo: `resolveToolsForAgent()` add/remove |
| `apps/server/src/__tests__/custom-tools-pipeline.test.ts` | Extender: integración con scope |

---

## Criterio de Cierre

- [ ] `ToolScopeTarget` vive en `packages/shared` y se importa desde ahí en server y client.
- [ ] `ScopeConfig.agentTools` usa `{ add: string[], remove: string[] }` y migra datos viejos automáticamente.
- [ ] `resolveToolsForAgent()` aplica unión con exclusión: `(global ∪ project ∪ add) \ remove`.
- [ ] `PATCH /api/agents/scope/tools` acepta el nuevo formato y emite broadcast WS.
- [ ] `GET /api/agents/scope/tools` devuelve la configuración completa con herencia resuelta.
- [ ] `GET /api/custom-tools` lista todas las custom tools del usuario con metadata.
- [ ] `EntityCustomToolsEditor` permite ver, activar y desactivar custom tools por entidad.
- [ ] El editor está integrado en Global Settings, Agent Settings, Project Settings.
- [ ] `pnpm build` y typechecks pasan sin errores.
- [ ] Pruebas unitarias cubren los nuevos paths de resolución de scope.
