# Hito 02 — Congelar contrato WebSocket + bugs de nombres + aislamiento por sesión

**Estado:** 📝 Redactado — pendiente de confirmación  
**Criticidad:** P0 — contrato externo mentiroso + regresiones de UI en tiempo real  
**Estimación relativa:** M (shared schemas + server validate + client tipado parcial + fixes puntuales)  
**Depende de:** 01 recomendado (menos ruido al probar chat/teams); no bloquea implementación paralela de 04  
**Bloquea conceptualmente:** hito 03 (Attention) se beneficia de eventos tipados y nombres correctos

---

## 1. Problema (evidencia)

### 1.1 `packages/shared/src/ws-messages.ts` no describe el wire real

| En shared hoy | En el wire real |
|---------------|-----------------|
| Client: `subscribe_session` | Client/server: **`session_subscribe`** (`useWebSocket.ts`, `factory.ts` L336) |
| Client: `unsubscribe_session` | **No implementado** en server |
| Client: `approval_response` | Client envía **`ui_action`** (`AskQuestionForm`, `ApprovalForm`) |
| Server: `session_stream` wrapper | Server reenvía **eventos de agente crudos** (`safeSend(ws, JSON.stringify(agentEvent))` L67) |
| Server: `approval_request` con `{ requestId, tool, params }` | Server emite `{ type: "approval_request", approval: request }` (`approval-manager.ts` L80–83) |
| ~10 tipos totales | Decenas: prompt/steer/abort, teams, preview_*, attention_*, delegation_*, session_status, ping/pong, ui_action_*, etc. |

**Nadie importa** `WsServerMessage` / `WsClientMessage` fuera de `packages/shared`. El contrato es documentación muerta.

### 1.2 Docs desactualizados

`docs/websocket-protocol.md` repite los nombres incorrectos (`subscribe_session`), omite teams/prompt/ui_action/preview/delegations/attention, y documenta shape de `approval_request` que no coincide con el manager.

### 1.3 Bugs concretos de nombres / suscripciones muertas (client)

| Ubicación | Escucha / asume | Realidad |
|-----------|-----------------|----------|
| `ProjectFloorPanel.tsx` L126 | `approval_requested` | Server: `approval_request` |
| `ProjectFloorPanel.tsx` L125 | `session_updated` | **Nunca emitido** en server |
| `ChatArea.tsx` L512 | `tool_approval_request` | No hay emitter WS con ese type (approvals van por `approval_request` user-wide o UI inline) |
| Shared / docs | `subscribe_session` | Wire: `session_subscribe` |

### 1.4 Aislamiento multi-sesión roto en el client

Evidencia:

1. **Subscribe sin unsubscribe** — `useWebSocket.ts` L24–27 solo envía `session_subscribe` al cambiar `sessionId`. El server, al suscribir otra sesión, quita el socket de la anterior (`factory.ts` L52–57: `removeSessionSocket` + `addSessionSocket`), pero:
2. **Handlers globales por type** — `wsClient.subscribe(type, handler)` registra handlers **sin scope de sesión**. `ChatArea` usa esos handlers y **no filtra** `evt.sessionId === sessionId` en `agent_start`, `message_*`, `tool_*`, etc. (L356–525).
3. **Fan-out del server** — eventos de agente se mandan al socket suscrito a esa sesión (OK), pero `session_status` se manda a **todos** los sockets del usuario (L122–134). `approval_*` / `attention_*` son user-wide (correcto). Si el usuario tiene dos vistas o cambia rápido de sesión, o si en el futuro un socket recibe más de un stream, el client mezcla estado.
4. **`TimelineTabPanel`** también llama `useWebSocket(sessionId)` y escucha `agent_end` / `message_end` sin filtro — mismo riesgo.
5. **`useTeam`** hace `subscribe("*")` (L128) — todo mensaje WS pasa por lógica de team; acoplamiento y coste.

### 1.5 Ingress sin validación

`factory.ts` L264–268: `JSON.parse` + casts `as string`. Mensajes malformados se tragan o rompen con 500 opacos. No hay `WsClientMessageSchema.safeParse`.

