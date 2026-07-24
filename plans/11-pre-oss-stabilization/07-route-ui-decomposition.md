# Hito 07 — Descomposición de god routes/UI + factory-tool vs REST + chat dual

**Estado:** 📝 Redactado — pendiente de confirmación  
**Criticidad:** P1 mantenibilidad — viola AGENTS.md (>300 LOC); drift REST↔factory; onboarding OSS imposible en archivos 800–1400 LOC  
**Estimación relativa:** L (varios PRs por dominio; no un único dump)  
**Depende de:** 01 (sessions split ya empezado), 05 (bootstrap; factory no debe re-bootstrap), 06 (context en routes facilita extract)  
**No es P0 seguridad** pero **sí** determina si el repo es contribuible

---

## 1. Problema (evidencia)

### 1.1 Archivos muy por encima del límite del proyecto

| Archivo | ~LOC | Rol |
|---------|-----:|-----|
| `routes/sessions.ts` | 1431 | Legacy monstruo post-01 (sin create/list si 01 hecho; sigue prompt/SSE/tools/delegations/…) |
| `ToolCallRow.tsx` | 1416 | Registry + iconos + body switch ×2 |
| `AgentsPage.tsx` | 1187 | Página monólito |
| `GeneralTab.tsx` | 1167 | Settings monólito |
| `routes/files.ts` | 969 | FS + avatars + project meta |
| `ChatArea.tsx` | 938 | Streaming + create session + WS + pending prompt |
| `MessageList.tsx` | 876 | Render + grouping |
| `MainLayout.tsx` | 835 | Shell + demasiados side-effects |
| `factory-tool.ts` | 827 | CRUD paralelo a HTTP |
| `manage-delegations-tool.ts` | 745 | spawn/delegate branches copypaste |
| `routes/teams.ts` | 595 | CRUD + orchestration + dispatch |

AGENTS.md: *Avoid God Objects (>300 lines). Extract… Modular Routing…*

### 1.2 Factory-tool = segunda API REST

`handleAgents` / `handleProjects` / `handleSessions` / `handleTeams` duplican validaciones y side-effects de `routes/agents|teams|…`. Todo cambio de producto exige dos ediciones o genera drift (avatar, metadata, broadcast `project_updated`, etc.).

### 1.3 manage-delegations: ramas agent/project/session casi iguales

~745 LOC con pipelines copiados (model resolve → setModel → forward events → prompt → history). Alto riesgo de fix en una rama no aplicado a otra.

### 1.4 Chat dual session vs team

`ChatArea`+`MessageList` vs `TeamChatArea`+`TeamMessageList` — features (markdown, tools UI, approvals inline) divergen en silencio.

### 1.5 Client sin capa de dominio HTTP

236 `apiFetch` dispersos; hito 03 introduce `attention-api` — este hito extiende el patrón a sessions/agents sin React Query obligatorio.

---

## 2. Objetivo del hito

1. **Ningún archivo de producto tocado en este hito** queda >~400 LOC sin plan de extract (meta ideal ≤300 en módulos nuevos).  
2. **Sessions routes** terminan el patrón sub-router: zero god `sessions.ts` monólito.  
3. **Domain services** compartidos entre REST y `manage_factory` para agents/teams/projects/sessions (mínimo 2 dominios hechos end-to-end; el resto esqueleto).  
4. **manage-delegations** partido por action/target o extractor de pipeline común.  
5. **ToolCallRow** → registry map + componentes por tool (o por familia).  
6. **ChatArea** → hooks de mensajes/streaming; pending prompt sin `window.__pendingPrompts`.  
7. **Message pipeline** compartido lo bastante para que team chat reutilice render de mensajes (adapter de transport).  
8. Criterio medible: lista de archivos y LOC after; tests de smoke por módulo extraído.

**Fuera de alcance:**

- Redesign visual / i18n completo (08).  
- DI restante de todas las routes (06 ya hizo críticas).  
- Reescribir vendor AI.  
- 100% parity team chat en un solo PR si el adapter basta con MessageList shared.  
- Eliminar MainLayout por completo — extract hooks de acciones.

---

## 3. Decisiones de diseño (justificadas)

### D1 — Orden de ataque por ROI / dependencias

