# Hito 01 — Restaurar semántica de `POST /api/sessions`

**Estado:** 📝 Redactado — pendiente de confirmación  
**Criticidad:** P0 — regresión de producto introducida por el split modular del Plan 10  
**Estimación relativa:** S–M (1 archivo principal + tests + limpieza de duplicados)  
**Bloquea:** flujos de team Orchestration/Negotiation y consistencia de `projectId` en listados/filtros  
**No bloquea:** DI global, WS tipado, SDK publish (hitos posteriores)

---

## 1. Problema (evidencia)

### 1.1 Mitad de migración con dos handlers para el mismo path

El assembler monta **primero** el CRUD modular y **después** el router legacy:

```9:10:apps/server/src/routes/sessions/index.ts
sessionsRouter.route("/", sessionCrudRouter);
sessionsRouter.route("/", legacySessionsRouter);
```

En Hono, el **primer** handler que matchea gana. Por tanto, para:

| Método | Path | Handler activo hoy | Handler legacy (sombra) |
|--------|------|--------------------|-------------------------|
| `GET` | `/api/sessions/` | `session-crud.ts` | `sessions.ts` (muerto para este path) |
| `GET` | `/api/sessions/statuses` | `session-crud.ts` | `sessions.ts` (muerto) |
| `POST` | `/api/sessions/` | `session-crud.ts` | `sessions.ts` (muerto) |
| `DELETE` | `/api/sessions/:id` | `session-crud.ts` | `sessions.ts` si existiera duplicado |

El legacy sigue siendo necesario para el resto de rutas (`/analytics`, `/:id/prompt`, tools, delegations, etc.), pero sus handlers de list/create/delete **ya no se ejecutan** y **divergen** del código activo.

### 1.2 Qué hace el create activo (incompleto)

```62:97:apps/server/src/routes/sessions/session-crud.ts
sessionCrudRouter.post("/", zValidator("json", CreateSessionSchema), async (c) => {
  // ...
  await sessionManager.getOrCreateSession(
    username,
    newSessionId,
    data.projectId,
    data.agentId,
  );
  sessionManager.metadataStore.saveSessionMetadata(username, newSessionId, {
    name: data.name || newSessionId,
    projectId: data.projectId,
    agentId: data.agentId,
    teamId: data.teamId,
    // ...
  });
  // ...
});
```

**Faltan** respecto al legacy (`sessions.ts` L288–367):

| Comportamiento legacy | Activo hoy | Consecuencia |
|-----------------------|------------|--------------|
| Cargar team y detectar `Orchestration` / `Negotiation` | No | No hay reglas por tipo de equipo |
| Resolver `leader` → `ownerAgentId` en Orchestration | Usa `data.agentId` crudo (suele venir vacío: el client solo manda `teamId`) | Runtime sin agente líder |
| Exigir leader si Orchestration sin lead | No | 201 con sesión inválida |
| Canonicalizar `projectId` vía `project.json` | No | Filtros client (`projectId === id`) fallan si el body mandó slug/name |
| Metadata Negotiation: `executionMode: "readonly"` + tools read-only | No | Negotiation con tools de escritura |
| **No** arrancar runtime si `teamId` y no Orchestration (p.ej. Negotiation) | **Siempre** hace `await getOrCreateSession` | Negotiation crea agent runtime completo de inmediato |
| Orchestration: `workspaceDir: getTeamWorkspaceDir(...)` | No pasa overrides | Bash/files apuntan al workspace equivocado |
| Create fire-and-forget (`.catch`) para no bloquear 201 | `await` bloqueante | Latencia de create + create-then-prompt más frágil si el runtime falla a medias |

### 1.3 Qué manda el client

```43:57:apps/client/src/lib/session-utils.ts
// team → { name, teamId }  (sin agentId)
// agent → { name, agentId }
// project → { name, projectId }  (puede ser name/slug, no siempre UUID canónico)
// global → { name }
```

