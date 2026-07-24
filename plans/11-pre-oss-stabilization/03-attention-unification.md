# Hito 03 — Unificar Attention Hub / approvals en un solo store y resolve path

**Estado:** 📝 Redactado — pendiente de confirmación  
**Criticidad:** P0 — estado de producto fragmentado; regresiones de UX/seguridad percibida  
**Estimación relativa:** M  
**Depende de:** 02 (nombres WS correctos: `approval_request`, attention_*, `ui_action`) — **texto 02 ya aprobado**  
**No depende de:** 01 para compilar; conviene 01 si se prueba navegación a sesiones de team  
**Bloquea conceptualmente:** parte de hito 07 (menos lógica en overlays) y claridad OSS del “Attention Hub”

---

## 1. Problema (evidencia)

### 1.1 Tres superficies, dos fuentes de verdad, dos transports de resolve

| Superficie | Archivo | Hydrate | WS in | Resolve out | Filtro |
|------------|---------|---------|-------|-------------|--------|
| **Global overlay** (cards esquina) | `GlobalApprovalOverlay.tsx` | `GET /api/approvals` | `approval_request`, `approval_resolved` | `POST /api/approvals/:id` | Excluye `ask_question` / `type===question` |
| **Attention Hub** (campana TopBar) | `AttentionHubPopover.tsx` | mismo GET | + `attention_item_created/resolved` | mismo POST (solo approve/deny en UI) | Muestra todo; questions solo “ir a sesión” |
| **Inline chat** | `AskQuestionForm`, `ApprovalForm`, `ToolCallRow` | estado del mensaje/tool result | `ui_action_error`; stream de agente | **`wsClient.send({ type: "ui_action" })`** | Session-local |

### 1.2 Backend ya unifica el listado REST, no el modelo mental client

```13:23:apps/server/src/routes/approvals.ts
// GET merges:
// - approvalManager.getAll → type: "approval"
// - uiApprovalRegistry.getAll → type: "question"  (¡siempre "question", aunque el registry tenga ui_action!)
```

Problemas server colaterales:

1. **`type` aplanado mal en GET:** `uiApprovalRegistry` items con `type: "ui_action"` se re-mapean a `"question"` en el router (L19–22). El hub/overlay pierden la distinción ui_action vs question en hydrate REST.  
2. **Dos registries** (`approvalManager` vs `uiApprovalRegistry`) son legítimos en server (security gate vs UI pause), pero el **client** no debe reimplementar merge + dedupe + optimistic remove en cada componente.  
3. **Resolve REST** ya prueba ambos registries (L34–36) — buen patrón; el client debería tener **un** wrapper que llame eso para approvals de seguridad, y un path claro para `ui_action` WS.

### 1.3 Duplicación de estado y condiciones de carrera

- Overlay y Hub hacen **cada uno** `useState` + `fetchItems` + 2–4 subscriptions WS + optimistic `filter` local.  
- Resolver en overlay no actualiza hub hasta próximo evento/fetch (y viceversa) si el WS `approval_resolved` se pierde o el optimistic solo corre en un sitio.  
- En la práctica ambos escuchan `approval_resolved`, pero:
  - fallos de red en POST dejan UI inconsistente (optimistic remove en uno, error solo `console.error`);  
  - no hay toast unificado de fallo;  
  - reconnect refetch duplicado.

### 1.4 Tipos locales divergentes

```ts
// AttentionHubPopover
export interface AttentionItem {
  approvalId, username, sessionId, toolName, args, reason, expiresAt,
  type?: "question" | "approval" | "ui_action"
}

// GlobalApprovalOverlay
interface ApprovalRequest {
  approvalId, username, sessionId, parentSessionId?, toolName, args, reason,
  expiresAt, status: "pending" | ...
}
```

Ninguno vive en `packages/shared`. El GET devuelve union ad hoc.

### 1.5 Navegación frágil

Hub: `onNavigate(\`/session/${item.sessionId}\`)` — **no** usa `getSessionPath` / contexto project/agent/team. Usuario puede aterrizar en ruta global incorrecta (regresión de deep-link post-Attention Hub).

