# Hito 05 — Un path de bootstrap de runtime + catálogo único de tools

**Estado:** 📝 Redactado — pendiente de confirmación  
**Criticidad:** P0 core — permisos/tools/memory divergen por entrypoint; catálogo duplicado miente a UI y subagents  
**Estimación relativa:** M–L (core denso; PR revisable en 2 commits lógicos: catálogo → bootstrap)  
**Depende de:** 01 recomendado (create session ya estabilizado); 04 si se toca tool-factory bash (coordinar tokens)  
**Habilita:** 06 (DI/encapsulación AgentSession más limpia si bootstrap es único)

---

## 1. Problema (evidencia)

### 1.1 Tres (o cuatro) caminos de construcción de sesión/agente

| Path                     | Archivo                              | Qué hace de más / distinto                                                                                                                                 |
| ------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Canonical parcial** | `createAgentRuntime`                 | model, tools factory, hooks, plugins MemoryEnricher; **no** setActiveTools final unificado; **no** MCP attach estándar; **no** teamId en todos los callers |
| **B. User sessions**     | `session-manager.getOrCreateSession` | Llama A, luego **re-resuelve** tools (`resolveActiveTools`), subagent filter, `enrichSessionWithMemory` (segunda vía de memory), MCP push a `_customTools` |
| **C. Agent server**      | `create-agent-server.ts`             | Llama A con `toolProfile: "agent-server"`, hardcodea lista active tools, MCP push `_customTools`, **wrap `session.prompt`** con memory otra vez            |
| **D. Delegations**       | `manage-delegations-tool.ts`         | Reconstruye bash/UI tools + resourceLoader + `getOrCreateSession` overrides; no pasa siempre por la misma política de always-on                            |

Resultado: un fix de permisos/tools en B no aplica a C/D. OSS contributors no saben “dónde se encienden las tools”.

### 1.2 Dual `TOOL_GROUPS` / `AVAILABLE_TOOLS`

**Server (runtime truth hoy):** `apps/server/src/core/session/tool-groups.ts`

- Keys: `FILESYSTEM`, `COMMUNICATION`, …
- `bash` dentro de FILESYSTEM
- `manage_custom_tools` en FACTORY
- `DEFAULT_ALWAYS_ON_TOOLS` derivado de grupos

**Shared (UI / permissions / subagent known list):** `packages/shared/src/schemas.ts`

- Keys: `fs`, `execution`, `communication`, `ui`, …
- `bash` en `execution` con `manage_preview`
- **Falta** `manage_custom_tools`, `generate_video`
- Tiene `create_experiment`, `manage_pipelines` en meta
- `AVAILABLE_TOOLS` incompleto vs tools reales en server

### 1.3 Tercera/cuarta copia de ALWAYS_ON

Hardcoded arrays casi iguales en:

- `ws/factory.ts` ~L386–401
- `routes/sessions.ts` ~L937+
- `create-agent-server.ts` ~L44–59
- (y `DEFAULT_ALWAYS_ON_TOOLS` legítimo en tool-groups)

### 1.4 Memory enrichment triplicado

1. `MemoryEnricherPlugin` registrado en `createAgentRuntime`
2. `enrichSessionWithMemory` en `session-manager`
3. Wrap de `prompt` en `create-agent-server`

Riesgo: double inject de contexto de memoria o paths que no usan el plugin.

### 1.5 MCP y mutación `_customTools`

B y C hacen:

```ts
session._customTools.push(...mcpTools);
session._refreshToolRegistry();
```

Eso es deuda de encapsulación (hito 06), pero el **bootstrap único** debe centralizar el attach MCP para no olvidarlo en un path.

### 1.6 `teamId` no first-class en getOrCreateSession

Firma actual: `(username, sessionId, projectId?, agentId?, overrides?)`.  
`createAgentRuntime` acepta `teamId` pero session-manager **no lo pasa**. Hito 01 mitiga workspace via `overrides.workspaceDir`; este hito debe pasar `teamId` en config de runtime cuando se conozca (metadata / overrides).

---

## 2. Objetivo del hito

