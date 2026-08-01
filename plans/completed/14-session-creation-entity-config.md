# Plan 14 — Session Creation: Entity Config & Welcome Input Selectors

## Objetivo

Que al crear una nueva sesión:

1. Se respete la configuración guardada en `.spaces/config.json` de la entidad correspondiente (agente/proyecto/equipo/global), especialmente **skills**, **tools** y **rules**.
2. El `WelcomeChatInput` (pantalla de bienvenida previa a la creación de sesión) incluya selectores de **tools** y **skills**, pre-poblados con los valores del cascade config de la entidad.

---

## Diagnóstico — Estado Actual

### Lo que SÍ funciona

| Aspecto                                       | Estado | Detalle                                                                  |
| --------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| `defaultModel` de entity config               | OK     | `agent-runtime.ts:90` usa `context.entityConfig.defaultModel`            |
| `toolOverrides` (add/remove) de entity config | OK     | `session-bootstrap.ts:90-99` mergea `context.entityConfig.toolOverrides` |
| Cascade config loader                         | OK     | `cascadeConfigLoader.load()` resuelve `global → entity` correctamente    |
| Persistencia de tools a `config.json`         | OK     | `POST /:id/tools` escribe a `.spaces/config.json`                        |

### Lo que NO funciona (gaps)

| Gap                                                           | Impacto                                                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `skills` de entity config se ignora en sesiones nuevas        | Si un agente tiene skills configuradas en su `config.json`, las sesiones nuevas no las cargan automáticamente |
| `rules` y `workflows` de entity config se ignoran             | Configurados en `EntityConfig` pero no se inyectan en el prompt ni en la sesión                               |
| `WelcomeChatInput` no tiene selectores de tools/skills        | El usuario no puede elegir qué tools o skills activar antes de crear la sesión                                |
| No hay endpoint para resolver entity config sin sesión previa | El cliente no puede saber qué tools/skills tiene configurados una entidad ANTES de crear la sesión            |

---

## Plan de Implementación

### Fase 1 — Server: Skills y Rules del entity config en la sesión

#### 1.1 Skills desde entity config → session skill paths

**Archivo:** `apps/server/src/core/session/agent-context-resolver.ts`

Agregar las skills del `entityConfig` a los `skillPaths` resueltos:

```typescript
// Después de `entityConfig = await cascadeConfigLoader.load(...)`
const entityConfigSkills = entityConfig.skills || [];
if (entityConfigSkills.length > 0) {
  for (const sk of entityConfigSkills) {
    const candidate = resolve(workspaceDir, ".pi", "skills", sk);
    if (existsSync(candidate) && !skillPaths.includes(candidate)) {
      skillPaths.push(candidate);
    }
  }
}
```

**Nota:** La lógica de skill paths ya existe para `agentSkills` en `agent-context-resolver.ts:88-95`. Se extiende para incluir también las del entity config.

#### 1.2 Rules y Workflows desde entity config

**Archivo:** `apps/server/src/core/session/agent-context-resolver.ts`

Exponer `entityConfig.rules` y `entityConfig.workflows` en el `ResolvedAgentContext` (ya está expuesto `entityConfig` completo, así que alcanza con que `SessionPromptBuilder` los consuma).

Verificar que `SessionPromptBuilder` inyecta `entityConfig.rules` en el system prompt cuando están presentes.

#### 1.3 Aceptar tools/skills en la creación de sesión

**Archivo:** `packages/shared/src/schemas.ts` — `CreateSessionSchema`

Extender el schema para aceptar `tools` y `skills` iniciales:

```typescript
export const CreateSessionSchema = z.object({
  name: z.string().min(1),
  projectId: z.string().optional(),
  agentId: z.string().optional(),
  teamId: z.string().optional(),
  tools: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  executionMode: z.enum(["readonly", "standard", "autonomous"]).optional(),
});
```

**Archivo:** `apps/server/src/core/session/create-user-session.ts`

- Aceptar `tools`, `skills`, `executionMode` en `CreateUserSessionInput`
- Persistir `tools` al `sessionMetadataStore` inmediatamente (no esperar a que el usuario vaya al ChatInput)
- Guardar `skills` en metadata para que el skill loader las active
- Pasar `toolOverrides.add` al `bootstrapAgentSession` basado en `tools` iniciales

**Archivo:** `apps/server/src/routes/sessions/session-crud.ts`

Pasar `tools`, `skills`, `executionMode` del body validado a `createUserSession()`.

---

### Fase 2 — Client: WelcomeChatInput con selectores de tools y skills

#### 2.1 Cargar entity config antes de crear sesión

**Archivo:** `apps/client/src/components/chat/ChatArea.tsx`

En el estado sin sesión (`!sessionId`), cargar la config resuelta de la entidad actual:

```typescript
// Nuevo hook o lógica en ChatArea
const { resolvedConfig } = useEntityConfig(
  activeTeam ? "team" : activeAgent ? "agent" : activeProjectName ? "project" : "global",
  activeTeam?.id || activeAgent?.id || activeProjectName || "global",
);
```

**Alternativa:** Usar el endpoint ya existente `GET /api/config/:entityType/:entityId/resolved`.

#### 2.2 Agregar selectores de tools y skills al WelcomeChatInput

**Archivo:** `apps/client/src/components/chat/WelcomeChatInput.tsx`

Agregar nuevos props y UI:

```typescript
interface Props {
  // ... existentes
  activeTools?: string[];
  onToolsChange?: (tools: string[], executionMode?: string) => void;
  executionMode?: "readonly" | "standard" | "autonomous";
  availableSkills?: Array<{ name: string }>;
  activeSkills?: string[];
  onSkillsChange?: (skills: string[]) => void;
}
```

**UI a agregar en el toolbar inferior** (entre el model selector y el botón de enviar):

- **Tools Popover/Selector** — un botón `Tools` que abre un popover compacto con:
  - Presets: Autónomo / Estándar / Solo Lectura
  - Checkboxes para tools individuales (solo filesystem + comunicación)
  - Badge con conteo de tools activas

- **Skills Popover/Selector** — un botón `Skills` que abre un popover con:
  - Lista de skills disponibles para la entidad
  - Toggle on/off por skill
  - Badge con conteo de skills activas

#### 2.3 Pre-poblar selectores con entity config

- Al montar `WelcomeChatInput`, usar `useEntityConfig` o `apiFetch` para obtener resolved config
- Pre-poblar `activeTools` con `entityConfig.toolOverrides?.add || []`
- Pre-poblar `activeSkills` con `entityConfig.skills || []`
- Pre-poblar `executionMode` con `entityConfig.executionMode`

---

### Fase 3 — Integration: Propagar selecciones a la creación de sesión

#### 3.1 Pasar tools/skills en el body de creación

**Archivo:** `apps/client/src/lib/session-utils.ts`

Extender `buildCreateSessionBody` para aceptar tools y skills:

```typescript
export function buildCreateSessionBody(
  sessionName: string,
  context: SessionContext,
  options?: { tools?: string[]; skills?: string[]; executionMode?: string }
): CreateSessionBody { ... }
```

#### 3.2 Modificar `createSessionAndSend`

**Archivo:** `apps/client/src/components/chat/ChatArea.tsx`

- Capturar `activeTools`, `activeSkills`, `executionMode` del estado del WelcomeChatInput
- Pasarlos a `buildCreateSessionBody`
- Incluirlos en el body del `POST /api/sessions`

#### 3.3 Aplicar tools/skills en session bootstrap

**Archivo:** `apps/server/src/core/session/create-user-session.ts`

- Si se reciben `tools` en la creación, persistirlos en `sessionMetadataStore.persistSessionTools()`
- Si se reciben `skills`, guardarlas en metadata (`sessionMetadataStore.saveSkillSelection()` o similar)
- Pasar `toolOverrides` al bootstrap para que `resolveActiveTools` las use

---

### Fase 4 — Verificación y edge cases

#### 4.1 Edge cases a considerar

| Caso                                                            | Comportamiento esperado                                           |
| --------------------------------------------------------------- | ----------------------------------------------------------------- |
| Entidad sin `config.json`                                       | Selectores arrancan con defaults (Standard tools, sin skills)     |
| Entidad con `config.json` parcial (solo skills, sin tools)      | Tools = default Standard, Skills = las del config                 |
| Usuario cambia tools/skills en WelcomeInput y luego crea sesión | Las selecciones del usuario prevalecen sobre entity config        |
| Sesión creada sin pasar tools/skills explícitos                 | Se usan los del entity config (comportamiento actual para tools)  |
| Skills de entity config que no existen en disco                 | Se ignoran silenciosamente (mismo comportamiento que agentSkills) |
| Global config define tools → project/agent los sobreescribe     | Respetar cascade: entity pisa global                              |

#### 4.2 Archivos a modificar (resumen)

**Server:**

- `apps/server/src/core/session/create-user-session.ts` — aceptar tools/skills/executionMode
- `apps/server/src/core/session/agent-context-resolver.ts` — cargar skills del entityConfig
- `apps/server/src/routes/sessions/session-crud.ts` — pasar nuevos campos
- `apps/server/src/core/session/session-bootstrap.ts` — usar skills del entity config (si no se pasaron explícitamente)
- `apps/server/src/core/session/prompt-builder.ts` — verificar inyección de rules/workflows

**Shared:**

- `packages/shared/src/schemas.ts` — extender `CreateSessionSchema`
- `packages/shared/src/tools-catalog.ts` — posiblemente exponer helpers de presets

**Client:**

- `apps/client/src/components/chat/WelcomeChatInput.tsx` — agregar selectores de tools/skills
- `apps/client/src/components/chat/ChatArea.tsx` — cargar entity config, pasar selecciones a createSessionAndSend
- `apps/client/src/lib/session-utils.ts` — extender `buildCreateSessionBody`

**Nuevos archivos (posibles):**

- `apps/client/src/components/chat/InlineToolsSelector.tsx` — versión compacta del ToolsSelector para WelcomeChatInput
- `apps/client/src/components/chat/InlineSkillsSelector.tsx` — versión compacta del SkillsPopover para WelcomeChatInput

---

## Orden de Ejecución

1. **Fase 1.3** — Extender `CreateSessionSchema` y `createUserSession` para aceptar tools/skills
2. **Fase 1.1** — Skills del entity config → session skill paths
3. **Fase 1.2** — Verificar rules/workflows en prompt builder
4. **Fase 2.1** — Cargar entity config en ChatArea (sin sesión)
5. **Fase 2.2** — Agregar selectores al WelcomeChatInput
6. **Fase 2.3** — Pre-poblar selectores con entity config
7. **Fase 3** — Integración end-to-end (cliente → servidor → bootstrap)
8. **Fase 4** — Verificación con `pnpm typecheck` y `pnpm build`