| Orden | Target | Por qué primero |
|------:|--------|-----------------|
| 1 | `routes/sessions/*` finish split | Ya empezado (01); residual es el mayor backend file |
| 2 | Domain services + factory-tool thin | Para el drift API; desbloquea confiar en un solo CRUD |
| 3 | `manage-delegations` extract pipeline | Product differentiator; bugs multi-agent |
| 4 | `ToolCallRow` registry | Mayor client file; cambios de tools rozan siempre |
| 5 | `ChatArea` hooks + pending prompt store | Regresiones streaming; hito 02/03 ya estabilizan WS/attention |
| 6 | Shared message render (team adapter) | Paridad |
| 7 | `files.ts` / `teams.ts` sub-routers | Importante pero más mecánico |
| 8 | `AgentsPage` / `GeneralTab` / `MainLayout` | UI pages; menos riesgo core |

**Por qué no** empezar por AgentsPage: cosmético frente a sessions/factory drift.

### D2 — Sessions: sub-routers por verbo/dominio

**Estructura objetivo:**

```
routes/sessions/
  index.ts              # assembler only
  session-crud.ts       # ya existe (01)
  session-prompt.ts     # POST prompt, steer-like HTTP if any
  session-stream.ts     # SSE if separate
  session-messages.ts   # GET messages / export
  session-tools.ts      # GET/PATCH tools, skills, model, context
  session-delegations.ts
  session-analytics.ts
  session-archive.ts
```

**Decisión:** Mover handlers desde `sessions.ts` hasta que el archivo legacy se **elimine** o quede ≤50 LOC re-export temporal luego borrado.

**Por qué no** un solo `session-misc.ts` de 800 LOC: repite el god file con otro nombre.

**Efectos:** imports de `broadcastToSession` / sessionManager vía getServerContext (06).  
Tests: mover/ampliar por sub-router si existen.

### D3 — Domain services entre REST y factory

**Decisión:** Introducir capa fina:

```
core/services/
  agent-service.ts    # create/update/delete/list agents — used by routes/agents + factory handleAgents
  team-service.ts
  project-service.ts  # o workspace-project-service
  session-query-service.ts  # list/filters already partially in session-lister
```

- Routes: validate HTTP → service → json.  
- `factory-tool.ts`: validate tool args → **same service** → tool result envelope.  
- **No** hacer que factory llame HTTP interno (latencia/auth weird).

**Alcance mínimo del hito:**  
- **Must:** agents + teams services wired to both factory and routes.  
- **Should:** projects.  
- **Could:** sessions create already in create-user-session (01) — factory handleSessions create debe llamarlo.

**Por qué no** solo “importar funciones desde routes”: routes tienen Hono `c`; services son pure/async domain.

**Efecto secundario:** factory-tool.ts baja de 827 a assembler de switch + calls; tests factory existentes se adaptan a mocks de service.

### D4 — manage-delegations: extract antes de re-spec

**Decisión:**

```
core/tools/delegations/
  manage-delegations-tool.ts   # schema + switch action only (<150 LOC)
  spawn-subagent.ts
  delegate-to-target.ts        # agent|project|team|session shared runner
  delegation-tool-result.ts
```

Pipeline común:

```ts
async function runChildAgentLoop(opts: {
  session, model, prompt, forwardEvents, abort, envelope
}): Promise<Result>
```

**Por qué:** elimina copy-paste agent vs project.  
**No** cambiar semántica de depth/permissions (ya testeada); solo move.

### D5 — ToolCallRow → registry

**Decisión:**

```
components/chat/tools/
  tool-registry.ts           # map toolName → { icon, labelKey, Body, compact? }
  ToolCallRow.tsx            # shell <300 LOC
  bodies/BashToolBody.tsx
  bodies/DelegationsToolBody.tsx
  ...
  meta.ts                    # labels already partial in literals
```

- Eliminar **doble** `switch (toolName)` (audit: ~496 y ~604).  
- Default body genérico JSON para tools desconocidas (OSS plugins).

**Por qué registry:** añadir tool = 1 body file + 1 line register (alineado guide hito 05).

### D6 — ChatArea extract hooks (no redesign UX)

**Decisión:**

| Módulo | Responsabilidad |
|--------|-----------------|
| `useSessionMessages(sessionId)` | load REST + merge initial |
| `useSessionStreaming(sessionId)` | WS reducers message_*/agent_*/tool_* (filter ya en useWebSocket hito 02) |
| `pending-prompt-store.ts` | replace `window.__pendingPrompts` + localStorage helper con API tipada + TTL |
| `ChatArea.tsx` | layout + compose hooks + input |

**Por qué hooks y no Context global de chat:** menos rerenders globales; session-scoped.  
**Pending prompt:** `window` es anti-pattern OSS; store module + sessionStorage.

**Efecto:** tests unit del reducer de streaming (pure function extract).