1. **Una fuente** `AVAILABLE_TOOLS` + `TOOL_GROUPS` + `DEFAULT_ALWAYS_ON_TOOLS` en **`packages/shared`** (browser-safe, sin Node).
2. Server **re-exporta** o importa solo desde shared; borra duplicados y arrays ALWAYS_ON locales.
3. **`SessionBootstrap` / profiles** dentro o junto a `createAgentRuntime`: un solo lugar aplica tools activas, memory policy, MCP attach policy, subagent filter hooks.
4. Callers (**session-manager**, **create-agent-server**, **delegations** en lo razonable) delegan en bootstrap; no reimplementan listas.
5. **Una** vía de memory auto-recall (plugin); eliminar wraps duplicados donde el plugin ya cubre.
6. Tests: catálogo coherente; always-on idéntico desde un import; bootstrap profile smoke.

**Fuera de alcance:**

- API pública limpia `session.addTools()` (hito 06) — aquí se puede introducir **un** helper interno `attachTools(session, tools)` usado por bootstrap para reducir `as any`, sin redesign completo de AgentSession.
- DI ServerContext completo (hito 06).
- Split god `manage-delegations` por actions (hito 07) — solo alinear create path de sub-sesiones.
- UI permissions redesign.
- Eliminar tools legacy `create_experiment` si aún hay código — **inventariar**: si dead, quitar del catálogo; si vivo, incluir.

---

## 3. Decisiones de diseño (justificadas)

### D1 — Shared es dueño del catálogo; server no redefine grupos

**Decisión:** Mover/consolidar en `packages/shared/src/tools-catalog.ts` (archivo nuevo, no hinchar más `schemas.ts`):

```ts
export const AVAILABLE_TOOLS = [ ... ] as const
export const TOOL_GROUPS = { ... } as const  // keys estables
export const DEFAULT_ALWAYS_ON_TOOLS = [ ... ] // derived
export function isKnownTool(name: string): boolean
export function toolsInGroup(group: ToolGroupId): readonly string[]
```

`schemas.ts` re-exporta desde ahí para no romper imports existentes `from "shared"`.

**Por qué shared y no solo server:**

- Client permissions UI, ToolPermissions, subagent-permissions (`AVAILABLE_TOOLS` from shared) deben ver el **mismo** universo.
- OSS: un contributor añade tool → un archivo (+ implementacion + renderer).

**Por qué archivo nuevo:** `schemas.ts` ya es god-file (~866 LOC); AGENTS.md modularidad.

### D2 — Convención de nombres de grupos

**Conflicto:** server usa `FILESYSTEM`, shared usa `fs` / `execution`.

**Decisión:** Adoptar **keys estables en SCREAMING_SNAKE o lower** — elegir **una**:

| Opción                                                          | Elección                     |
| --------------------------------------------------------------- | ---------------------------- |
| **A. lower-case product keys** `filesystem`, `communication`, … | Mejor para JSON/API          |
| B. Keep server SCREAMING                                        | Menos churn server, peor API |

**Elegido: A — keys lowercase estables:**

```ts
TOOL_GROUPS = {
  filesystem: ["read", "write", "edit", "bash", "grep", "find", "ls"],
  communication: [...], // UI + approval tools (merge shared ui+communication)
  delegation: ["manage_delegations"],
  memory: [...],
  tasks: [...],
  vision: ["vision", "generate_image", "generate_video?"],
  factory: ["manage_factory", "manage_custom_tools"],
  search: ["exa_search", "web_fetch"],
  preview: ["manage_preview"],
  pipelines: ["manage_pipelines"], // si tool existe
  // lab/experiment solo si código vivo
}
```

**Justificación merge communication+ui:** el split shared no se refleja en runtime always-on; un solo grupo `communication` reduce drift. Si la UI de permissions necesita sub-chips, puede **derivar** sublistas en client sin segundo catálogo server.

**Migration:** export type aliases deprecated:

```ts
/** @deprecated use TOOL_GROUPS.filesystem */
export const TOOL_GROUPS_LEGACY_FS = TOOL_GROUPS.filesystem;
```

Grep server `TOOL_GROUPS.FILESYSTEM` → `TOOL_GROUPS.filesystem`.  
Grep shared/client `TOOL_GROUPS.fs` → nuevo nombre.