### 1.6 Egreso heterogéneo

- Canal sesión: eventos de `AgentSession` tal cual (shape vendor/runtime).  
- Canal usuario: objetos ad hoc `{ type, ... }`.  
- No hay versionado de protocolo (`v1`).

### 1.7 Tests

`ws-factory.test.ts` cubre lifecycle id/pong/meta. **No** valida nombres de mensajes, schemas, ni session filter en client (client sin tests).

---

## 2. Objetivo del hito

1. **Una sola fuente de verdad** en `packages/shared` para mensajes client→server y server→client **de control** (auth, session control, teams control, approvals/attention envelopes, preview, errors, ping).  
2. **Nombres del wire = nombres del schema = nombres del client** (fix typos).  
3. **Validación en ingress** server (dev + production: reject/log unknown o invalid).  
4. **Client tipado** en `send`/`subscribe` lo suficiente para que un typo no compile.  
5. **Aislamiento por sesión** en handlers de chat: filter + unsubscribe de sesión en server + cleanup client.  
6. **Docs** regenerados/alineados con schemas.  
7. **No** reescribir el streaming interno del agente ni el Attention store (hito 03).

**Fuera de alcance:**

- Unificar triple pipeline de approvals en un store (hito 03) — aquí solo nombres/contratos y bugs de subscribe.  
- Quitar bridges core↔WS / DI (hito 06).  
- Sacar ALWAYS_ON tools del handler prompt a tool-groups (hito 05) — se puede dejar un TODO en código si se toca esa zona, **sin** mover la lista en este hito salvo que sea trivial.  
- Tipar **payload completo** de cada `message_update` del vendor agent (demasiado acoplado al vendor); ver D3.  
- i18n de strings de error WS (se corrige español hardcodeado del prompt readonly a inglés estable — mínimo).

---

## 3. Decisiones de diseño (justificadas)

### D1 — Protocolo = “wire names actuales”, no los nombres del schema viejo

**Decisión:** Los nombres canónicos son los que **ya habla** producción:

- `session_subscribe` (no `subscribe_session`)  
- `approval_request` con payload `{ approval: ... }` (no flat `requestId/tool/params` como único shape)  
- `ui_action` (no `approval_response` como path principal)

**Por qué no** renombrar el server al schema viejo:

- Rompería clientes ya desplegados y cualquier fork.  
- El schema viejo nunca se usó en runtime; no tiene legitimidad.

**Por qué no** soportar ambos nombres para siempre:

- Doble superficie eterna.  
- **Excepción temporal (D2):** alias de lectura de un release si hace falta; preferible un solo nombre + fix client en el mismo hito.

### D2 — Fix de typos client en el mismo hito que el contrato

**Decisión:** Corregir en el mismo PR/hito:

| Antes | Después |
|-------|---------|
| `approval_requested` | `approval_request` |
| `session_updated` | **Eliminar** subscribe muerto **o** emitir evento real |

**Sobre `session_updated`:**  
Inventario server: **no existe emitter**. Opciones:

- **A (elegida):** quitar la suscripción en `ProjectFloorPanel`; el panel ya se refresca por `project_updated`, `approval_request`, `global_log` y fetch REST.  
- B: emitir `session_updated` desde session metadata saves — scope creep, más acoplamiento.

**Sobre `tool_approval_request` en ChatArea:**  
No hay broadcast WS con ese type. Las approvals de tool llegan como:

- user-wide `approval_request` (overlay/hub), y/o  
- mensajes/UI inline vía stream de agente (`ui_action` tools).

**Decisión:** Eliminar el handler muerto `tool_approval_request` **o** dejarlo solo si se demuestra un emitter en el stream de agente con ese `type` (grep al implementar). Si el stream de agente usa otro shape, no inventar bridge en este hito.

### D3 — Dos capas en el schema: control plane vs agent event bus

**Decisión:** Estructurar `ws-messages.ts` así:

1. **Control / product messages** — Zod estricto, discriminated union completa para lo que factory y broadcasts de producto emiten/aceptan.  
2. **Agent runtime events** — unión amplia o schema con:
   - `type: z.string()` acotado a un **allowlist** de tipos conocidos del loop (`agent_start`, `agent_end`, `message_start`, `message_update`, `message_end`, `tool_execution_start`, `tool_execution_update`, `tool_execution_end`, `agent_error`, …)
   - `sessionId: z.string().optional()` **recomendado** en envelope
   - payload restante `z.unknown()` o campos opcionales mínimos

**Por qué no** Zod exhaustivo del message content del vendor:

- El vendor/agent loop cambia shapes; acoplar shared a cada campo interno es frágil y no es el valor OSS prioritario.  
- El valor prioritario es: **nombres estables**, **sessionId en envelope donde falte**, **client no se suscribe a strings inventados**.

**Envelope de sesión (D3b):**  
Al reenviar `agentEvent` al socket, el server debería garantizar `sessionId` en el objeto si no viene:

```ts
safeSend(ws, JSON.stringify({ ...agentEvent, sessionId: agentEvent.sessionId ?? sessionId }));
```

**Por qué:** habilita filter en client sin adivinar.  
**Efecto secundario:** clients que hacen igualdad profunda de eventos podrían ver un campo nuevo — irrelevante en práctica; JSON extra es backward compatible.

### D4 — Validación ingress: strict en tipos conocidos, unknown → error tipado

**Decisión:**

```ts
const parsed = WsClientMessageSchema.safeParse(JSON.parse(raw));
if (!parsed.success) {
  safeSend(ws, JSON.stringify({
    type: "error",
    error: "Invalid message",
    code: "WS_INVALID_MESSAGE",
    // details solo si NODE_ENV !== production opcional
  }));
  return;
}
```

- Tipos **no** autenticados permitidos pre-auth: `auth`, `pong` (y solo esos).  
- Resto requiere user en registry (ya existe el gate L329).  
- **No** silenciar parse JSON fallido sin log: al menos `wsLogger.warn` una vez.

**Por qué no** drop silencioso (comportamiento actual del catch vacío en client y parse fail return en server):

- OSS debugging nightmare.  
- Contributors no ven por qué su mensaje “no hace nada”.

### D5 — `session_unsubscribe` explícito

**Decisión:** Implementar client→server:

```json
{ "type": "session_unsubscribe", "sessionId": "..." }
```

Comportamiento server:

- Quitar socket de `sessionSockets` para ese id si coincide.  
- Limpiar `meta.sessionId` si era ese.  
- **No** destruir la `AgentSession` en memoria (unsubscribe ≠ destroy).  
- Responder opcional `{ type: "session_unsubscribed", sessionId }` para simetría (sí, barato y testeable).

Client `useWebSocket`:

- On `sessionId` change / unmount: enviar unsubscribe del id anterior; subscribe del nuevo.  
- Re-subscribe tras reconnect (ya parcialmente cubierto por `useConnectionAwareEffect` — asegurar que sigue mandando subscribe).

**Por qué:** hoy el server solo “cambia” de sesión al nuevo subscribe; si el componente desmonta sin nuevo subscribe, el socket **sigue** en `sessionSockets` y recibe streams de una sesión que la UI ya no muestra (handlers pueden estar unsubscribed en client, pero el server sigue serializando y mandando → desperdicio; y si queda un handler global colgado, bug).

### D6 — Filter por `sessionId` en ChatArea / Timeline (obligatorio)

**Decisión:** Helper:

```ts
function isForSession(data: unknown, sessionId: string): boolean {
  if (!data || typeof data !== "object") return false;
  const sid = (data as { sessionId?: string }).sessionId;
  // Si el evento no trae sessionId (legacy agent event pre-envelope), 
  // aceptar solo si este hook es el dueño del único subscribe activo…
}
```

**Política elegida (estricta con envelope D3b):**