Call sites: `ChatArea`, `SessionPopover`, `useSessionActions`, `useSessionResolver`, `ProjectFloorPanel`.  
**No hay bug en el client body** para teams: el server debe resolver el líder. Arreglar solo el client no restaura Negotiation/workspace.

### 1.4 Endpoint paralelo que sí hace bien Orchestration (parcial)

`POST /api/teams/:id/orchestration-session` (`teams.ts` L106–143) ya:

- exige team Orchestration + leader válido en registry  
- fija `agentId: leader.agentId` y `teamId`  
- llama `getOrCreateSession` con `workspaceDir: getTeamWorkspaceDir(...)`

Ese path es la sesión canónica `team_{id}`. El path genérico `POST /api/sessions` con `{ teamId }` es el que usa el UI de “nueva sesión en contexto de team” y **está roto** tras el split.

### 1.5 Tests insuficientes

`apps/server/src/__tests__/session-crud.test.ts` solo prueba `metadataStore.saveSessionMetadata` con `projectId/agentId/teamId`. **No** ejercita el router HTTP ni Orchestration/Negotiation/project canonicalization. Por eso la regresión pasó desapercibida.

### 1.6 Firma de `getOrCreateSession`

```212:217:apps/server/src/core/session-manager.ts
async getOrCreateSession(
  username, sessionId, projectId?, agentId?, overrides?: SessionOverrides
)
```

- **No** hay parámetro `teamId`. El team entra solo como `overrides.workspaceDir` y como metadata aparte.  
- `createAgentRuntime` acepta `teamId` en config en otros call sites, pero este create path **no lo pasa**.  
- **Decisión de este hito:** no ampliar la firma pública todavía (eso es hito 05/06). Aquí se restaura el comportamiento legacy **ya probado en producción mental del código**: metadata + `workspaceDir` + agent líder + skip runtime Negotiation.

---

## 2. Objetivo del hito

1. Un solo `POST /api/sessions` con la **semántica completa** del legacy.  
2. Un solo `GET /` y `GET /statuses` (y `DELETE /:id` si está duplicado) sin código muerto divergente.  
3. Tests que fallen si se vuelve a perder leader / Negotiation readonly / projectId canónico / team workspace.  
4. Documentar efectos secundarios (await vs async, respuesta JSON shape, interacción con `orchestration-session`).

**Fuera de alcance de este hito:**

- Inyectar `ServerContext` / quitar singletons (hito 06).  
- Pasar `teamId` first-class a todo el runtime chain (hito 05).  
- Unificar `POST /api/teams/:id/orchestration-session` con create genérico (solo alinear semántica; no fusionar endpoints aún).  
- Refactor grande de `sessions.ts` (hito 07): aquí solo **borrar handlers sombra** de create/list/statuses/delete si están duplicados.  
- Cambios de UI client salvo que un test o contrato de respuesta lo exija (idealmente cero).

---

## 3. Decisiones de diseño (justificadas)

### D1 — Portar lógica al modular; no reordenar mounts para “revivir” legacy

**Decisión:** Implementar la semántica correcta en `session-crud.ts` y eliminar el `POST /` (y list/statuses duplicados) del legacy.

**Por qué no** invertir el orden de mount (`legacy` primero):

- Dejaría el modular como mentira y reabriría el anti-patrón “dos fuentes de verdad”.  
- El Plan 10 y AGENTS.md piden sub-routers; la dirección correcta es **terminar** la migración, no revertirla.  
- Contributors editarían `session-crud` creyendo que es la fuente y el legacy seguiría ganando.

**Por qué no** borrar ya todo `sessions.ts`:

- Aún concentra prompt, SSE, analytics, tools, delegations (~1300 LOC útiles). Eso es hito 07.  
- Este hito solo quita **duplicados de path** que ya no se ejecutan o que confundirían diffs futuros.

### D2 — Extraer un helper de dominio `createUserSession(...)` (recomendado)

**Decisión:** Extraer la lógica de create a un módulo pequeño reutilizable, p.ej.:

`apps/server/src/core/session/create-user-session.ts`

con una función pura de orquestación (no HTTP):

