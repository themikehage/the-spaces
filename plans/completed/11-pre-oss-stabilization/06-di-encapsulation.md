# Hito 06 — DI real (`ServerContext`), encapsular `AgentSession`, cortar bridges core↔WS

**Estado:** 📝 Redactado — pendiente de confirmación  
**Criticidad:** P1 core — arquitectura documentada como DI/ports es fachada; mutación de API privada; acoplamiento circular core↔ws  
**Estimación relativa:** L (mejor en 2–3 PRs lógicos: ports+middleware → AgentSession API → broadcast ports)  
**Depende de:** 05 muy recomendado (bootstrap único reduce callers de `_customTools`); 02 si se tipan eventos de broadcast  
**No bloquea OSS hard** como 01/04, pero **sí** bloquea credibilidad de “Core extensible” y tests aislados

---

## 1. Problema (evidencia)

### 1.1 ServerContext existe y no se usa

```55:55:apps/server/src/index.ts
const serverContext = createServerContext(); // nunca c.set / nunca inyectado
```

`createServerContext()` solo empaqueta **los mismos singletons** (`server-context.ts` L39–47).  
Rutas hacen fallback:

```ts
(c as any).get?.("serverContext") ?? delegationRegistry;
```

→ siempre el singleton.

### 1.2 Ports incompletos y con `any`

`core-services.port.ts`:

- `ISessionManager` sin `listSessions`, `getLiveStatuses`, `metadataStore`, etc.
- `IMemoryRegistry` solo `shutdownAll()` — runtime usa `get(...)`.
- `IDelegationRegistry` / MCP / UI approval: `any` en eventos y resultados.
- `SessionOverrides` sin `teamId` (hito 05 lo añade en implementación; ports deben reflejarlo).

### 1.3 ~25+ singletons de proceso = arquitectura real

`sessionManager`, `mcpRegistry`, `delegationRegistry`, `memoryRegistry`, `uiApprovalRegistry`, `wsRegistry`, `teamStore`, `teamOrchestrator`, `agentRegistry`, `approvalManager`, `permissionEngine`, `userConfigManager`, `sessionToolFactory`, …

Tests y multi-instancia mentalmente imposibles; OSS no puede swapear implementaciones.

### 1.4 Bridges por setters (core ↔ ws ↔ teams)

Al importar `ws/handler.ts`:

```ts
setTeamBroadcastHandler(broadcastToTeam);
setEventBroadcaster(broadcastToUser);
setWsHandlerBridge(registerTeamInterceptor, broadcastToSession);
```

Core importa WS:

- `approval-manager`, `preview-builder`, `preview-watcher`, `ui-approval-registry`, `agent-utils` (dynamic import), tools varios → `broadcastToUser` / `broadcastToSession`.

Import order bugs + imposibilidad de unit-test core sin levantar WS.

### 1.5 Legacy `ws/handler.ts` peligroso

Además de bridges, el audit marcó path legacy `onMessage` con mutación inútil de id.  
`index.ts` debe usar solo `createWsContext` de `factory.ts`. El handler file mezcla **broadcasts útiles** + **lifecycle legacy**.

### 1.6 AgentSession: API privada mutada desde fuera

- Público de facto: `_customTools`, `_refreshToolRegistry()`, `customTools: any[]`, `AgentSessionEvent = any`
- Mutadores externos: `session-manager`, `create-agent-server`, `manage-custom-tools-tool`, `mcp-attach` (hito 05)

Sin encapsulación no hay plugin/tool API estable para OSS.

### 1.7 Documentación miente

`about.md` / planes 09–10 afirman DI + ports + decomposición. Parte de decomposición de AgentSession **sí** avanzó (submódulos), pero el **composition root** no inyecta.

---

## 2. Objetivo del hito

1. **Composition root real:** un `ServerContext` (ampliado) creado en `index.ts`, puesto en Hono (`c.set`) y pasado a WS factory / route assemblers.
2. **Ports que reflejan uso real** (sin `any` gratuito en firmas públicas de puerto); DTOs en shared donde ya existan (delegations, attention).
3. **Política de imports:** módulos de dominio **no** importan `ws/handler`; reciben `IEventBroadcaster` / `IWsGateway`.
4. **Eliminar setter bridges** (`setWsHandlerBridge`, `setEventBroadcaster`, `setTeamBroadcastHandler`) cableando en el root.
5. **Separar** `ws/broadcast.ts` (puro send) de lifecycle; borrar o aislar legacy handler path.
6. **API pública AgentSession** para tools: `addTools` / `replaceTools` / `setActiveToolsByName` ya existe parcialmente — formalizar y **dejar de exportar** mutación `_customTools` a callers externos.
7. Tests: crear context con fakes; route test con context inyectado; AgentSession addTools sin tocar underscore.