- Tras D3b, **todos** los eventos de sesión reenviados llevan `sessionId`.  
- Handlers de ChatArea: `if (sid !== sessionId) return;`  
- Eventos user-wide (`approval_request`, `attention_*`, `project_updated`, `preview_*`, `session_status`) **no** pasan por el filter de chat message stream; se manejan en sus componentes.  
- `session_status`: ya filtra o debe filtrar en `SessionsContext` por id del mapa — verificar y corregir si aplica status al id incorrecto.

**Por qué no** solo confiar en “un socket = una sesión”:

- `session_status` es user-wide.  
- Futuros multi-tab / multi-panel.  
- Defensa en profundidad barata.

### D7 — Tipado del client: generics en subscribe/send, sin reescribir todo ChatArea

**Decisión:**

```ts
// packages/shared
export type WsServerMessage = ...
export type WsServerMessageType = WsServerMessage["type"]

// ws-client.ts
subscribe<T extends WsServerMessageType>(
  type: T,
  handler: (data: Extract<WsServerMessage, { type: T }>) => void
): () => void

send(data: WsClientMessage): boolean
```

- Permitir overload de escape: `subscribe(type: string, handler)` marcado `@deprecated` **o** `subscribeUnsafe` para no romper `useTeam` `*` en el mismo PR.  
- **Decisión:** mantener `subscribe("*")` como API explícita `subscribeAll(handler)` tipada `unknown`, y deprecar string libre gradualmente. En este hito, `useTeam` puede migrar a lista de tipos team o seguir con `subscribeAll` temporalmente.

**Por qué no** forzar migración de los 20 call sites a Extract<> perfecto en un solo hito:

- Diff enorme, alto riesgo de romper chat.  
- El valor P0 es: typos de literales fallan typecheck en call sites migrados + schema es la verdad. Migrar ChatArea handlers a tipos mínimos (`{ type, sessionId?: string } & Record<string, unknown>`) es suficiente.

### D8 — `approval_request` schema = shape real del manager

**Decisión:** Schema:

```ts
z.object({
  type: z.literal("approval_request"),
  approval: ApprovalRequestSchema, // reutilizar o definir campos mínimos: id, username, toolName, ...
})
```

No el shape flat de docs viejos. Actualizar docs.

Si `ApprovalRequest` no está en shared, definir **campos mínimos** usados por hub/overlay (`id`, `toolName`/`tool`, `status`, `username`, `reason?`, `args?`) sin copiar toda la clase server.

### D9 — No validar egress con Zod en hot path de tokens de stream (fase 1)

**Decisión:**  

- Ingress client messages: **sí** safeParse.  
- Egress agent stream (`message_update` frecuente): **no** safeParse por mensaje en producción (CPU).  
- Egress de control (`auth_*`, `session_subscribed`, `approval_*`, `error`): opcional assert en dev (`if (import.meta. dev)` / `NODE_ENV=development`).

**Por qué:** streaming puede ser cientos de eventos/seg; parse Zod en cada uno es costo sin beneficio proporcional en fase 1. La verdad del schema sigue documentando el allowlist.

### D10 — Errores de protocolo en inglés + `code`

**Decisión:** Reemplazar string español del exec readonly (factory L365) por:

```ts
{
  type: "agent_error",
  sessionId,
  error: "Execution sessions are read-only and do not accept prompts.",
  code: "SESSION_READONLY",
}
```

**Por qué:** protocolo estable para OSS; UI puede mapear `code` a literals i18n después (hito 08/i18n). No introducir i18n framework aquí.

### D11 — No borrar legacy `ws/handler.ts` en este hito

Aunque el audit lo marcó peligroso, borrar bridges es hito 06. Aquí solo se toca `factory.ts` (ingress/egress session), shared, client ws layer, y fixes de subscribe names.

**Efecto:** `broadcastToUser` sigue `any` — aceptable; los **payloads** nuevos/documentados viven en shared para que call sites migren en 03/06.

### D12 — Versionado de protocolo

**Decisión:** Añadir constante:

```ts
export const WS_PROTOCOL_VERSION = 1 as const;
```

Opcional en `auth_success`: `{ type: "auth_success", wsId, protocolVersion: 1 }`.