```ts
createUserSession(input: {
  username: string;
  name: string;
  projectId?: string;
  agentId?: string;
  teamId?: string;
}): Promise<CreatedSessionDto>
```

y que `session-crud` solo valide auth + Zod y llame al helper.

**Por qué:**

- Evita que `session-crud.ts` crezca con teamStore/FS/project resolve y se convierta en otro god file.  
- Permite unit-test del helper **sin** montar Hono (más estable que solo tests de router).  
- Deja listo el camino para que `factory-tool` / futuros callers no reimplementen create (hito 07 puede reutilizarlo; **no** es obligatorio cablear factory en este hito).

**Alternativa rechazada:** copiar-pegar el bloque legacy entero dentro del handler del router.

- Funciona, pero perpetúa lógica de negocio en capa HTTP y dificulta tests.

**Alternativa rechazada:** hacer que `session-crud` importe y reexporte el handler legacy.

- No elimina duplicación conceptual; mantiene acoplamiento al monstruo `sessions.ts`.

### D3 — Semántica de team types (contrato de producto a restaurar)

| `team.teamType` | Metadata | ¿Llama `getOrCreateSession` en el create? | agentId efectivo | workspace |
|-----------------|----------|---------------------------------------------|------------------|-----------|
| *sin teamId* | project/agent opcionales | **Sí** | `agentId` del body | default runtime |
| `Orchestration` | `teamId`, `agentId = leader` | **Sí** | leader `role === "lead"` | `getTeamWorkspaceDir(username, teamId)` |
| `Negotiation` | `teamId`, `executionMode: "readonly"`, `tools: ["read","grep","find","ls"]` | **No** en create | body `agentId` si viniera (hoy no) | N/A hasta primer uso que lo pida |
| otro / team sin type conocido | `teamId` + ids body | **Sí** (comportamiento legacy: `!teamId \|\| isOrchestration` ⇒ solo skip si team y no orchestration) | body | si hay teamId y se arranca runtime, preferir team workspace **solo** cuando isOrchestration (legacy exacto) |

**Justificación de copiar el gate legacy `if (!teamId || isOrchestration)` y no “arrancar siempre”:**

- Negotiation está diseñada para no materializar un agent runtime de usuario completo al crear la sesión de contexto; el dispatch vive en rutas de teams.  
- Arrancar runtime en Negotiation (bug actual) puede aplicar tools de escritura y modelo de agente por defecto → regresión de seguridad de producto, no solo de UX.

**Justificación de exigir leader en Orchestration:**

- Sin leader no hay `ownerAgentId` ni roster confiable para `manage_delegations`.  
- Respuesta `400` con mensaje claro es mejor que `201` + runtime huérfano.  
- Alinear mensaje con teams route si es razonable: legacy usa `"Orchestration team requires a leader"`; teams usa `"The orchestration leader is not available"` cuando además falta en registry.  
  - **Decisión:** en create genérico, validar (1) existe member `lead`, (2) opcionalmente que `agentRegistry.get(leader.agentId, username)` exista — **sí validar registry** para no crear sesiones cuyo primer prompt falle de forma opaca. Si el leader no está en registry → `400` con mensaje alineado a teams.

### D4 — Canonicalización de `projectId`

**Decisión:** Reutilizar el mismo bloque que legacy (`resolveProjectDir` + leer `project.json` → `meta.id`).

**Por qué:**

- El client a veces envía el id de UI / name (`activeProjectName`) no el UUID de `project.json`.  
- `getSessionContextPredicate` filtra `session.projectId === resolved.id`. Si se persiste el name y el listado devuelve id canónico (u viceversa), la sesión “desaparece” del sidebar del proyecto.  
- Escribir siempre el id canónico en metadata reduce drift.

**Efecto secundario:** si `project.json` no existe o falla el parse, se conserva el `projectId` del body (legacy ya hace try/catch y log). No fallar el create por eso — un 500 aquí rompería proyectos a medio migrar.

### D5 — Await vs fire-and-forget al crear runtime