**Fuera de alcance:**

- Eliminar **todos** los `export const x = new X()` del proceso en un PR (imposible sin reescribir todo). Estrategia: **strangler** — root usa singletons como default **implementations**, pero el **código nuevo y rutas críticas** leen del context.
- Migrar 100% de archivos a constructor injection en este hito.
- Publicar npm SDK (hito 08).
- Split god routes/files (hito 07).
- Quitar todos los `as any` del vendor agent loop.

---

## 3. Decisiones de diseño (justificadas)

### D1 — Strangler DI, no big-bang “borrar singletons”

**Decisión:**

1. Ampliar `ServerContext` con servicios que hoy cruzan boundaries:
   - ya: session, mcp, delegation, memory, uiApproval, spacesHost
   - añadir: `eventBroadcaster: IEventBroadcaster`, `teamStore` (port o concrete corto plazo), `agentRegistry`, `approvalManager`, `userConfig` / metadata accessors según necesidad de routes
2. Singletons siguen existiendo como **default bindings** en `createServerContext()`.
3. Middleware:

```ts
app.use("*", async (c, next) => {
  c.set("serverContext", serverContext);
  await next();
});
```

4. Helpers: `getServerContext(c): ServerContext` tipado (Hono Variables).
5. Rutas **críticas** migradas en este hito (lista §4); resto puede seguir importando singleton **con eslint ban gradual** opcional.

**Por qué no** borrar singletons ya:

- Diff de 100+ archivos, riesgo de regresión masiva pre-OSS.
- Valor = **poder** testear e inyectar, y cortar mentira documental.

**Por qué no** dejar ServerContext como está:

- Es greenwashing arquitectónico; peores que no tenerlo.

### D2 — Ampliar ports con tipos reales (shared first)

**Decisión por puerto:**

| Port                          | Cambios                                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `ISessionManager`             | + `listSessions`, `getLiveStatuses`, `destroyAllSessions?`, acceso metadata vía método o `ISessionMetadataStore` separado |
| `IMcpRegistry`                | `getSessionMcpTools` → `Promise<BaseTool[] \| VendorTool[]>` tipado mínimo; no `any[]`                                    |
| `IDelegationRegistry`         | eventos con union de hito 02/shared; `DelegationRecord` type                                                              |
| `IMemoryRegistry`             | + `get(key, dbPath, enabled)`, `shutdown(key)?`                                                                           |
| `IUiApprovalRegistry`         | align register/resolve signatures con implementación                                                                      |
| **Nuevo** `IEventBroadcaster` | `toUser(username, msg)`, `toSession(sessionId, msg)`, `toTeam(teamId, msg)`                                               |
| **Nuevo** `IApprovalManager`  | o incluir en context concrete tipado                                                                                      |

`SessionOverrides`: incluir `teamId?` (05), `customTools?: BaseTool[]`, evitar `resourceLoader?: any` → tipo del loader o `unknown` + cast interno.

**Por qué shared DTOs:** AGENTS.md typed contracts; evita ports que no se pueden implementar fuera del monorepo.

**Pragmatismo `any` residual:** permitido **solo** dentro de adapters vendor, no en la firma del port exportada.

### D3 — IEventBroadcaster reemplaza imports core→ws

**Decisión:**

```ts
// core/ports/event-broadcaster.port.ts
export interface IEventBroadcaster {
  toUser(username: string, data: WsServerMessage | Record<string, unknown>): void;
  toSession(sessionId: string, data: ...): void;
  toTeam(teamId: string, data: ...): void;
}
```

Implementación: `apps/server/src/ws/ws-event-broadcaster.ts` usa `wsRegistry` + `safeSend`.

**Composition root:**

```ts
const broadcaster = createWsEventBroadcaster(wsRegistry);
const serverContext = createServerContext({ eventBroadcaster: broadcaster, ... });
// approvalManager.setBroadcaster(broadcaster) OR construct ApprovalManager({ broadcaster })
```

**Migración de call sites core** que hoy importan handler:

| Módulo                                                    | Acción                                                                                                                       |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `approval-manager.ts`                                     | constructor/setter `broadcaster`                                                                                             |
| `ui-approval-registry.ts`                                 | igual                                                                                                                        |
| `preview-builder.ts` / `preview-watcher.ts`               | igual                                                                                                                        |
| `agent-utils.ts`                                          | usar broadcaster inyectado; **eliminar** `setWsHandlerBridge` y dynamic import handler                                       |
| tools (`factory-tool`, `manage-custom-tools`, task tools) | recibir broadcaster por closure factory desde context **o** importar solo `IEventBroadcaster` binding del root vía parameter |

**Regla:** `apps/server/src/core/**` no puede importar `apps/server/src/ws/handler` ni `ws/factory`.  
Enforcement: test o eslint `no-restricted-imports` en este hito para `core/**`.

**Por qué:** corta el ciclo; tests de approval no cargan WS server.

### D4 — Eliminar setter bridges

**Decisión:**

- Borrar `setEventBroadcaster` / patrón mutable en `event-broker.ts` → broker recibe broadcaster en construct o se depreca si es thin alias.
- Borrar `setTeamBroadcastHandler` → `TeamOrchestrator` recibe `IEventBroadcaster` o `toTeam` fn en construct.
- Borrar `setWsHandlerBridge` en `agent-utils` → params explícitos en `forwardSubagentEvents(..., { broadcastToSession })`.

**Efecto secundario:** `ws/handler.ts` side effects on import desaparecen — hay que **invocar wire** explícito en `index.ts` (más claro para OSS).

### D5 — Partir `ws/handler.ts`

**Decisión:**

| Archivo nuevo/rol | Contenido                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `ws/broadcast.ts` | `broadcastToUser/Session/Team` implementando port (o delegan a class)                                                                |
| `ws/factory.ts`   | lifecycle único (ya)                                                                                                                 |
| `ws/handler.ts`   | **eliminar** exports legacy onOpen/onMessage **si** grep confirma zero usales; si algo los usa, reexport thin deprecated una versión |

**Verificación:** `rg "from \".*ws/handler\""` tras split — solo broadcast re-exports temporales.

### D6 — AgentSession: API de tools pública

**Decisión:** Métodos oficiales (nombres exactos al implementar según existentes):

```ts
class AgentSession {
  addTools(tools: ToolLike[]): void;
  replaceCustomTools(tools: ToolLike[]): void; // or setCustomTools
  setActiveToolsByName(names: string[]): void; // already exists
  // _refreshToolRegistry becomes private refreshToolRegistry()
}
```

- `_customTools` → `private customTools` (o protected).
- Callers externos (`mcp-attach`, manage-custom-tools) usan **solo** API pública.
- `AgentSessionEvent`: empezar union mínima shared o type en agent-session no-`any` para events que emite el wrapper (full vendor events pueden seguir unknown en payload).

**Por qué no** rewrite 825 LOC del loop:

- Riesgo altísimo; hito 10 ya extrajo submódulos. Aquí solo **boundary tools + events type alias**.

**Efecto secundario:** cualquier hack externo a `_customTools` rompe compile — **deseado**; grep y fix en monorepo.

### D7 — Hono tipado Variables

**Decisión:**

```ts
type AppVariables = { serverContext: ServerContext; requestId?: string };
const app = new Hono<{ Variables: AppVariables }>();
```

`getServerContext(c)` sin `as any`.

### D8 — Rutas a migrar en este hito (mínimo viable)

Migrar lectura de context (no reescribir business logic):

1. `routes/sessions/*` + legacy sessions delegations paths que ya intentan soft-get
2. `routes/approvals.ts`
3. `routes/teams.ts` (orchestration session / abort)
4. WS `createWsContext({ context })` o closure over serverContext

**No migrar todas** las routes de files/gallery en este hito.

### D9 — Tests de DI

| Test                                                 | Qué prueba                                     |
| ---------------------------------------------------- | ---------------------------------------------- |
| `server-context.test.ts`                             | options override reemplaza sessionManager fake |
| `approvals-with-fake-broadcaster.test.ts`            | resolve emite via fake, no ws                  |
| `agent-session-tools-api.test.ts`                    | addTools + setActive without _ fields          |
| eslint or unit: core file does not import ws/handler | restricted import                              |

### D10 — Documentación honesta

**Decisión:** Al cerrar hito, actualizar **un párrafo** en `ARCHITECTURE.md` (o about en 08) describiendo:

- Composition root
- Qué está en ServerContext
- Qué sigue siendo singleton process-global a propósito (caches, wsRegistry connections)

No reclamar “full DI” si files routes aún usan singleton.

### D11 — Relación con spaces-sdk / SpacesHost

`ServerSpacesHost` ya existe. Este hito:

- Asegura que `spacesHost` en context es el mismo instance que usa el server.
- **No** publica npm (08).
- Si `SpacesHost` debe exponer broadcaster, solo si el port de host lo necesita — no inventar.

### D12 — Orden interno de PRs recomendado

1. **PR6a:** `IEventBroadcaster` + split broadcast + leave setters wired to same impl (behavior parity) + no-restricted-imports core
2. **PR6b:** AgentSession tools API + migrate mcp-attach / custom tools
3. **PR6c:** Hono middleware + migrate critical routes + delete dead setter APIs + expand ports

Puede ser un solo PR si el ejecutor es disciplinado; el plan permite split.

---

## 4. Ajustes concretos (checklist)

### 4.1 Ports y context

- [ ] Ampliar `core-services.port.ts` (+ archivos port nuevos si >300 líneas no aplica aún)
- [ ] `event-broadcaster.port.ts`
- [ ] Ampliar `ServerContext` + `ServerContextOptions` + `createServerContext`
- [ ] `SessionOverrides.teamId` alineado con 05
- [ ] Types: reducir `any` en firmas port

### 4.2 Broadcast sin ciclos

- [ ] Crear `ws/broadcast.ts` o `ws/ws-event-broadcaster.ts`
- [ ] Implementar `IEventBroadcaster`
- [ ] Wire en `index.ts` **antes** de montar routes que emiten
- [ ] Migrar approval-manager, ui-approval-registry, preview-*, agent-utils, tools que importan handler
- [ ] Eliminar `setEventBroadcaster`, `setTeamBroadcastHandler`, `setWsHandlerBridge`
- [ ] eslint `no-restricted-imports` para `core/**` → `ws/handler`
- [ ] Grep zero `from \"../ws/handler\"` under core (salvo comment ban)

### 4.3 WS handler cleanup

- [ ] Confirmar entrypoint solo factory
- [ ] Delete legacy onOpen/onMessage si dead
- [ ] handler.ts queda re-export deprecated **o** deleted

### 4.4 Hono DI

- [ ] Variables type + middleware set context
- [ ] `getServerContext(c)` helper
- [ ] Migrar sessions, approvals, teams (mínimo)
- [ ] `createWsContext` recibe deps del context (sessionManager, etc.)

### 4.5 AgentSession encapsulation

- [ ] Public `addTools` / `setCustomTools` / private refresh
- [ ] Remove external `_customTools` / `_refreshToolRegistry` usages (grep)
- [ ] mcp-attach (05) updated
- [ ] manage-custom-tools updated
- [ ] Narrow `AgentSessionEvent` if cheap
- [ ] Tests tools API

### 4.6 Call sites tools/delegations

- [ ] `manage-delegations-tool`: prefer injected registries from factory options fed by context (optional params already exist — **wire callers**)
- [ ] session destroy abort: use same delegationRegistry instance from context

### 4.7 Docs snippet

- [ ] ARCHITECTURE.md short “Composition root & ports” section truth

### 4.8 Verificación

- [ ] typecheck server
- [ ] tests DI + broadcaster fake + agent session tools
- [ ] smoke: approval broadcast, preview status, chat stream, delegation complete event
- [ ] Grep candados setters + core→handler imports + `_customTools` external

---

## 5. Archivos a tocar (matriz)