**Por qué:** barato; permite negociar breaking changes después. Client puede loguear mismatch.  
**No** hacer handshake de rechazo por versión aún (no hay v2).

---

## 4. Inventario canónico de mensajes (a codificar en shared)

### 4.1 Client → Server (`WsClientMessage`)

| type | Campos mínimos | Auth required | Notas |
|------|----------------|---------------|-------|
| `auth` | `token?`, `sessionId?` (auto-subscribe opcional ya existe) | No | |
| `pong` | — | No | respuesta a `ping` |
| `session_subscribe` | `sessionId` | Sí | nombre wire real |
| `session_unsubscribe` | `sessionId` | Sí | **nuevo** |
| `prompt` | `sessionId`, `message`, `tools?`, `images?` | Sí | |
| `steer` | `sessionId`, `message` | Sí | verificar campos exactos al implementar |
| `follow_up` | `sessionId`, `message` | Sí | idem |
| `abort` | `sessionId` | Sí | |
| `compact` | `sessionId` | Sí | |
| `get_context_usage` | `sessionId` | Sí | |
| `team_join` | `teamId` | Sí | |
| `team_send` | `teamId`, `sessionId?`, `message` | Sí | alinear con `useTeam` |
| `team_abort` | `teamId`, `sessionId?` | Sí | |
| `approvals_get` | — | Sí | |
| `ui_action` | `componentId`, `action`, + payload específico | Sí | alinear AskQuestionForm/ApprovalForm |

**Eliminar del schema canónico:** `subscribe_session`, `unsubscribe_session` (nombres viejos), `approval_response` como único path (si se quiere compat, alias deprecated **no** documentado como primario).

### 4.2 Server → Client (control / product)

| type | Origen típico | Notas |
|------|---------------|-------|
| `ping` | registry heartbeat | client responde `pong` |
| `auth_success` | factory | + `protocolVersion?` |
| `auth_error` | factory | |
| `error` | factory | + `code?` |
| `session_subscribed` | factory | |
| `session_unsubscribed` | factory | **nuevo** |
| `session_status` | factory on agent_start/end | `sessionId`, `status` |
| `context_usage` | factory | `sessionId`, `contextUsage`, `sessionStats?` |
| `agent_error` | factory | `sessionId`, `error`, `code?` |
| `aborted` | factory | `sessionId` |
| `team_joined` | factory | `teamId` |
| `approvals_pending` | factory | `items` |
| `ui_action_acknowledged` | factory | `componentId` |
| `ui_action_error` | factory | `componentId`, `error` |
| `approval_request` | approval-manager | `{ approval }` |
| `approval_resolved` | approval-manager | `approvalId`, `status` |
| `attention_item_created` | ui-approval-registry | `item` |
| `attention_item_resolved` | ui-approval-registry | ids/status |
| `project_updated` | factory-tool, files routes | `project` |
| `entity-updated` | custom-tools | client también re-dispatch DOM |
| `preview_status` | preview-builder/watcher | |
| `preview_build_log` | preview-builder | |
| `preview_build_end` | preview-builder | |
| `delegation_started` | delegation-registry / agent-utils | |
| `delegation_completed` | idem | |
| `global_log` | si existe emitter; si no, no documentar | verificar al implementar; Floor lo escucha |
| `tasks_update` | update-task / decompose tools | session-scoped |

### 4.3 Server → Client (agent event bus, allowlist)

Tipos mínimos a listar (payload flexible):

`agent_start`, `agent_end`, `message_start`, `message_update`, `message_end`, `tool_execution_start`, `tool_execution_update`, `tool_execution_end`, (+ otros que `AgentSession` emita — **inventariar con grep** en `agent-session` / vendor al implementar).

Todos deberían llevar `sessionId` tras D3b cuando salen por WS de sesión.

### 4.4 Mensajes a **no** inventar

- `session_stream` (wrapper never used) — **no** reintroducir.  
- `session_updated` — no emitir (D2).  
- `tool_approval_request` como WS product event — no, salvo que el agent bus ya lo emita como type interno (entonces cae en allowlist agent, no en control).

