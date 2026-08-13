# Plan 37 — Invocar tools y custom tools con `/` (slash commands), como las skills

**Estado:** ✅ Completado

## Objetivo

Permitir que el usuario invoque **tools del sistema** y **custom tools** escribiendo `/nombre` en el input del chat, con el mismo mecanismo que hoy usa para las skills: autocomplete en el frontend al escribir `/` + resolución server-side al enviar el mensaje.

## Contexto — cómo funcionan las skills hoy

El trigger `/` ya existe para skills y tiene dos mitades:

1. **Frontend** — `apps/client/src/hooks/useChatInputForm.ts`
   - `checkAutocomplete` detecta `/(\/\S*)$/` y setea `autocompleteMode = "skill"` (líneas 132-154).
   - `filteredItems` (127-130) filtra el array `skills` (`SkillInfo[]`).
   - `insertSkillReference` (176-199) reemplaza el token parcial por `/nombre `.
   - `AutocompletePopover.tsx` renderiza `/nombre` + description (modo `"skill"`, líneas 70-78).

2. **Server** — `apps/server/src/core/session/agent-session.ts`, método `prompt()` (líneas 500-519)
   - Extrae tokens `/nombre` con regex `/(?:^|\s)\/([a-zA-Z0-9_-]+)/g`.
   - Matchea contra `resourceLoader.getSkills()`.
   - Inyecta el contenido de cada skill matcheada en `activeSkillPrompts`, que se suma al system prompt del turno.

Los tools NO pasan por este flujo: se activan/desactivan solo desde el `ToolsPopover` (toggle de `activeTools`).

## Diseño

### Namespace unificado `/nombre`

Skills y tools comparten el trigger `/`. La resolución es server-side en dos pasos:

1. Primero se matchea contra skills (comportamiento actual, sin cambios).
2. Los tokens `/nombre` que **no** matcheen una skill se matchean contra el universo de tools disponibles en la sesión (`toolRegistry.getAllTools()`: system + custom).

Así el cliente no necesita distinguir semánticamente skill vs tool para insertar el token; ambos son `/nombre `. Solo necesita el autocomplete para sugerirlos.

### Semántica de "invocar" un tool

Un `/tool` en el mensaje significa **activar ese tool para el turno** y **sugerirle al modelo usarlo** (análogo a cómo una skill inyecta instrucciones). Es:

- **Per-turn, NO persistente**: no muta la config de tools guardada de la sesión (`POST /api/sessions/:id/tools`). El usuario no quiso "dejar encendido" un tool; solo lo pide para esta tarea.
- **Aditivo**: solo agrega el tool al set activo del turno; nunca quita ni reemplaza los ya activos.

> Alternativa descartada (anotada por si se pide después): **ejecución directa** del tool (bypassear el modelo y correr `execute()` de inmediato). Es otra semántica ("comando directo" vs "habilidad disponible") y se diseña aparte si se quiere.

## Cambios

### 1. Server — resolución de `/tool` en `prompt()`

`apps/server/src/core/session/agent-session.ts` (método `prompt`, bloque de skill matching ~500-519):

1. Mantener el matching de skills actual.
2. Recolectar los nombres que **no** matchearon skill y matchearlos contra `this.toolRegistry.getAllTools()` (name insensible a mayúsculas).
3. Para los matcheados, activarlos en el turno:
   - `const current = new Set(this.getActiveToolNames().map(n => n.toLowerCase()))`.
   - Calcular `toAdd` (matcheados no ya activos).
   - Si `toAdd.length > 0`, activar vía `setActiveToolsByName([...current, ...toAdd])` — que ya actualiza `agent.state.tools`.
4. Inyectar una directiva en el system prompt (junto a `activeSkillPrompts`):
   ```
   === Explicitly Requested Tools ===
   The user explicitly referenced: <tool1>, <tool2>. These are active this turn; prefer using them when relevant.
   ```
   Guardarla como campo de instancia (p. ej. `activeToolPrompts: string[]`) para que `prepareNextTurn` (387-416) y `continue()` la incluyan de forma consistente con skills.