**Efecto secundario:** permisos persistidos por **nombre de tool** (strings) no por group id — bajo riesgo. Si algún JSON guardó group keys, documentar map de migración una vez.

### D3 — Contenido canónico de AVAILABLE_TOOLS (completar gaps)

**Incluir** (si el tool file existe en server):

- Todo lo de server tool-groups
- `manage_custom_tools`
- `generate_video` (existe `video-gen-tool.ts`)
- `manage_pipelines` (existe)
- `manage_preview`
- `web_fetch`, `exa_search`
- memory trio

**Sobre `create_experiment`:** grep al implementar; si solo schemas/dead lab → **sacar** de AVAILABLE_TOOLS o marcar deprecated group `lab` no always-on. No reintroducir lab product.

**DEFAULT_ALWAYS_ON** = unión explícita documentada (como hoy server): communication + tasks + vision (image; video **no** always-on salvo producto diga lo contrario) + factory + delegation.

**Video/search/preview/memory:** condicionales (keys, projectId, memoryEnabled) vía `resolveActiveTools` — no always-on ciego.

### D4 — `resolveActiveTools` es la única función de merge; borrar ALWAYS_ON locales

**Decisión:**

- `ws/factory.ts` prompt tools merge → importa `DEFAULT_ALWAYS_ON_TOOLS` + `resolveActiveTools` (o helper `mergePromptToolSelection(requested, context)`).
- `routes/sessions.ts` PATCH tools → igual.
- `create-agent-server` → no arma array a mano; llama bootstrap profile.

**Por qué no** dejar copies “por si acaso”: son la causa raíz del audit #10/#22.

### D5 — SessionBootstrap profiles

**Decisión:** Extender `createAgentRuntime` **o** añadir `bootstrapAgentSession(config): Promise<BootstrappedSession>` que:

1. Llama lógica actual de runtime (context, model, factory tools, hooks, plugins).
2. Aplica **post-steps** según `toolProfile`:

| Profile        | setActiveTools                             | MCP                      | Memory enrich                    | Subagent rules                          | Notes                        |
| -------------- | ------------------------------------------ | ------------------------ | -------------------------------- | --------------------------------------- | ---------------------------- |
| `user-session` | resolveActiveTools(session metadata tools) | async attach             | plugin only                      | no                                      | teamId/projectId from config |
| `subagent`     | resolve + filter deny rules                | optional skip or limited | plugin / skipMemory flag         | yes                                     |                              |
| `agent-server` | resolve with agent defaults                | attach by agent id       | plugin only (**no** prompt wrap) | beforeToolCall already marks isSubagent |                              |
| `delegate`     | alias subagent o igual                     | as overrides             | skipMemory often                 | yes                                     |                              |

3. Devuelve `{ session, context, runtime }` listo para registrar en session-manager.

**Por qué no** dejar post-steps en session-manager:

- create-agent-server y tests no pasan por session-manager.
- El bug es “post-steps olvidados”.

**Por qué no** micro-framework de plugins de bootstrap: YAGNI; un switch profile + functions `applyToolActivation`, `attachMcpTools`, `assertNoDuplicateMemoryWrap`.

### D6 — Memory: una sola vía

**Decisión:**

- Conservar `MemoryEnricherPlugin` en createAgentRuntime como **única** auto-recall.
- **Eliminar** `enrichSessionWithMemory(session, memory)` del path user-session **si** se verifica que el plugin efectivamente intercepta el mismo lifecycle que el wrap de prompt.
- **Eliminar** wrap `session.prompt` en create-agent-server.
- Si el plugin **no** está cableado al vendor session loop (riesgo: se registra PluginManager pero no se pasa a createAgentSession):

**Verificación obligatoria al implementar:** leer si `pluginManager` se usa tras `register` en agent-runtime L155–173. En el snippet actual:

```ts
const pluginManager = new PluginManager();
pluginManager.register(...);
// createAgentSession({...})  // ¿recibe plugins?
```

Si **no** se pasa `pluginManager` a `createAgentSession`, el plugin es **código muerto** y la única vía real es `enrichSessionWithMemory`. Entonces:

- **D6-alt (elegida si plugin no está wired):** wire pluginManager al session **o** mantener enrichSessionWithMemory como única vía y **borrar** registros de plugin no usados.
- **No** dejar ambos “por si acaso”.

**Acción en plan:** checkbox “auditar wiring PluginManager → session”; resultado determina delete path.

### D7 — MCP attach centralizado (sin API pública aún)

**Decisión:** función interna:

```ts
// session/mcp-attach.ts
export async function attachSessionMcpTools(
  session,
  username,
  key: sessionId | agentId,
): Promise<void>;
```

Usa temporalmente `_customTools` + `_refreshToolRegistry` (hito 06 reemplaza).  
Todos los profiles que necesiten MCP llaman aquí — **una** implementación.

### D8 — teamId first-class en getOrCreateSession

**Decisión:** ampliar firma de forma backward-compatible:

```ts
getOrCreateSession(
  username,
  sessionId,
  projectId?: string,
  agentId?: string,
  overrides?: SessionOverrides & { teamId?: string }
)
// O mejor overload / options object — pero options object es breaking amplio.
```

**Pragmático:** añadir `teamId?: string` a `SessionOverrides` y leer metadata si falta:

```ts
const meta = metadataStore.get(...);
const teamId = overrides?.teamId ?? meta?.teamId;
await createAgentRuntime({ ..., teamId, workspaceDir: overrides?.workspaceDir });
```

Callers de hito 01 create-user-session pasan teamId en overrides además de workspaceDir.

**Por qué:** tool-factory ya usa teamId para permitted agents / preview; sin pasarlo, delegaciones y roster fallan en silencio.

### D9 — Delegations: no rewrite del god tool

**Decisión:** En manage-delegations, donde construye child session:

- Preferir `getOrCreateSession` / bootstrap con profile `subagent` y overrides (customTools, workspaceDir, skipMemory).
- Eliminar copias locales de always-on / bash inject **solo si** quedan tras 04; no re-implementar tool lists.
- No split file en este hito.

### D10 — BaseTool dual path: solo contención

**Decisión:** No migrar todos los legacy tools a BaseTool aquí.  
Sí: bootstrap siempre pasa por `sessionToolFactory` + `toVendorFormat` como hoy.  
Documentar en comentario del factory: “legacy adapter boundary — hito 06/13”.  
Reducir **un** duck-type si es trivial; no bloquear.

### D11 — Tests

| Test                                                                 | Assert                                                                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `tools-catalog.test.ts` (shared)                                     | every ALWAYS_ON ⊆ AVAILABLE_TOOLS; no duplicate names; generate_video/manage_custom_tools listed if required             |
| `tool-activation-engine.test.ts`                                     | given flags, merge stable; remove overrides work                                                                         |
| `bootstrap-profile.test.ts` (server)                                 | mock heavy deps: user-session calls resolveActiveTools once; agent-server does not double memory wrap; MCP attach called |
| Grep CI opcional en test: `ALWAYS_ON = [` no aparece fuera de shared |

### D12 — Docs tool registration

**Decisión:** Actualizar `docs/tool_registration_guide.md` a:

1. Añadir nombre a `packages/shared/src/tools-catalog.ts`
2. Implementar tool en server
3. Registrar en sessionToolFactory (o auto si filesystem tools)
4. Renderer client si aplica

Eliminar “edit 4 files always-on”. Paths Windows absolutos fuera.

---

## 4. Ajustes concretos (checklist)

### 4.1 Catálogo shared

- [ ] **Crear** `packages/shared/src/tools-catalog.ts` con AVAILABLE_TOOLS, TOOL_GROUPS, DEFAULT_ALWAYS_ON_TOOLS, helpers
- [ ] **Editar** `packages/shared/src/schemas.ts` — re-export; eliminar definiciones duplicadas
- [ ] **Editar** `packages/shared/src/index.ts` exports
- [ ] **Tests** shared catalog invariants
- [ ] Grep client/server imports `TOOL_GROUPS.fs` / `FILESYSTEM` y migrar

### 4.2 Server usa shared only