### 1.6 Producto ya decidió (no reabrir)

- `ask_question` **inline** en chat (no modal global de pregunta).  
- Overlay global = **security approvals** (bash peligroso, etc.), no questions.  
- Hub = **índice** de todo lo pendiente + badge + navigate; approve/deny rápido para no-questions.

Este hito **consolida implementación**, no cambia esa UX de producto.

### 1.7 i18n / copy

Hub y overlay mezclan ES hardcodeado (“Centro de Atención”, “Denegar”, “Aprobar”). Fuera de alcance i18n completo (hito 08), pero el store no debe contener strings de UI — solo datos. Al tocar componentes, mover strings a `.literals.ts` **mínimo EN** si se edita el bloque (opcional recomendado, no bloqueante del DoD de store).

---

## 2. Objetivo del hito

1. Un **`AttentionStore`** (client) = única fuente de pending items.  
2. Un **tipo `AttentionItem`** en `packages/shared` (Zod + type) alineado con GET `/api/approvals` y eventos WS del hito 02.  
3. Un **`resolveAttention` API module** que encapsule:
   - security/tool approval → `POST /api/approvals/:id`
   - inline question/ui → `ui_action` por WS (sigue en forms; el store se entera por eventos resolved)
4. **Overlay + Hub** se convierten en vistas puras (select + actions).  
5. **Inline forms** siguen renderizando en chat; al resolver, el store se actualiza vía WS (`attention_item_resolved` / tool result) sin segundo fetch obligatorio.  
6. Corregir **mapeo `type` en GET** server para no pisar `ui_action`.  
7. Navegación del hub vía helper de rutas de sesión (mejor esfuerzo con metadata disponible).

**Fuera de alcance:**

- Fusionar `approvalManager` + `uiApprovalRegistry` en un solo class server (posible hito 06/07; aquí solo contrato de listado + client store).  
- Reescribir `ToolCallRow` god file.  
- Permission engine / persist policies de “always allow”.  
- DI ServerContext.  
- i18n completo de toda la app.

---

## 3. Decisiones de diseño (justificadas)

### D1 — Store en client, no “nuevo microservicio”

**Decisión:** Módulo client `apps/client/src/lib/attention/attention-store.ts` (+ hook `useAttention()`), patrón similar a un mini-store (subscribe/getState/setState) **sin** añadir Redux/Zustand dependency salvo que ya exista en el repo.

**Verificación previa al implementar:** grep `zustand`/`jotai`/`valtio` en client. Si no hay, **vanilla store + useSyncExternalStore** (React 19 friendly, zero deps).

**Por qué no** Context-only con provider gigante:

- Overlay y Hub y futuros paneles necesitan el mismo estado sin nesting frágil en `MainLayout`.  
- `useSyncExternalStore` evita stale closures y es testeable sin RTL obligatorio.

**Por qué no** solo React Query:

- No está en el stack actual de forma central; introducir RQ solo para esto es scope creep (hito 15 de auditoría → 08/07). El store puede llamar `apiFetch` internamente.

### D2 — Modelo de dominio único `AttentionItem`

**Decisión:** En `packages/shared` (schemas o `attention.ts`):

```ts
AttentionKind = "approval" | "question" | "ui_action"

AttentionItemSchema = z.object({
  approvalId: z.string(),       // = toolCallId en ambos registries
  username: z.string().optional(), // puede omitirse en client view
  sessionId: z.string(),
  parentSessionId: z.string().optional(),
  projectId: z.string().optional(),  // si el server lo tiene o se enriquece después
  agentId: z.string().optional(),
  teamId: z.string().optional(),
  toolName: z.string(),
  args: z.record(z.unknown()).default({}),
  reason: z.string().optional().default(""),
  expiresAt: z.number().optional(),
  status: z.enum(["pending","approved","denied","timeout","cancelled"]).optional(),
  kind: AttentionKind,          // canónico; no opcional en wire normalizado
})
```

**Normalización:** campo canónico **`kind`** (no `type`) para no chocar con WS `type: "approval_request"`.

**Mapeo desde server actual:**