| Archivo                                  | Acción                            | Por qué           | Efectos secundarios          |
| ---------------------------------------- | --------------------------------- | ----------------- | ---------------------------- |
| `core/ports/core-services.port.ts`       | Ampliar                           | contratos reales  | implementaciones deben match |
| `core/ports/event-broadcaster.port.ts`   | Crear                             | desacoplar WS     | —                            |
| `core/server-context.ts`                 | Ampliar                           | DI bag            | más defaults singleton       |
| `index.ts`                               | Wire middleware + construct graph | root real         | order of init matters        |
| `middleware/server-context.ts` o similar | Crear                             | c.set             | —                            |
| `ws/broadcast.ts` / broadcaster impl     | Crear                             | impl port         | —                            |
| `ws/handler.ts`                          | Partir/borrar legacy              | fin side effects  | update imports monorepo      |
| `ws/factory.ts`                          | Inject deps                       | no singleton only | —                            |
| `lib/event-broker.ts`                    | Simplificar/borrar setters        | D4                | —                            |
| `teams/team-orchestrator.ts`             | Inject broadcast                  | D4                | —                            |
| `core/agent-utils.ts`                    | Inject broadcast; no dynamic ws   | ciclos            | —                            |
| `core/approvals/approval-manager.ts`     | Inject broadcaster                | —                 | construct at root            |
| `core/ui-approval-registry.ts`           | Inject broadcaster                | —                 | —                            |
| `core/preview-*.ts`                      | Inject broadcaster                | —                 | —                            |
| tools que broadcast                      | Inject or factory                 | —                 | —                            |
| `ai/agent-session.ts`                    | API tools pública                 | encapsulación     | breaking private             |
| `session/mcp-attach.ts` (05)             | usar API pública                  | —                 | —                            |
| `routes/sessions*`, `approvals`, `teams` | getServerContext                  | —                 | —                            |
| `eslint.config.mjs`                      | restricted imports                | enforcement       | —                            |
| `ARCHITECTURE.md`                        | párrafo honesto                   | —                 | —                            |
| `__tests__/*`                            | nuevos                            | candados          | —                            |
| 100% routes/files                        | **No**                            | 07                | —                            |
| borrar todos singletons                  | **No**                            | strangler         | —                            |

---

## 6. Efectos secundarios y riesgos

| Riesgo                                            | Severidad | Mitigación                                 |
| ------------------------------------------------- | --------- | ------------------------------------------ |
| Init order: route emite antes de wire broadcaster | Alta      | construct graph lineal en index; test boot |
| Olvidar migrar un broadcast → silent no-op        | Alta      | fake broadcaster tests; grep imports       |
| AgentSession private break externo                | Media     | grep monorepo only pre-OSS                 |
| Ampliar ports sin implementar → typeerror         | Media     | adapter wrappers en singletons             |
| Scope creep rewrite session-manager               | —         | checklist prohíbe; solo inject             |
| eslint ban rompe CI de golpe                      | Media     | ban solo `core/**` first                   |
| Doble broadcaster instance                        | Alta      | un solo instance en context                |
| Performance N/A                                   | —         | —                                          |

---

## 7. Criterios de hecho (DoD)

1. `serverContext` se setea en Hono y se lee en routes migradas (no dead variable).
2. Cero `setWsHandlerBridge` / `setEventBroadcaster` / `setTeamBroadcastHandler`.
3. Cero imports `core/**` → `ws/handler` (eslint o test).
4. AgentSession: cero usos externos de `_customTools` / `_refreshToolRegistry`.
5. Ports cubren métodos realmente usados por routes migradas + memory get.
6. Tests fake context + fake broadcaster + tools API verdes.
7. typecheck OK.
8. ARCHITECTURE describe el root con honestidad (singletons default bindings OK).
9. No se completó de paso hito 07/08.

---

## 8. Secuencia sugerida

1. IEventBroadcaster + broadcast module + wire index (setters still forward to same — then delete setters).
2. Migrate core emitters off handler imports + eslint.
3. AgentSession tools API + grep fix.
4. Expand ports + ServerContext fields.
5. Hono middleware + migrate sessions/approvals/teams + ws factory deps.
6. Delete legacy handler paths.
7. Tests + ARCHITECTURE blurb.
8. Marcar checkboxes.

---

## 9. Preguntas abiertas para confirmación

Defaults recomendados:

1. **¿Strangler DI (singletons como default bindings) en vez de borrar todos los singletons?** → **Sí**
2. **¿IEventBroadcaster + ban core→ws/handler?** → **Sí**
3. **¿Eliminar setter bridges en este hito?** → **Sí**
4. **¿API pública tools en AgentSession y prohibir `_customTools` externo?** → **Sí**
5. **¿Migrar solo routes críticas (sessions/approvals/teams) + WS factory?** → **Sí**
6. **¿Ampliar ports quitando `any` de firmas públicas?** → **Sí** (best-effort; vendor edges internal)
7. **¿Publicar spaces-sdk npm aquí?** → **No** (hito 08)
8. **¿Permitir 2–3 PRs internos (6a/6b/6c)?** → **Sí**

Al confirmar, sigue el **hito 07** (descomposición rutas/UI god + factory vs REST).