**Legacy:** no await; `.catch(console.error)` y devuelve 201 al instante.  
**Modular actual:** `await getOrCreateSession` — si el runtime tarda o falla, el client espera o recibe 500.

**Decisión de este hito:** **mantener `await`** en el path modular (comportamiento actual del handler activo), con manejo de error explícito:

- Si la validación de team/project falla → 4xx sin side effects de metadata a medias (ver D6).  
- Si `getOrCreateSession` lanza → 500 con log; **no** dejar metadata huérfana sin documentar (ver D6).

**Por qué no volver a fire-and-forget sin más:**

- El client hace create-then-navigate-then-prompt (`ChatArea` + pending prompt). Un 201 antes de que el runtime exista ya era una carrera; el await la reduce.  
- OSS: fallar en create es más debuggable que “sesión en lista pero prompt rompe”.

**Por qué no bloquear el hito en un job queue:** fuera de alcance; complejidad de hito 05+.

**Efecto secundario a anotar en release notes internas:** create de sesión puede tardar más (MCP/tools init) que cuando el legacy era async. Aceptable y preferible a regresión silenciosa.

### D6 — Orden de operaciones: validar → metadata → runtime (o runtime → metadata)

**Legacy orden:** arma DTO → save metadata (incl. negotiation tools) → maybe start runtime async.

**Modular actual:** runtime **primero** → metadata después. Si metadata falla, queda runtime en memoria sin meta coherente. Si se quisiera Negotiation skip, ya es tarde.

**Decisión:**

1. Validar body (Zod ya hecho).  
2. Resolver team / leader / projectId (solo lecturas).  
3. Si errores de regla de negocio → `return 4xx` **sin** escribir.  
4. `saveSessionMetadata` completo (incl. negotiation flags).  
5. Si corresponde arrancar runtime → `await getOrCreateSession(...)`.  
6. Si runtime falla después de metadata:  
   - **Opción A (elegida):** log + `500`; dejar metadata en disco (sesión listable; reintento de getOrCreate en primer prompt/WS puede recuperarla). No borrar metadata automáticamente (borrar es más sorprendente y puede nukear un id que el client ya navegó si hubiera race).  
   - Documentar que un 500 puede dejar metadata sin proceso vivo — el siguiente `getOrCreateSession` en prompt/WS debe ser idempotente (ya lo es por map + pending).

**Por qué metadata antes que runtime:** Negotiation no debe tocar runtime; Orchestration debe persistir leader aunque el init sea lento; listados ven la sesión en cuanto hay 201 exitoso.

### D7 — Shape de la respuesta 201

**Legacy devuelve:**

```ts
{ id, name, createdAt, updatedAt, messageCount: 0, projectId, agentId, teamId }
```

(`name` puede ser `undefined` si el schema lo permitiera; schema exige min 1).

**Modular devuelve además:** `status: "active"` y hace fallback de name a `newSessionId`.

**Decisión:** Unificar a un DTO estable:

```ts
{
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  messageCount: 0;
  status: "active";
  projectId?: string | null;
  agentId?: string | null;
  teamId?: string | null;
}
```

- Conservar `status: "active"` del modular (el client de listados ya entiende status).  
- Usar ids **resueltos** (`resolvedProjectId`, `ownerAgentId`), no el body crudo.  
- `name`: `data.name` (schema required).

**Efecto secundario:** clients que comparaban igualdad exacta del JSON legacy sin `status` no deben romperse (campo extra es backward compatible). Si algún test snapshot existe, actualizarlo.

### D8 — GET list: conservar filtro `teamId` del modular

El modular list acepta `teamId`; el legacy **no**. El activo ya es el modular → **no degradar**.

Al borrar el GET legacy duplicado, asegurarse de no reintroducir un list sin `teamId`.

### D9 — No cambiar `CreateSessionSchema` en shared en este hito

El schema ya tiene `name`, `projectId?`, `agentId?`, `teamId?`. Suficiente.

Cualquier campo nuevo (`executionMode` override desde client) queda fuera: el server deriva Negotiation flags.