| Fuente | kind |
|--------|------|
| approvalManager item | `approval` |
| uiApprovalRegistry `type=== "question"` o tool ask_question | `question` |
| uiApprovalRegistry `type=== "ui_action"` | `ui_action` |

**Por qué `kind` y no reusar `type`:** en JSON de eventos WS, `type` ya es el discriminador de mensaje. Items embebidos deben usar otro nombre para no confudir parsers.

**Efecto secundario:** client deja de mirar `item.type` y `toolName === "ask_question"` como única señal — se puede mantener fallback de normalización por un release.

### D3 — Corregir GET `/api/approvals` en el mismo hito

**Decisión:** Editar `routes/approvals.ts`:

```ts
const security = approvalManager.getAll(username).map((a) => ({
  ...a,
  kind: "approval" as const,
}));
const uiItems = uiApprovalRegistry.getAll(username).map((q) => ({
  ...q,
  kind: q.type === "ui_action" ? "ui_action" : "question",
}));
return c.json({ pending: normalize([...security, ...uiItems]) });
```

- Mantener **compat**: seguir enviando `type` como alias de `kind` **o** de legacy `"approval"|"question"` durante transición.  
  - **Elegido:** enviar **ambos** `kind` (canónico) y `type` (= kind) para no romper readers intermedios; deprecar lectura de `type` en client store con normalizer.

**Por qué tocar server aquí y no “solo client”:** el bug de remap a siempre `"question"` es server; el client no puede distinguir ui_action en hydrate.

**Resolver schema:** mover `ResolveApprovalSchema` a shared (opcional este hito; **recomendado sí** si se crea `approvalsApi`).

### D4 — Un solo hydrate + WS reducer en el store

**Decisión:** `attentionStore` expone:

| Método | Rol |
|--------|-----|
| `hydrate()` | GET `/api/approvals` → replace/merge pending |
| `start()` / `stop()` | registrar WS listeners una vez (ref-count o boot desde MainLayout) |
| `getSnapshot()` | lista pending |
| `subscribe(listener)` | para hook |
| `resolveApproval(id, action, payload?)` | POST + optimistic remove + rollback on fail |
| selectores | `getSecurityApprovals()`, `getAll()`, `getBySession(sessionId)` |

**WS handlers (nombres post-hito 02):**

| Evento | Reducer |
|--------|---------|
| `approval_request` | upsert `normalize(data.approval)` con `kind: "approval"` (salvo toolName ask_question edge) |
| `approval_resolved` | remove by approvalId |
| `attention_item_created` | upsert normalize(data.item) |
| `attention_item_resolved` | remove by approvalId |
| reconnect `connected` | `hydrate()` |

**Por qué un solo `start()`:** evita N componentes × M subscriptions. MainLayout o un `AttentionRuntime` montado una vez llama `start()`.

### D5 — Overlay y Hub como vistas; no eliminar overlay

**Decisión de producto preservada:**

- **Overlay:** `items.filter(i => i.kind === "approval")` — cards flotantes para seguridad.  
- **Hub:** todos los kinds; questions → CTA navigate only; approvals → approve/deny + navigate.  
- **Inline:** sin cambio de responsabilidad de render.

**Por qué no** matar el overlay y dejar solo hub:

- Approvals de seguridad requieren interrupción visual fuerte (bottom-left cards); el hub es pull. Producto actual es correcto; solo compartían estado mal.

**Por qué no** meter questions en overlay otra vez:

- Decisión explícita previa del proyecto (desacoplar ask_question de modales globales). No revertir.

### D6 — Resolve paths: no unificar transport del todo

**Hecho:** security approvals y ui registry **sí** se resuelven por REST `POST /api/approvals/:id` (router ya prueba ambos).

**Inline forms** usan WS `ui_action` porque el factory WS completa el tool call en la sesión en curso (flujo distinto al approvalManager promise).

**Decisión:**

1. `attentionApi.resolve(id, body)` → REST para hub/overlay y cualquier resolve “desde fuera del chat”.  
2. Inline `AskQuestionForm` / `ApprovalForm` **siguen** mandando `ui_action` por WS (no reescribir a REST en este hito salvo que se verifique paridad total en factory).  
3. Tras `ui_action` exitoso, server ya emite `attention_item_resolved` → store remove. Si no emitiera en algún path, **bugfix** en server al implementar (verificar `ui-approval-registry.resolve`).