- [ ] **Eliminar contenido** de `apps/server/src/core/session/tool-groups.ts` → re-export from shared **o** borrar archivo y fix imports
- [ ] **Editar** `tool-activation-engine.ts` — import shared
- [ ] **Editar** `ws/factory.ts` — quitar ALWAYS_ON hardcode
- [ ] **Editar** `routes/sessions.ts` — quitar ALWAYS_ON hardcode
- [ ] **Editar** `create-agent-server.ts` — no lista manual
- [ ] **Editar** `subagent-permissions.ts` si asume lista shared (ya AVAILABLE_TOOLS)
- [ ] Grep `ALWAYS_ON` / `DEFAULT_ALWAYS_ON` duplicados = 0 definiciones locales de arrays de tools

### 4.3 Bootstrap unificado

- [ ] **Auditar** PluginManager wiring (D6) — documentar hallazgo en PR
- [ ] **Crear** `apps/server/src/core/session/session-bootstrap.ts` (o expandir agent-runtime)
  - `bootstrapAgentSession(config: AgentRuntimeConfig & { profile fields })`
  - steps: runtime → tool activation → memory policy → mcp attach → return
- [ ] **Editar** `agent-runtime.ts` — dejar de ser “a medias”; o thin wrapper sobre bootstrap
- [ ] **Crear** `mcp-attach.ts` helper interno
- [ ] **Editar** `session-manager.ts` — getOrCreateSession delgado: llama bootstrap; pasa teamId; **no** re-merge tools ni segundo memory si bootstrap lo hace
- [ ] **Editar** `create-agent-server.ts` — solo definition + bootstrap profile agent-server + HTTP routes
- [ ] **Editar** `manage-delegations-tool.ts` — child create vía sessionManager/bootstrap; sin listas always-on propias
- [ ] **Editar** create-user-session (hito 01) si necesita pasar teamId en overrides — coordinar

### 4.4 Memory path único

- [ ] Según audit D6: wire plugin **o** keep enricher function; delete the other
- [ ] Remove create-agent-server prompt wrap
- [ ] Remove duplicate enrich in session-manager if plugin wired

### 4.5 teamId

- [ ] SessionOverrides + createAgentRuntime already has teamId — plumb from metadata
- [ ] Tests: bootstrap with teamId calls tool-factory with teamId (mock)

### 4.6 Docs

- [ ] `docs/tool_registration_guide.md` rewrite corto
- [ ] No full ARCHITECTURE rewrite (hito 08)

### 4.7 Verificación

- [ ] typecheck shared + server (+ client si groups usados en UI)
- [ ] tests catalog + activation + bootstrap smoke
- [ ] Grep candados ALWAYS_ON hardcode, dual TOOL_GROUPS definitions
- [ ] Smoke manual: user chat tools, agent server health tools, spawn subagent tools subset, negotiation readonly still from metadata (01)

---

## 5. Archivos a tocar (matriz)

| Archivo                                     | Acción                      | Por qué              | Efectos secundarios                   |
| ------------------------------------------- | --------------------------- | -------------------- | ------------------------------------- |
| `packages/shared/src/tools-catalog.ts`      | **Crear**                   | SSOT catálogo        | —                                     |
| `packages/shared/src/schemas.ts`            | Re-export                   | compat imports       | —                                     |
| `packages/shared` tests                     | Crear                       | invariants           | —                                     |
| `apps/server/.../tool-groups.ts`            | Re-export o delete          | fin dual             | update imports                        |
| `tool-activation-engine.ts`                 | Editar                      | shared always-on     | behavior parity tests                 |
| `session-bootstrap.ts` / `agent-runtime.ts` | Crear/editar                | un path              | callers simplify                      |
| `mcp-attach.ts`                             | Crear                       | DRY MCP              | sigue usando private API              |
| `session-manager.ts`                        | Adelgazar                   | no post-steps dup    | regresiones si se olvida step — tests |
| `create-agent-server.ts`                    | Adelgazar                   | profile agent-server | agent HTTP igual                      |
| `manage-delegations-tool.ts`                | Editar menor                | child bootstrap      | no full split                         |
| `ws/factory.ts`                             | Editar                      | no ALWAYS_ON local   | prompt tool merge                     |
| `routes/sessions.ts`                        | Editar                      | no ALWAYS_ON local   | permissions PATCH                     |
| `session-memory-enricher.ts`                | Delete o keep one path      | D6                   | double memory risk                    |
| `plugins/memory-enricher.plugin.ts`         | Wire o remove               | D6                   | —                                     |
| `create-user-session.ts` (01)               | Plumb teamId                | runtime context      | —                                     |
| Client permissions UI                       | Migrar group keys si aplica | labels               | i18n keys                             |
| `docs/tool_registration_guide.md`           | Rewrite                     | OSS DX               | —                                     |
| `AgentSession` public API                   | **No** (06)                 | —                    | mcp-attach temporal ugly OK           |
| BaseTool full migration                     | **No**                      | —                    | —                                     |