### D7 — Message pipeline compartido session/team

**Decisión:**

1. Tipo `ChatMessage` shared o `client/src/lib/chat-types.ts` (si no está en shared aún).  
2. `MessageList` consume `ChatMessage[]` + callbacks neutrales.  
3. Team path: adapter `teamEventsToChatMessages` o reusa MessageList con props.  
4. **No** fusionar `useTeam` transport con session WS en este hito.

**Por qué no** unificar transport: team_join/send es otro protocolo (02 lo tipó); solo UI.

### D8 — files.ts y teams.ts sub-routers

**Decisión:** Mismo patrón sessions:

```
routes/files/
  index.ts
  workspace-crud.ts
  avatars.ts
  ...
routes/teams/
  index.ts
  team-crud.ts
  team-orchestration.ts
  team-messages.ts
```

Mecánico; puede ir en PRs separados después de sessions.

### D9 — Pages Agents / GeneralTab / MainLayout

**Decisión (menor profundidad que core):**

- `AgentsPage` → tabs as child components (`AgentsList`, `BlueprintsTab`, `ExecutionsTab`) en `pages/agents/`.  
- `GeneralTab` → secciones `providers-section`, `models-section`, etc.  
- `MainLayout` → `useProjectActions`, `useTeamActions` ya parcialmente; terminar de sacar CRUD/avatar.

**No** introducir router nested obligatorio si no existe convención.

### D10 — API client modules (patrón attention-api)

**Decisión:** Crear:

```
client/src/lib/api/
  sessions-api.ts
  agents-api.ts
  teams-api.ts
  projects-api.ts
```

Usar en componentes **tocados** por este hito; no reescribir las 236 calls de golpe (strangler).

### D11 — Métrica de cierre y no-gold-plating

**DoD numérico (orientativo):**

| Archivo | LOC target |
|---------|------------|
| `sessions.ts` legacy | **0** (deleted) |
| `factory-tool.ts` | ≤250 |
| `manage-delegations-tool.ts` entry | ≤200 |
| `ToolCallRow.tsx` | ≤300 |
| `ChatArea.tsx` | ≤350 |
| cada session-*.ts nuevo | ≤300 |

Si un extract se atasca, **documentar defer** en el PR; no dejar half-move (handler en dos sitios).

### D12 — Tests por extract

- Cada service domain: 1–2 unit tests del happy path mock FS/registry.  
- Streaming reducer pure test.  
- factory-tool tests existentes deben seguir verdes apuntando a services.  
- No exigir RTL completo de AgentsPage.

---

## 4. Ajustes concretos (checklist por fase)

### Fase 7.1 — Sessions modular finish

- [ ] Inventariar handlers restantes en `sessions.ts` post-01  
- [ ] Crear sub-routers §D2  
- [ ] `index.ts` solo `route()` assembler  
- [ ] Delete `routes/sessions.ts` monólito  
- [ ] typecheck + smoke prompt/SSE/tools/delegations HTTP  

**Archivos:** `routes/sessions/**`, delete `routes/sessions.ts`  
**Efectos:** paths idénticos; cuidado orden mount (`/statuses` vs `/:id`)

### Fase 7.2 — Domain services + factory thin

- [ ] `core/services/agent-service.ts` + wire `routes/agents.ts` + `handleAgents`  
- [ ] `core/services/team-service.ts` + wire teams route + factory  
- [ ] Project service should  
- [ ] `handleSessions` create → `createUserSession` (01)  
- [ ] factory-tool.ts queda switch + zod + service calls  
- [ ] Adapt `factory-tool.test.ts` / contracts  

**Efectos:** behavior parity — comparar responses before/after en tests.

### Fase 7.3 — Delegations tool split

- [ ] Carpeta `core/tools/delegations/`  
- [ ] Shared `runChildAgentLoop`  
- [ ] Entry tool <200 LOC  
- [ ] Tests depth/cancel existentes verdes  

### Fase 7.4 — ToolCallRow registry

- [ ] `tool-registry.ts` + bodies  
- [ ] Single switch/registry lookup  
- [ ] Default unknown tool body  
- [ ] literals preservados  

### Fase 7.5 — ChatArea hooks + pending prompt

- [ ] `useSessionMessages`, `useSessionStreaming` (+ pure reducer)  
- [ ] `pending-prompt-store.ts`  
- [ ] ChatArea compose  
- [ ] Remove `window.__pendingPrompts`  
- [ ] Unit test reducer  

### Fase 7.6 — Shared messages + team adapter