---

## 5. Ajustes concretos (checklist)

### 5.1 Shared — contrato

- [ ] **Reescribir** `packages/shared/src/ws-messages.ts`
  - Discriminated unions client/server según §4.  
  - Export types + `WS_PROTOCOL_VERSION`.  
  - Schemas de approval/attention **mínimos** (no god objects).  
  - Agent events: allowlist `type` + `sessionId` optional/unknown passthrough.  
  - **Por qué:** única verdad OSS.  
  - **Efectos secundarios:** cualquier import futuro del schema viejo rompe compile (hoy cero imports — bajo riesgo).

- [ ] **Exportar** desde `packages/shared/src/index.ts` si no está ya exportado.

- [ ] **Tests unitarios shared** (bun/vitest según package):  
  - parse ok: `session_subscribe`, `prompt`, `ui_action`, `approval_request` shape real.  
  - parse fail: `subscribe_session` (nombre viejo) **debe fallar** (rompe silencio de typos).  
  - Justificación: el test que falla con el nombre viejo es el candado anti-regresión del bug original del Plan 10 docs.

### 5.2 Server — factory ingress/egress

- [ ] **Editar** `apps/server/src/ws/factory.ts`
  - `safeParse` de client messages (D4).  
  - Handler `session_unsubscribe` (D5).  
  - Envelope `sessionId` al reenviar agent events (D3b).  
  - `auth_success` + `protocolVersion` (D12).  
  - Error readonly en inglés + code (D10).  
  - Switch/if por `parsed.data.type` en vez de `data.type` untyped.  
  - **No** mover bloque ALWAYS_ON tools (hito 05) salvo necesidad de compilar.  
  - **Efectos secundarios:** clientes que mandaban tipos free-form dejarán de funcionar → solo el client monorepo debe quedar alineado; no hay SDK externo real aún (hito 08).

- [ ] **Editar** `apps/server/src/ws/registry.ts` solo si el heartbeat `ping` shape debe documentarse/ajustarse (hoy `{ type: "ping" }` — incluir en schema).

- [ ] **Ampliar** `apps/server/src/__tests__/ws-factory.test.ts`
  - Reject invalid message → `error` + code.  
  - `session_subscribe` ok; `subscribe_session` invalid.  
  - `session_unsubscribe` quita de registry.  
  - (Opcional) agent event reenviado incluye `sessionId`.

### 5.3 Server — alinear emitters de producto (solo si el schema exige campos)

- [ ] **Revisar** sin rewrite grande:
  - `approval-manager.ts` — ya emite shape correcto; asegurar que schema lo refleja.  
  - `ui-approval-registry.ts` — attention payloads.  
  - `delegation-registry.ts` / `agent-utils.ts` — delegation_*.  
  - preview-builder/watcher — preview_*.  
  - **No** cambiar semantics; solo renombrar si hay typo server-side (no hay evidencia de typos server en approval).

### 5.4 Client — transport

- [ ] **Editar** `apps/client/src/lib/ws-client.ts`
  - `send(msg: WsClientMessage)`  
  - `subscribe` tipado + `subscribeAll`  
  - Parse JSON: si falla, `console.warn` en dev; no `catch {}` vacío (D4 espíritu).  
  - Opcional: validar server message en dev con safeParse (no en prod hot path).  
  - **Efectos secundarios:** call sites con objetos no asignables a `WsClientMessage` fallarán typecheck → migrar call sites en este hito.

