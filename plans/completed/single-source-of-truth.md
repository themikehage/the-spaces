# Plan: Single Source of Truth — Frontend Anti-patterns

**Objetivo:** Eliminar toda definición duplicada de herramientas, tipos de negocio y reglas de dominio en `apps/client/`. Toda fuente de verdad debe residir en `packages/shared/` o provenir del backend vía API.

**Reglas aplicables:** `.agents/rules/backend.rules.md` (#7 Tipos Compartidos en shared), `.agents/rules/frontend.rules.md` (#2 API Calls vía Service Modules).

---

## Fase 1: Shared Package — Extender el SSOT

El contrato `packages/shared` debe exportar todo lo que el cliente necesita sin que este tenga que redefinir nada.

### 1.1 — Agregar `ToolDisplayMeta` al catálogo

**Archivo:** `packages/shared/src/tools-catalog.ts`

Nuevo tipo y mapa constante:

```ts
export interface ToolDisplayMeta {
  label: string;
  description: string;
  displayName: string;
  gateKey?: string;
  colorClass?: string;
}

export const TOOL_DISPLAY_META: Record<ToolName, ToolDisplayMeta> = { ... };
```

Absorbe las descripciones de `ALL_TOOLS` del cliente y la metadata visual de `TOOL_META` (`tool-row-utils.tsx`). La UI ya no necesita definir nada.

**Verificación:** `pnpm --filter shared run typecheck`

### 1.2 — Agregar `ToolPreset` y `TOOL_PRESETS`

**Archivo:** `packages/shared/src/tools-catalog.ts`

```ts
export type ToolPreset = "autonomous" | "standard" | "readonly";

export const TOOL_PRESETS: Record<ToolPreset, ToolName[]> = {
  autonomous: AVAILABLE_TOOLS.filter(...),
  standard: ["read", "write", "edit", "bash", "grep", "find", "ls", "task", "memory", "request_approval", "ask_question", "render_html"],
  readonly: ["read", "grep", "find", "ls"],
};
```

Elimina la lógica `applyPreset` duplicada en `ToolsSelector.tsx` y `ToolsPopover.tsx`.

**Verificación:** `pnpm --filter shared run typecheck`

### 1.3 — Auditar `AVAILABLE_TOOLS` contra el ToolRegistry del back

**Archivo:** `packages/shared/src/tools-catalog.ts`

Objetivo: verificar que `AVAILABLE_TOOLS` contiene exactamente las herramientas registradas en `apps/server/src/core/tools/`. Si `spawn_subagent` y `delegate_task` existen realmente como tools independientes (no solo como delegaciones), agregarlas. Caso contrario, eliminarlas del `ToolDisplayMeta`. La lista en shared es **la** fuente de verdad; no el cliente ni el back por separado.

**Verificación:** `pnpm --filter server run typecheck`

### 1.4 — Asegurar exports de tipos de dominio

**Archivo:** `packages/shared/src/schemas.ts`

Verificar que estos tipos ya son exportados y usables desde el cliente:

| Tipo                | Schema fuente                        | ¿Exportado?           |
| ------------------- | ------------------------------------ | --------------------- |
| `SessionStatus`     | `SessionStatusSchema`                | ✅                    |
| `TeamRole`          | `TeamRoleSchema`                     | ✅                    |
| `ProjectStatus`     | `ProjectStatusSchema`                | ✅                    |
| `McpTransportType`  | `McpTransportTypeSchema`             | ✅                    |
| `PendingDelegation` | `PendingDelegationSchema`            | ✅                    |
| `McpConfig`         | `McpConfigSchema`                    | ✅                    |
| `ExecutionMode`     | (derivar de `ToolPermissionsSchema`) | ⚠️ Agregar type alias |

Agregar si falta:

```ts
export type ExecutionMode = z.infer<typeof ToolPermissionsSchema>["executionMode"];
```

**Verificación:** `pnpm --filter shared run typecheck`

### 1.5 — Agregar `GATE_ENV_VARS`

**Archivo:** `packages/shared/src/tools-catalog.ts`

```ts
export const GATE_ENV_VARS: Partial<Record<ToolName, string>> = {
  exa_search: "EXA_API_KEY",
};
```

Elimina el string mágico `"EXA_API_KEY"` del cliente.

**Verificación:** `pnpm --filter shared run typecheck`

---

## Fase 2: Cliente — Eliminar Duplicados de Herramientas

Toda definición de tool en `apps/client/` se importa de `@spaces/shared`.

### 2.1 — Reemplazar `ALL_TOOLS` por shared

**Archivos:** `apps/client/src/components/chat/ToolsSelector.tsx`, `apps/client/src/components/chat/ToolsPopover.tsx`

- Eliminar `ToolDefinition` interface y `ALL_TOOLS` array (~70 líneas).
- Importar `AVAILABLE_TOOLS`, `TOOL_DISPLAY_META` de `@spaces/shared`.
- Donde se usaba `ALL_TOOLS.filter(...).map(t => t.id)`, usar `AVAILABLE_TOOLS.filter(...)` directamente.
- Donde se usaba `t.desc` o `t.name`, usar `TOOL_DISPLAY_META[t].description` / `TOOL_DISPLAY_META[t].displayName`.

### 2.2 — Reemplazar `isCustomToolCheck` por `isKnownTool`

**Archivo:** `apps/client/src/components/chat/tools/tool-row-utils.tsx`

- Eliminar `isCustomToolCheck` (~35 líneas con lista de 30+ tools).
- Importar `isKnownTool` de `@spaces/shared`.
- La lógica se invierte: `!isKnownTool(name) && !name.startsWith("mcp_")`.

### 2.3 — Migrar `TOOL_META` a shared

**Archivo:** `apps/client/src/components/chat/tools/tool-row-utils.tsx`

- Eliminar `TOOL_META` objeto (~135 líneas).
- Importar `TOOL_DISPLAY_META` de `@spaces/shared`.
- `getToolLabel()` usa `TOOL_DISPLAY_META[name]?.label`.
- `getArgSummary()` y `getResultSummary()` no se tocan (son lógica de presentación, no metadatos duplicados).
- Ajustar íconos: los iconos son React components (no pueden ir en shared). Opciones:
  - **A:** Mapa local de `Record<ToolName, ReactNode>` solo con íconos, el resto viene de shared. Recomendado.
  - **B:** Mover íconos a shared como strings (SVG paths). Over-engineering para este caso.

### 2.4 — Unificar `applyPreset`

**Archivos:** `apps/client/src/components/chat/ToolsSelector.tsx`, `apps/client/src/components/chat/ToolsPopover.tsx`

- Eliminar las dos copias de `applyPreset` (~25 líneas cada una).
- Importar `TOOL_PRESETS` de `@spaces/shared`.
- `applyPreset` se reduce a: `onChange(TOOL_PRESETS[preset], preset)`.
- El filtro de gate keys en modo autonomous se mueve a shared o se mantiene como única lógica en el cliente.

### 2.5 — Usar `GATE_ENV_VARS`

**Archivos:** `apps/client/src/components/chat/ToolsSelector.tsx`, `apps/client/src/hooks/useGeneralSettingsForm.ts`

- Reemplazar `"EXA_API_KEY"` hardcodeado por `GATE_ENV_VARS.exa_search`.
- En `ToolsSelector.tsx:70`: `gateKey: GATE_ENV_VARS.exa_search`.
- En `useGeneralSettingsForm.ts:132`: `exaKeyExists = envList.some(e => e.key === GATE_ENV_VARS.exa_search)`.

---

## Fase 3: Cliente — Eliminar Duplicados de Tipos de Negocio

Cero tipos de dominio definidos en el cliente. Todo se importa de `@spaces/shared`.

### 3.1 — Importar `ExecutionMode` desde shared

**Archivos:**

- `apps/client/src/components/chat/ToolsSelector.tsx`
- `apps/client/src/components/chat/ToolsPopover.tsx`
- `apps/client/src/components/chat/ChatInput.tsx`
- `apps/client/src/components/chat/InputToolbar.tsx`
- `apps/client/src/components/chat/WelcomeChatInput.tsx`

Reemplazar cada ocurrencia inline de `"readonly" | "standard" | "autonomous"` por `ExecutionMode` importado de `@spaces/shared`.

### 3.2 — Importar `SessionStatus` desde shared

**Archivo:** `apps/client/src/lib/api/sessions.service.ts:4`

Eliminar `export type SessionStatus = "active" | "streaming" | "task-running" | "sleeping"`. Importar de shared.

### 3.3 — Importar `PendingDelegation` desde shared

**Archivo:** `apps/client/src/components/chat/FloatingDelegations.tsx:6-15`

Eliminar interface local. Importar `PendingDelegation` de shared.

### 3.4 — Importar `McpConfig` desde shared

**Archivo:** `apps/client/src/components/settings/McpTab.tsx:7-16`

Eliminar interfaces locales `McpServerConfig` y `McpConfig`. Importar de shared.

### 3.5 — Importar `McpTransportType` desde shared

**Archivo:** `apps/client/src/components/mcp/MCPCustomForm.tsx:24`

Reemplazar `useState<"stdio" | "http">` por `useState<McpTransportType>`.

### 3.6 — Unificar roles de equipo

**Archivos:**

- `apps/client/src/lib/dropdown-options.ts`
- `apps/client/src/components/teams/AgentDetailPanel.tsx`
- `apps/client/src/components/teams/OrgFlowCanvas.tsx`

- **BUG:** Eliminar `"senior"` de `ROLE_OPTIONS` en `dropdown-options.ts`. No es un rol válido según `TeamRoleSchema`.
- Definir **un solo array** (ej. `TEAM_ROLE_OPTIONS`) derivado de `TeamRole` en un solo lugar (dropdown-options.ts) o importar `TeamRole` y construir las opciones localmente.
- `LEVEL_ORDER` en `OrgFlowCanvas.tsx` puede derivarse de `TeamRole` o mantenerse como orden de UI (no es regla de negocio, es presentación).

### 3.7 — Importar `ProjectStatus` desde shared

**Archivo:** `apps/client/src/components/projects/ProjectFloorPanel.tsx:186`

Reemplazar `["planning", "running", "review", "done"] as const` por `ProjectStatus` de shared y derivar el array si es necesario.

### 3.8 — Arreglar validación de env vars (BUG)

**Archivo:** `apps/client/src/components/settings/EnvVarsTab.tsx:38-47`

El regex del cliente (`/^[A-Z_][A-Z0-9_]*$/`) difiere del shared (`/^[a-zA-Z_][a-zA-Z0-9_]*$/`). Además se aplica `.toUpperCase()` antes de validar, lo que falsea el resultado.

**Fix:**

- No aplicar `.toUpperCase()` antes de validar.
- Usar el mismo regex que `SetEnvVarSchema`.
- Si se quiere normalizar a uppercase, hacerlo después de la validación y antes de enviar al servidor.
- Alternativa más robusta: el servidor ya valida con Zod — el cliente solo advierte, no bloquea.

---

## Fase 4: Verificación

Ejecutar en orden:

| Paso | Comando                              | Esperado              |
| ---- | ------------------------------------ | --------------------- |
| 4.1  | `pnpm --filter shared run typecheck` | Cero errores          |
| 4.2  | `pnpm --filter server run typecheck` | Cero errores          |
| 4.3  | `pnpm --filter client run typecheck` | Cero errores          |
| 4.4  | `pnpm build`                         | Build exitoso         |
| 4.5  | `pnpm dev` + smoke test              | Funcionalidad intacta |

### Smoke test checklist

- [ ] Crear sesión nueva → ToolsSelector muestra todas las tools
- [ ] Presets (autonomous, standard, readonly) funcionan correctamente
- [ ] Exa Search se oculta si no hay `EXA_API_KEY`
- [ ] MCP Custom Form acepta tipos de transporte
- [ ] Settings → Env Vars valida correctamente
- [ ] Team roles muestra solo lead, member, observer
- [ ] Project Floor muestra estados correctos
- [ ] Chat envía mensajes y recibe respuestas con Streaming
- [ ] Delegation panel muestra delegaciones correctamente
- [ ] Tool rows renderizan con íconos y colores correctos

---

## Orden de ejecución

```
Fase 1 (shared) → Fase 2 (tools) → Fase 3 (types) → Fase 4 (verify)
                      ↘                ↗
                  pueden solaparse parcialmente
```

- **Fase 1 es bloqueante.** Shared debe exportar todo antes de que el cliente importe.
- **Fases 2 y 3** tocan archivos distintos en su mayoría. Pueden ejecutarse en paralelo si se trabaja con branches separados.
- **Fase 4** es el gate final.