**Por qué no** forzar inline a REST ahora:

- Riesgo de regresión en completion del tool loop (factory `ui_action` handler vs HTTP).  
- Valor del hito es **una lista pending**, no un solo socket.

**Por qué no** forzar hub questions a rellenar el form remoto:

- Questions se responden en contexto del chat (opciones/custom). Hub solo navega — correcto.

### D7 — Optimistic updates con rollback

**Decisión:** En `resolveApproval`:

1. snapshot prev  
2. remove optimista  
3. POST  
4. si !ok → restore snapshot + toast error  
5. si ok → confiar también en WS (idempotent remove)

**Por qué:** hoy `console.error` y a veces remove optimista sin rollback → item fantasma ausente o presente.

### D8 — Navegación: usar session path builder cuando se pueda

**Decisión:** `navigateToAttention(item)`:

- Si hay `teamId` / `agentId` / `projectId` en el item → `getSessionPath(sessionId, context)`.  
- Si no → `/session/${sessionId}` (fallback actual) **o** fetch metadata de sesión una vez.

**Enriquecimiento server (recomendado ligero):** al construir pending en GET, adjuntar `projectId/agentId/teamId` desde `sessionManager.metadataStore.getSessionMetadata(username, sessionId)` si existe.

**Por qué en server:** una sola lectura FS/metadata; todos los clients se benefician.  
**Efecto secundario:** GET approvals un poco más lento (N metadata reads); N suele ser pequeño (pending count). Cache no necesaria aún.

### D9 — No meter AttentionStore en shared/sdk

**Decisión:** Store es **client-only**. Shared solo tipos/schemas + maybe event payload types (hito 02).

**Por qué:** React/`useSyncExternalStore` no pertenecen al core server ni al SDK headless.

### D10 — Tests

**Decisión:**

1. **Unit** pure functions: `normalizeAttentionItem`, reducer actions (add/resolve/hydrate merge) en `attention-store.test.ts` (vitest client — **añadir vitest dep si falta**, o testear con bun si el monorepo lo permite para archivos pure TS sin DOM).  
2. Preferir **lógica pure en `.ts` sin React** para poder testear con bun desde server package o un test en client si vitest está disponible.  
3. Server: test GET approvals devuelve `kind: "ui_action"` cuando registry lo dice (mock registries).

**Por qué pure ts:** client hoy tiene 0 tests; bloquear el hito en setup completo de vitest+RTL es riesgo. Mínimo: pure reducer tests.

### D11 — Literals / idioma

**Decisión:** Al editar Hub/Overlay, si se tocan strings visibles, extraer a `AttentionHubPopover.literals.ts` / `GlobalApprovalOverlay.literals.ts` con al menos `en` (y `es` si el patrón del repo es bilingual). **No** bloquear DoD si solo se cablea store y se dejan strings existentes.

### D12 — Relación con hito 02

Si al implementar 03 el 02 **aún no está mergeado**:

- Usar nombres de eventos **wire reales** (`approval_request`, etc.) ya acordados en 02.  
- Importar tipos desde shared solo si 02 ya exportó schemas de approval; si no, definir `AttentionItem` en shared en 03 y 02 los reutiliza (orden ideal: **02 schemas de eventos incluyen payload approval mínimo; 03 añade AttentionItem canónico y normalizers**).

**Orden de implementación de código recomendado del plan 11:** 01 → 02 → 03.  
**Orden de redacción:** ya 01✓ 02✓ 03 este doc.

---

## 4. Ajustes concretos (checklist)

### 4.1 Shared

- [ ] **Crear o extender** `packages/shared/src/attention.ts` (o sección en schemas)
  - `AttentionKindSchema`, `AttentionItemSchema`, `AttentionPendingResponseSchema` (`{ pending: AttentionItem[] }`)
  - `ResolveAttentionSchema` (mover desde route)
  - Export desde index
  - **Por qué:** contrato OSS + client/server align  
  - **Efectos:** versionado de package workspace; client debe depender de shared (ya lo hace)