### D10 — Singletons en el helper: aceptable temporalmente

El helper importará `sessionManager`, `teamStore`, `agentRegistry` como hoy hace el legacy.

**Por qué no DI en este hito:** el objetivo es regresión funcional. Meter ServerContext ahora mezcla hito 01 con 06 y alarga el diff de riesgo. El helper debe ser **fácil de inyectar después** (parámetros opcionales o factory), pero la implementación inicial puede usar singletons con un comentario `// composition: hito 06`.

---

## 4. Ajustes concretos (checklist de implementación)

### 4.1 Nuevo módulo de dominio

- [ ] **Crear** `apps/server/src/core/session/create-user-session.ts`
  - **Qué:** función `createUserSession` con la semántica de la tabla D3 + canonical projectId (D4) + orden D6 + DTO D7.
  - **Imports esperados:**
    - `sessionManager` desde `../session-manager`
    - `teamStore` desde `../../teams/team-store`
    - `agentRegistry` desde `../../agents`
    - `getTeamWorkspaceDir` desde `shared`
    - `resolveProjectDir` desde `./workspace-resolver`
    - `fs` read de `project.json` (mismo patrón legacy; preferir helpers existentes si ya hay uno — **no** duplicar si `workspace-resolver` ya expone canonical id; si no, dejar la lectura aquí o extraer `resolveCanonicalProjectId` al resolver).
  - **Por qué archivo nuevo:** ver D2.
  - **Efectos secundarios:** nuevo símbolo en core/session; no exportar desde packages aún.

- [ ] **Opcional pero preferible:** `resolveCanonicalProjectId(username, projectId): string` en `workspace-resolver.ts` si la lógica de project.json no está centralizada.
  - **Por qué:** `sessions.ts` legacy y create helper no deben copiar el try/catch FS dos veces a largo plazo; si solo se usa en create ahora, puede vivir privado en el helper y moverse en hito 07.

### 4.2 Router modular

- [ ] **Editar** `apps/server/src/routes/sessions/session-crud.ts`
  - **POST `/`:** delegar en `createUserSession`; mapear errores de dominio a HTTP:
    - team no encontrado → `404` o `400` (elegir **400** con mensaje `"Team not found"` para no filtrar existencia si se prefiere paridad simple; **decisión:** `404` si teamId presente y `getTeam` null — más correcto REST).
    - Orchestration sin leader / leader no en registry → `400` con mensaje estable.
  - **No** llamar `getOrCreateSession` directo desde el router.
  - Mantener `authMiddleware` + `CreateSessionSchema`.
  - **GET `/` y `/statuses` y DELETE:** sin cambio de comportamiento salvo verificación de paridad con legacy delete (destroySession ya está).

### 4.3 Legacy: eliminar handlers sombra

- [ ] **Editar** `apps/server/src/routes/sessions.ts`
  - **Eliminar** por completo:
    - `sessionsRouter.get("/", ...)` (L34–83 approx) — sombra del modular; además **carece** de `teamId` filter.
    - `sessionsRouter.get("/statuses", ...)` (L85–89)
    - `sessionsRouter.post("/", ...)` (L288–368) — la lógica vive en el helper
  - **Revisar** si existe `DELETE /:id` duplicado en legacy; si sí, eliminar el duplicado y dejar solo modular.
  - **Limpiar imports** que queden huérfanos (`CreateSessionSchema` si ya no se usa en este archivo, etc.).
  - **No eliminar** en este hito: analytics, archive, prompt, tools, delegations, etc.

- [ ] **Verificar** `apps/server/src/routes/sessions/index.ts`
  - Mount order se mantiene (crud primero, legacy segundo).  
  - Añadir comentario breve **justificado**: “CRUD owns GET/POST/DELETE collection paths; legacy owns the rest. Do not re-add duplicate collection handlers to legacy.”

### 4.4 Tests

- [ ] **Ampliar** `apps/server/src/__tests__/session-crud.test.ts` **o** crear `create-user-session.test.ts` (preferible el segundo, enfocado al helper).