- [ ] **Editar** `apps/client/src/hooks/useWebSocket.ts`
  - Unsubscribe anterior + subscribe nuevo (D5).  
  - `send` tipado.  
  - `subscribe` tipado; wrapper que **inyecta filter de sessionId** para tipos de sesión (D6) **o** documentar que el filter vive en ChatArea — **preferible filter en el hook** para que Timeline se beneficie gratis:

  ```ts
  const subscribe = (type, handler) =>
    wsClient.subscribe(type, (data) => {
      if (isSessionScopedType(type)) {
        const sid = (data as any).sessionId;
        if (sid && sessionId && sid !== sessionId) return;
      }
      handler(data);
    });
  ```

  Lista `SESSION_SCOPED_TYPES` en shared o junto al hook (derivada del schema).

  **Por qué en el hook:** un solo lugar; ChatArea/Timeline/DelegationsPanel dejan de olvidar el filter.  
  **Efecto secundario:** tipos user-wide mal clasificados como session-scoped se tragarían eventos — por eso la lista debe ser explícita y revisada.

### 5.5 Client — fixes de nombres y muertos

- [ ] **Editar** `ProjectFloorPanel.tsx`: `approval_request`; quitar `session_updated`.  
- [ ] **Editar** `ChatArea.tsx`: quitar o justificar `tool_approval_request`; confiar en filter del hook; no reescribir streaming reducers (hito 07).  
- [ ] **Editar** `AskQuestionForm` / `ApprovalForm` / `useTeam` / `SessionsContext` / `PreviewPanel` / `DelegationsPanel` / overlays: asegurar literales asignables al schema (renames solo si typecheck lo exige).  
- [ ] **Editar** `useTeam.ts`: preferir `subscribeAll` o lista `team_*` + agent events relevantes; si se deja `*`, usar API explícita no string mágico `"*"`.

### 5.6 Docs

- [ ] **Reescribir** `docs/websocket-protocol.md` desde el inventario §4 (nombres reales, shapes reales, auth, subscribe/unsubscribe, nota sobre agent event bus).  
- [ ] Mencionar `WS_PROTOCOL_VERSION`.  
- [ ] **No** tocar README global entero (hito 08); un link desde ARCHITECTURE o docs index si existe.

### 5.7 Verificación de cierre

- [ ] `pnpm --filter shared` typecheck/build según scripts.  
- [ ] `pnpm --filter server` typecheck + tests ws + shared.  
- [ ] `pnpm --filter client` typecheck.  
- [ ] Grep candado:
  ```bash
  rg 'subscribe_session|approval_requested|session_updated' apps/ packages/ docs/
  # no hits en código vivo (docs viejos eliminados)
  rg 'session_subscribe' apps/client packages/shared  # sí hits
  ```
- [ ] Smoke manual: login → open session → prompt stream → switch session → no ghost messages; approval overlay recibe `approval_request`; Floor refresca con approval correcto.

---

## 6. Archivos a tocar (matriz)

| Archivo | Acción | Por qué | Efectos secundarios |
|---------|--------|---------|---------------------|
| `packages/shared/src/ws-messages.ts` | Reescribir | Contrato único | Rompe imports del schema viejo (hoy 0) |
| `packages/shared/src/index.ts` | Editar exports | Superficie pública | — |
| `packages/shared` test nuevo | Crear | Candado nombres | — |
| `apps/server/src/ws/factory.ts` | Editar | Ingress validate, unsubscribe, envelope, errors | Clientes free-form fallan; monorepo client se alinea |
| `apps/server/src/ws/registry.ts` | Editar menor | ping documentado | — |
| `apps/server/src/__tests__/ws-factory.test.ts` | Ampliar | Regresión protocolo | — |
| `apps/server/src/core/approvals/approval-manager.ts` | Solo si schema exige | Paridad shape | No cambiar broadcast target |
| `apps/server/src/core/ui-approval-registry.ts` | Solo si schema exige | Paridad | Hito 03 hará store |
| `apps/client/src/lib/ws-client.ts` | Editar | Tipado + parse warn | Call sites send deben tipar |
| `apps/client/src/hooks/useWebSocket.ts` | Editar | unsub + filter | Todos los consumidores del hook heredan filter |
| `apps/client/.../ProjectFloorPanel.tsx` | Editar | Fix typos | — |
| `apps/client/.../ChatArea.tsx` | Editar mínimo | Quitar dead handler | No refactor god component |
| `apps/client/.../useTeam.ts` | Editar menor | `subscribeAll` | — |
| Otros subscribe call sites | Ajuste tipos | Compile | — |
| `docs/websocket-protocol.md` | Reescribir | Verdad OSS | — |
| `apps/server/src/ws/handler.ts` | **No tocar** | Hito 06 | — |
| `ChatArea` streaming architecture | **No tocar** | Hito 07 | — |
| Attention store unificado | **No tocar** | Hito 03 | Solo nombres de eventos listos |