### 4.2 Server

- [ ] **Editar** `apps/server/src/routes/approvals.ts`
  - Emitir `kind` correcto; no forzar ui items a `question`
  - Usar schema shared para resolve
  - Enriquecer metadata de sesión (D8) opcional pero **recomendado en checklist**
  - Auth ya aplicado

- [ ] **Editar** `apps/server/src/core/ui-approval-registry.ts` / `approval-manager.ts` solo si hace falta alinear campos (`reason`, ids) al schema — **sin** cambiar semántica de broadcast names (hito 02)

- [ ] **Test** server: mapeo kind + merge pending (nuevo archivo o ampliar existente)

### 4.3 Client — core attention module

- [ ] **Crear** `apps/client/src/lib/attention/normalize.ts` — pure  
- [ ] **Crear** `apps/client/src/lib/attention/attention-store.ts` — store + start/stop  
- [ ] **Crear** `apps/client/src/lib/attention/attention-api.ts` — `fetchPending`, `resolve`  
- [ ] **Crear** `apps/client/src/hooks/useAttention.ts` — `useSyncExternalStore`  
- [ ] **Crear** tests pure `normalize` + reducer  
- [ ] **Montar** `attentionStore.start()` una vez:
  - Preferible: `MainLayout.tsx` o pequeño `AttentionProvider` children-less effect  
  - **Por qué MainLayout:** ya monta overlay/hub  
  - **Efecto:** asegurar un solo start (guard internal)

### 4.4 Client — vistas

- [ ] **Reescribir fino** `GlobalApprovalOverlay.tsx`
  - `const approvals = useAttention(s => s.items.filter(i => i.kind === "approval"))`
  - resolve → `attentionStore.resolveApproval`
  - Sin fetch/ws local
  - **Efectos:** UI idéntica; menos código

- [ ] **Reescribir fino** `AttentionHubPopover.tsx`
  - consume store
  - navigate helper D8
  - resolve approvals via store
  - questions: navigate only
  - Export de `AttentionItem` **desde shared**, no desde el popover (breaking menor: si algo importaba el type del popover, re-export deprecated desde popover por un momento)

- [ ] **Verificar** dónde se montan Hub y Overlay (TopBar / MainLayout) — no duplicar mount del runtime

### 4.5 Client — inline forms

- [ ] **AskQuestionForm / ApprovalForm:**  
  - **No** obligar a usar store para submit.  
  - Opcional: al mount, no añadir item duplicado (store ya lo tiene por attention_item_created).  
  - Asegurar que errores siguen por `ui_action_error`.  
  - Si tras submit no llega resolved event, **fix server** no silenciar en client con fake remove.

### 4.6 ProjectFloor / otros

- [ ] Si Floor refetch por `approval_request`, puede quedarse; opcionalmente usar `useAttention` count — **no requerido**. Evitar tercer state.

### 4.7 Verificación

- [ ] typecheck shared + client + server  
- [ ] tests pure + server kind mapping  
- [ ] Smoke manual:
  1. Trigger security approval → aparece overlay **y** badge hub; resolve en uno desaparece en ambos  
  2. `ask_question` → **no** overlay; sí hub badge; inline form en chat; submit → badge baja  
  3. Reconnect WS → hydrate coherente  
  4. Navigate desde hub a sesión correcta (con metadata si se enriqueció)  
- [ ] Grep: no debe haber `apiFetch("/api/approvals")` fuera de `attention-api.ts`

---

## 5. Archivos a tocar (matriz)