Casos mínimos:

| # | Caso | Expect |
|---|------|--------|
| T1 | Create global `{ name }` | metadata sin project/agent/team; runtime iniciado (mock/spy `getOrCreateSession`) |
| T2 | Create project con id no canónico (fixture `project.json` con otro `id`) | metadata.projectId === canonical |
| T3 | Create agent `{ agentId }` | metadata.agentId; getOrCreate llamado con ese agentId |
| T4 | Create Orchestration con leader | metadata.agentId === leader; getOrCreate con workspaceDir team; 201 |
| T5 | Create Orchestration sin leader | 400; **sin** metadata nueva; **sin** getOrCreate |
| T6 | Create Negotiation | metadata.executionMode === `"readonly"` y tools read-only; **getOrCreate NO llamado** |
| T7 | Create teamId inexistente | 404/400; sin metadata |
| T8 | Create Orchestration leader no en agentRegistry | 400 |

Estrategia de test:

- Preferir testear **helper** con spies en `sessionManager.getOrCreateSession`, `metadataStore`, `teamStore`, `agentRegistry` (como ya hacen tests de delegaciones).  
- No requerir LLM real ni red.

- [ ] Mantener los tests actuales de metadata store (siguen siendo válidos).

### 4.5 Client

- [ ] **No cambiar** `session-utils.ts` salvo que al probar manualmente se descubra que el client envía un campo incorrecto (no es el caso hoy).  
- [ ] **Smoke manual recomendado** (no automatizado en este hito): crear sesión desde UI en contexto team Orchestration y Negotiation; verificar sidebar filtra por teamId; Negotiation no escribe con bash en la sesión de contexto.

### 4.6 Documentación de producto / about

- [ ] **No** reescribir `about.md` entero.  
- [ ] Si al cerrar el hito se confirma el fix, una línea en el checklist del plan basta; `about.md` se actualiza en hito 08 o al cerrar el plan 11 completo (evitar thrash de docs).

### 4.7 Verificación de cierre

- [ ] `pnpm --filter server run typecheck` (o el script canónico del monorepo).  
- [ ] `pnpm --filter server test` incluyendo los nuevos casos (o `bun test` path del package).  
- [ ] Grep de control: **una sola** definición de `post("/",` create session en routes (solo session-crud).  
  ```bash
  rg 'post\("/"' apps/server/src/routes/sessions --glob '*.ts'
  ```
- [ ] Grep: no debe quedar segundo `CreateSessionSchema` handler en `sessions.ts`.

---

## 5. Archivos a tocar (matriz)

| Archivo | Acción | Por qué |
|---------|--------|---------|
| `apps/server/src/core/session/create-user-session.ts` | **Crear** | Lógica de negocio de create fuera de HTTP (D2) |
| `apps/server/src/core/session/workspace-resolver.ts` | **Editar solo si** se extrae `resolveCanonicalProjectId` | Evitar FS duplicado (D4) |
| `apps/server/src/routes/sessions/session-crud.ts` | **Editar** POST | Punto HTTP activo real |
| `apps/server/src/routes/sessions.ts` | **Editar** — borrar GET `/`, GET `/statuses`, POST `/` (+ DELETE dup si hay) | Eliminar sombra y drift |
| `apps/server/src/routes/sessions/index.ts` | **Editar** comentario de ownership | Prevenir reintroducción del bug |
| `apps/server/src/__tests__/create-user-session.test.ts` (nuevo) o ampliar `session-crud.test.ts` | **Crear/Editar** | Regresión blindada |
| `apps/server/src/core/session-manager.ts` | **No tocar** en este hito | Firma y runtime chain son hito 05 |
| `apps/server/src/routes/teams.ts` | **No tocar** | orchestration-session ya correcto; solo referencia de paridad |
| `packages/shared/src/schemas.ts` | **No tocar** | CreateSessionSchema suficiente |
| `apps/client/**` | **No tocar** (salvo bug hallado) | Body ya correcto |