---

## 6. Efectos secundarios y riesgos

| Riesgo                                                            | Severidad   | Mitigación                                         |
| ----------------------------------------------------------------- | ----------- | -------------------------------------------------- |
| Cambiar group keys rompe UI permissions labels                    | Media       | map legacy keys en client una release; tests       |
| Quitar ALWAYS_ON local omite tool que solo estaba en un array     | Alta        | diff arrays antes/después en test snapshot sorted  |
| Plugin memory no wired → al borrar enricher se pierde recall      | **Crítica** | audit D6 obligatorio antes de delete               |
| Bootstrap bug rompe todas las sesiones                            | Alta        | feature flag no; tests + smoke; PR review focus    |
| teamId plumbing cambia workspace resolution                       | Media       | tests workspace-resolver + 01 semantics            |
| manage_pipelines en catalog pero no always-on → “tool missing” UX | Baja        | known tools list includes it; activation separate  |
| create-agent-server behavior change on tool set                   | Media       | compare activeToolNames before/after in test       |
| Coordinación con hito 04 tool-factory tokens                      | Media       | si 04 no merged, no pelear inject; solo activation |

---

## 7. Criterios de hecho (DoD)

1. Una sola definición de TOOL_GROUPS / AVAILABLE_TOOLS / DEFAULT_ALWAYS_ON (shared).
2. Cero arrays ALWAYS_ON hardcodeados en ws/factory, sessions routes, create-agent-server.
3. session-manager y create-agent-server no duplican merge de tools ni triple memory.
4. MCP attach en un helper.
5. teamId llega a createAgentRuntime desde getOrCreate cuando está en metadata/overrides.
6. Tests catalog + activation + bootstrap en verde.
7. tool_registration_guide describe un solo catálogo.
8. typecheck OK.
9. No se “hizo de paso” DI completo ni split de delegations file.

---

## 8. Secuencia de implementación sugerida

1. Inventario final tools on disk vs AVAILABLE_TOOLS (tabla en PR).
2. `tools-catalog.ts` + tests + re-exports + migrate imports group keys.
3. Kill ALWAYS_ON duplicates → resolveActiveTools/shared.
4. Audit memory plugin wiring → choose single path.
5. `session-bootstrap` + `mcp-attach`; slim session-manager + create-agent-server.
6. Plumb teamId; touch delegations child create mínimamente.
7. Docs tool guide.
8. Full typecheck + smoke profiles.
9. Marcar checkboxes.

**Idealmente 2 commits:** `catalog` / `bootstrap`.

---

## 9. Preguntas abiertas para confirmación

Defaults recomendados:

1. **¿SSOT del catálogo en `packages/shared/src/tools-catalog.ts`?** → **Sí**
2. **¿Group keys lowercase nuevas (`filesystem`, …) con migración de `fs`/`FILESYSTEM`?** → **Sí**
3. **¿Merge communication+ui en un grupo?** → **Sí**
4. **¿`generate_video` y `manage_custom_tools` en AVAILABLE_TOOLS?** → **Sí**
5. **¿Una sola memory path tras auditar plugin wiring?** → **Sí**
6. **¿Bootstrap profiles en módulo dedicado llamado por todos los entrypoints?** → **Sí**
7. **¿Reescribir manage-delegations por completo?** → **No**
8. **¿API pública AgentSession.addTools en este hito?** → **No** (helper interno MCP OK)

Al confirmar, sigue el **hito 06** (DI real + encapsular AgentSession + cortar bridges core↔WS).