| Archivo | Acción | Por qué | Efectos secundarios |
|---------|--------|---------|---------------------|
| `packages/shared/src/attention.ts` (nuevo) o `schemas.ts` | Crear/editar | Tipo canónico | Preferir archivo nuevo para no hinchar schemas god (P2 audit) |
| `packages/shared/src/index.ts` | Export | — | — |
| `apps/server/src/routes/approvals.ts` | Editar | kind correcto + schema + enrich | Clients viejos que solo leían type=question para ui_action: monorepo único OK |
| `apps/server/src/core/session/metadata-store.ts` | Solo lectura desde route | enrich | Acoplamiento route→metadata; aceptable |
| `apps/server/src/__tests__/approvals-route.test.ts` o similar | Crear | candado kind | mocks |
| `apps/client/src/lib/attention/*` | Crear | store único | — |
| `apps/client/src/hooks/useAttention.ts` | Crear | React binding | — |
| `apps/client/src/components/approvals/GlobalApprovalOverlay.tsx` | Editar | vista | — |
| `apps/client/src/components/approvals/AttentionHubPopover.tsx` | Editar | vista | type export path |
| `apps/client/src/components/layout/MainLayout.tsx` (o TopBar) | Editar menor | start() | doble start si mal guard |
| `AskQuestionForm.tsx` / `ApprovalForm.tsx` | Editar mínimo o no | verificar events | no rewrite |
| `packages/shared/ws-messages.ts` | Solo si 02 no definió payloads | paridad | coordinar con 02 |
| `ToolCallRow.tsx` | **No** (salvo import type) | god file hito 07 | — |
| `approval-manager.ts` internals | **No** merge registries | — | — |

---

## 6. Efectos secundarios y riesgos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Doble `start()` del store | Media | guard `started` + ref-count |
| Optimistic remove + WS reorder | Baja | idempotent remove by id |
| GET enrich lento | Baja | solo pending; try/catch por item |
| Romper import `AttentionItem` desde popover | Baja | re-export temporal |
| Inline ui_action no limpia hub | Alta percibida | verificar broadcast resolved en registry; test manual 2 |
| Confundir `kind` con WS `type` en normalize | Media | tests normalize |
| Overlay vacío por filter kind mal normalizado | Alta | tests + smoke 1 |
| Scope creep a i18n/ToolCallRow | — | checklist lo prohíbe |
| Implementar sin hito 02 | Media | usar wire names reales; no `approval_requested` |

---

## 7. Criterios de hecho (DoD)

1. Un solo módulo client hace fetch + WS de attention/approvals.  
2. Overlay y Hub no tienen `useState` propio de lista pending ni `apiFetch("/api/approvals")` directo.  
3. `AttentionItem` + `kind` viven en shared; GET devuelve `kind` correcto para ui_action.  
4. Resolve desde hub/overlay con rollback y sin item zombie en la otra superficie.  
5. ask_question no aparece en overlay; sí en hub; inline intacto.  
6. Tests pure normalize/reducer + test server kind.  
7. typecheck OK.  
8. Grep limpio de fetch approvals duplicado.  
9. No se implementó de paso hito 04–07.

---

## 8. Secuencia de implementación sugerida

1. Shared `AttentionItem` + Resolve schema.  
2. Fix GET approvals + test kind + enrich metadata.  
3. `normalize` + store + api + tests pure.  
4. `useAttention` + start en layout.  
5. Refactor Overlay → store.  
6. Refactor Hub → store + navigate.  
7. Smoke manual 1–4.  
8. Grep + typecheck.  
9. Marcar checkboxes del plan.

**No** abrir hito 04 en el mismo PR.

---

## 9. Preguntas abiertas para confirmación

Defaults recomendados:

1. **¿Store vanilla + `useSyncExternalStore` (sin Zustand)?** → **Sí**  
2. **¿Campo canónico `kind` en shared?** → **Sí**  
3. **¿Fix GET server para no marcar todo UI como `question`?** → **Sí**  
4. **¿Enriquecer projectId/agentId/teamId en GET desde metadata?** → **Sí**  
5. **¿Mantener overlay + hub (no matar overlay)?** → **Sí**  
6. **¿Inline forms siguen en `ui_action` WS?** → **Sí**  
7. **¿Fusionar approvalManager + uiApprovalRegistry en server?** → **No** (este hito)  
8. **¿i18n completo de hub?** → **No bloqueante**; literals si se toca copy  

Al confirmar este texto, el siguiente según tu flujo puede ser: **redactar hito 04** (seguridad mínima), o **empezar implementación 01→02→03**.