---

## 7. Efectos secundarios y riesgos (resumen)

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| safeParse reject mensajes que el client mandaba “de más” | Media | Inventariar todos los `wsClient.send` antes de cerrar; ampliar schema, no aflojar a z.any() |
| Filter sessionId traga eventos sin sessionId pre-deploy mixto | Media | D3b en server **antes** o **junto** al filter client; durante rollout monorepo es simultáneo |
| Unsubscribe destruye algo de más | Baja | Unsubscribe ≠ destroySession; tests registry |
| Tipado estricto explota client compile | Media | Overload deprecated temporal; migrar call sites del monorepo en el mismo hito |
| Validar agent stream con Zod en prod | Alta perf si se hiciera | D9: no hacer |
| Docs y schema divergen otra vez | Media | Nota en CONTRIBUTING (hito 08); test shared como candado |
| `entity-updated` con guión vs underscore | Baja | Schema literal exacto `"entity-updated"` como hoy |
| Doble `session_subscribe` al reconnect | Baja | Idempotente en server (ya reemplaza meta) |
| Hito 03 asume AttentionItem en shared | — | Este hito puede definir **mínimo** del item si hace falta para schema; store sigue en 03 |

---

## 8. Criterios de hecho (DoD)

1. `ws-messages.ts` describe wire real; zero usos de nombres muertos en apps/docs.  
2. Server reject de `subscribe_session` con error tipado (test).  
3. `session_unsubscribe` implementado y testeado.  
4. Agent events reenviados incluyen `sessionId`.  
5. `useWebSocket` unsub + filter session-scoped.  
6. ProjectFloor usa `approval_request`; sin `session_updated` / `approval_requested`.  
7. Client + server + shared typecheck verdes.  
8. `docs/websocket-protocol.md` alineado.  
9. No se ha “implementado de paso” hito 03/05/06.

---

## 9. Secuencia de implementación sugerida

1. Inventario final grep de `type: "` en broadcasts + `wsClient.send` + `subscribe("` (actualizar §4 si falta alguno).  
2. Reescribir `ws-messages.ts` + tests shared en rojo/verde.  
3. Server factory: parse, unsubscribe, envelope, error codes + tests.  
4. Client ws-client + useWebSocket.  
5. Fix call sites (Floor, ChatArea dead, useTeam, forms).  
6. Typecheck monorepo.  
7. Docs protocol.  
8. Smoke manual multi-sesión + approval.  
9. Marcar checkboxes.

**No** empezar hito 03 en el mismo PR salvo acuerdo.

---

## 10. Preguntas abiertas para confirmación

Defaults recomendados:

1. **¿Canonical names = wire actual (`session_subscribe`) y no el schema viejo?** → **Sí**  
2. **¿Implementar `session_unsubscribe` ahora?** → **Sí**  
3. **¿Filter de sessionId en `useWebSocket` (no solo ChatArea)?** → **Sí**  
4. **¿Envelope `sessionId` en todos los agent events al salir por WS?** → **Sí**  
5. **¿safeParse ingress en production (no solo dev)?** → **Sí** (reject invalid)  
6. **¿Zod en cada message_update de stream en prod?** → **No**  
7. **¿Eliminar subscribe `session_updated` sin emitir el evento?** → **Sí**  
8. **¿Incluir `protocolVersion` en `auth_success`?** → **Sí**  
9. **¿Migrar Attention a store en este hito?** → **No** (hito 03)

Si confirmas el hito 02 tal cual (o con deltas), el siguiente paso según tu flujo es: **implementar 01**, **implementar 02**, o **redactar hito 03** — indícalo al confirmar.