- [ ] `ChatMessage` type  
- [ ] MessageList props neutrales  
- [ ] Team chat uses MessageList or shared blocks  
- [ ] No regress team_send  

### Fase 7.7 — files + teams routers

- [ ] Sub-routers files  
- [ ] Sub-routers teams  
- [ ] Assembler only index  

### Fase 7.8 — Pages / layout (time-boxed)

- [ ] AgentsPage split components  
- [ ] GeneralTab sections  
- [ ] MainLayout hooks  
- [ ] sessions-api/agents-api usage in touched files  

### Fase 7.9 — Verificación global hito

- [ ] LOC report before/after en PR description  
- [ ] typecheck client+server  
- [ ] tests server factory/delegations/session  
- [ ] smoke manual: chat, factory tool upsert agent, delegations spawn, team chat message, file upload  
- [ ] Grep `sessions.ts` monólito gone; `__pendingPrompts` gone  

---

## 5. Archivos a tocar (matriz resumen)

| Área | Crear | Editar | Eliminar |
|------|-------|--------|----------|
| Sessions routes | `session-*.ts` | `sessions/index.ts` | `routes/sessions.ts` |
| Services | `core/services/*` | `routes/agents|teams`, `factory-tool.ts` | — |
| Delegations | `tools/delegations/*` | entry exports | old monolith path |
| Tool UI | `tools/bodies/*`, registry | `ToolCallRow.tsx` | dead switches |
| Chat | hooks, pending store | `ChatArea.tsx`, team chat | window global |
| Files/teams routes | subfolders | index assemblers | monoliths when empty |
| Pages | `pages/agents/*` | AgentsPage, GeneralTab, MainLayout | — |
| API modules | `lib/api/*.ts` | call sites touched | — |

**No tocar:** vendor, landing rewrite, spaces-sdk publish.

---

## 6. Efectos secundarios y riesgos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Half-move sessions (handler duplicate again) | **Crítica** | 01 lesson: un path only; grep mount |
| Service drift still if route bypasses service | Alta | factory+route both call service; code review |
| Delegations split breaks abort tree | Alta | keep existing tests; no logic change |
| ToolCallRow visual regressions | Media | screenshot smoke; default body |
| Streaming hook stale closure | Alta | mirror current ChatArea deps; test reducer |
| Team MessageList parity incomplete | Media | ship adapter MVP; list gaps |
| Huge PR unreviewable | Alta | **phases 7.1–7.8 = PRs separados** |
| Touch files.ts security paths | Alta | no change validateWorkspacePath semantics |

---

## 7. Criterios de hecho (DoD)

1. `routes/sessions.ts` monólito eliminado; assembler modular completo.  
2. factory `handleAgents` + `handleTeams` delegan en services usados por HTTP.  
3. manage-delegations entry ≤200 LOC o justificado; tests delegations verdes.  
4. ToolCallRow ≤300 LOC + registry.  
5. ChatArea sin `window.__pendingPrompts`; streaming en hook testable.  
6. MessageList reutilizable por team path (al menos un call site team).  
7. LOC targets §D11 cumplidos o defer explícito listado.  
8. typecheck + tests relevantes OK.  
9. No se implementó hito 08 de paso (release/docs globales).

---

## 8. Secuencia / PRs sugeridos

```
PR7.1 sessions routers
PR7.2 agent+team services + factory thin
PR7.3 delegations split
PR7.4 ToolCallRow registry
PR7.5 ChatArea hooks
PR7.6 message shared + team
PR7.7 files+teams routers
PR7.8 pages time-box
```

No fusionar 7.1+7.4 en un PR.

---

## 9. Preguntas abiertas para confirmación

Defaults recomendados:

1. **¿Terminar sessions modular hasta borrar monólito?** → **Sí**  
2. **¿Domain services compartidos factory↔REST (agents+teams must)?** → **Sí**  
3. **¿Split manage-delegations por pipeline común sin cambiar semántica?** → **Sí**  
4. **¿ToolCallRow registry + bodies?** → **Sí**  
5. **¿ChatArea hooks + pending-prompt-store (kill window global)?** → **Sí**  
6. **¿MessageList compartido con team (adapter)?** → **Sí**  
7. **¿PRs por fase obligatorios?** → **Sí**  
8. **¿Migrar los 236 apiFetch de una vez?** → **No** (strangler en archivos tocados)  
9. **¿Reescribir MainLayout/AgentsPage al 100%?** → **No** (time-box 7.8)  

Al confirmar, cierra la serie de planes con el **hito 08** (verdad packaging/docs/CI/SDK/self-host).