Nota: `setActiveToolsByName` (428-438) y `getActiveToolNames` (440-442) ya existen; el plan 32 advierte de bugs de merge en `_refreshToolRegistry`/`session.handler.ts` — al activar per-turn con `setActiveToolsByName` no se toca ese path de reemplazo.

### 2. Frontend — catálogo de tools para el autocomplete

`apps/client/src/hooks/useChatInputForm.ts`:

- Añadir un estado `slashTools` (o derivarlo) con forma `{ id, name, label?, description, kind: "tool" }`, construido de:
  - **System tools**: `AVAILABLE_TOOLS` + `TOOL_DISPLAY_META` de `packages/shared` (ya importados en `ToolsPopover.tsx:7-15`). Mapeo: `id/name = toolId`, `description = TOOL_DISPLAY_META[toolId].description`, `label = displayName`.
  - **Custom tools**: hook `useCustomToolsList()` (igual que `ToolsPopover.tsx:51`), que devuelve `{ tools: [{ name, label, description }] }`. Mapeo a `kind: "tool"` con `id/name = ct.name`.
- Renombrar el modo de autocomplete `"skill"` → `"slash"` (línea 99) y unificar el filtrado:
  - `filteredItems` (127-130): en modo `"slash"`, concatenar `skills` (con `kind: "skill"`) + `slashTools`, y filtrar por `autocompleteSearch` sobre `name`.
- `checkAutocomplete` (145-149): setear `autocompleteMode = "slash"` al detectar `/(\/\S*)$/`.
- `insertSkillReference` (176-199): renombrar a `insertSlashReference` (el insert es idéntico `/nombre ` para ambos casos); el switch de teclado (282-290) pasa a llamarlo sin distinguir skill/tool.

### 3. Frontend — badge en el popover

`apps/client/src/components/chat/AutocompletePopover.tsx`:

- `AutocompleteItem` (7-11): añadir `kind?: "skill" | "tool"`.
- `AutocompletePopoverProps.mode` (14): `"slash" | "mention"`.
- Header (43): `mode === "mention" ? mentionHeader : slashHeader` (nuevo literal).
- Item (70-78): en modo `"slash"` mostrar `/nombre` + description igual que hoy, con un badge sutil de tipo (`Skill` / `Tool`) para distinguirlos visualmente.

### 4. Literales

- `apps/client/src/components/chat/ChatInput.literals.ts` (+ `WelcomeChatInput.literals.ts` si se usa el header compartido): añadir `slashHeader`, `toolBadge`, `skillBadge`.

## Verificación

- `pnpm --filter server run typecheck` + `pnpm --filter client run typecheck` (o `pnpm build`).
- Escribir `/read` en un mensaje → el autocomplete sugiere el tool `read` y la skill si existiera.
- Enviar un mensaje con `/manage_custom_tools` (o una custom tool registrada) → en el turno el agente tiene ese tool activo (visible en `getActiveToolNames()` / en el `ToolsPopover` del turno) y lo usa cuando corresponde.
- Enviar `/skill_que_existe` → sigue inyectando instrucciones como antes (regresión de skills).
- Activar un tool vía `/` y abrir una sesión nueva → el tool NO queda persistido (no cambia `POST /api/sessions/:id/tools`).

## Archivos implicados

- `apps/server/src/core/session/agent-session.ts` — matching de `/tool` + activación per-turn + directiva (`prompt`, `prepareNextTurn`, `continue`).
- `apps/client/src/hooks/useChatInputForm.ts` — catálogo de tools, modo `"slash"`, `insertSlashReference`.
- `apps/client/src/components/chat/AutocompletePopover.tsx` — `kind` badge + modo `"slash"`.
- `apps/client/src/components/chat/ChatInput.literals.ts` — literales nuevos.
- (referencia, sin cambios) `packages/shared/src/tools-catalog.ts` — `AVAILABLE_TOOLS`, `TOOL_DISPLAY_META`.
- (referencia, sin cambios) `apps/client/src/hooks/useCustomToolsList.ts` — catálogo de custom tools.