---

## 6. Efectos secundarios y riesgos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Create más lento por `await` runtime (MCP/tools) | Media (UX) | Aceptado (D5); no volver a async ciego |
| Metadata huérfana si runtime falla tras save | Baja | getOrCreate idempotente en prompt/WS; log claro |
| Teams Negotiation que “dependían” del bug (runtime ya creado) | Baja | Comportamiento legacy intencional; si algo en UI asumía runtime inmediato al crear Negotiation, fallará hasta primer dispatch — **correcto** |
| `POST orchestration-session` vs create genérico siguen siendo dos APIs | Baja (deuda) | Documentado; unificar en hito 07 si se desea |
| Tests que spían singletons globales pueden interferir en paralelo | Baja | before/after restore como en `delegate-tool-team.test.ts` |
| Borrar GET legacy sin `teamId` es mejora; si alguien pegaba al legacy mentalmente en docs | N/A | Docs hito 08 |
| `agentRegistry` / `teamStore` imports desde core/session aumentan acoplamiento core→teams | Media (arquitectura) | Temporal; hito 06 inyecta puertos. **No** mover teamStore a shared en este hito |
| Mensajes de error en inglés hardcodeados | Baja | Paridad con resto del server; i18n no es este hito |

### Compatibilidad con create-then-prompt (client)

Flujo típico en `ChatArea`:

1. `POST /api/sessions` → recibe `id`  
2. Navega a la sesión / guarda pending prompt  
3. `prompt` o WS `prompt` sobre ese id  

Con await en create, al llegar al paso 3 el runtime **debería** existir para Orchestration/global/agent/project.  
Para Negotiation, el paso 3 no debe asumir agent tools de escritura; el UI de negotiation usa rutas de team — **verificar manualmente** un create+open Negotiation no rompe el panel.

---

## 7. Criterios de hecho (DoD)

1. Un único handler HTTP de create collection en el árbol `routes/sessions/`.  
2. Casos T1–T8 en verde (o equivalente cubierto).  
3. Typecheck server verde.  
4. Diff del legacy **no** incluye reescritura de prompt/analytics — solo eliminación de duplicados + imports.  
5. Lectura del POST modular / helper muestra explícitamente: leader, canonical projectId, Negotiation skip+readonly, team workspace en Orchestration.  
6. Este archivo de plan marcado con checkboxes hechos al cerrar la implementación.  
7. `plans/11-pre-oss-stabilization/index.md` marca hito 01 completado **después** de implementar (no al confirmar el texto).

---

## 8. Secuencia de implementación sugerida (para el agente ejecutor)

1. Escribir `create-user-session.ts` + tests en rojo/verde.  
2. Cablear `session-crud` POST al helper.  
3. Borrar handlers sombra en `sessions.ts` + limpiar imports.  
4. Comentario en `index.ts`.  
5. Typecheck + tests.  
6. Smoke manual teams si hay entorno.  
7. Marcar checkboxes del plan.

**No** empezar hito 02 en el mismo PR salvo acuerdo explícito.

---

## 9. Preguntas abiertas para confirmación del usuario

Resolver antes o durante la confirmación de este texto (defaults recomendados entre paréntesis):

1. **¿Validar leader en `agentRegistry` además de membership?**  
   - Recomendado: **Sí** (D3).  
2. **¿404 o 400 si `teamId` no existe?**  
   - Recomendado: **404**.  
3. **¿Extraer archivo `create-user-session.ts` o dejar lógica en el router?**  
   - Recomendado: **extraer** (D2).  
4. **¿Mantener await o volver a fire-and-forget?**  
   - Recomendado: **await** (D5).  
5. **¿Incluir en este hito el cableado de `factory-tool` create session al mismo helper?**  
   - Recomendado: **No** (alcance creep → hito 07). Solo dejar el helper listo.

Si confirmas el hito tal cual (o con deltas a estas 5 preguntas), el siguiente paso es **implementar el 01** o, si prefieres plan-only primero, **redactar el hito 02** tras tu OK.
