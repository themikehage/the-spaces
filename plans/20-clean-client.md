# Plan 20 — Limpiar Cliente (Integrar v2, Eliminar Componentes Legacy)

> Elimina duplicaciones de infraestructura en el cliente y reduce componentes core de chat a < 300 líneas. Cada tarea tiene criterios de aceptación inamovibles según `skills/criterios-de-aceptacion-verificables.md`.

---

## Contexto

La auditoría del cliente reveló una isla `/v2` con componentes limpios y hooks nuevos, mientras el 100% del tráfico real usa componentes legacy con `lib/api.ts` (49 consumidores), `lib/ws-client.ts` (3 consumidores), y `SessionsContext` viejo.

**Rol en el plan general**: este plan cierra la brecha del frontend. Elimina la duplicación de infraestructura (apiFetch, WsClient, hooks, componentes core de chat). NO migra páginas avanzadas — eso es Plan 21.

---

## Tareas — Infraestructura

### Tarea 20.1 — Unificar `apiFetch`

**Acción**: Reescribir `lib/api.ts` con la firma tipada del nuevo `api/client.ts`: `apiFetch<T>(path, init?) → Promise<T>` con JSON parseado y `ApiError`. Eliminar `api/client.ts`. Migrar `useChat.ts` y `useSessions.ts` a importar de `lib/api.ts`.

**Archivos**: `lib/api.ts` (reescribir), `api/client.ts` (borrar), `hooks/useChat.ts`, `hooks/useSessions.ts`

**Criterios de aceptación**:

```bash
# AC1: api/client.ts no existe (unificado en lib/api.ts)
ls apps/client/src/api/client.ts 2>&1
# Resultado esperado: "No such file or directory"

# AC2: Nadie importa de @/api/client
rg "from ['\"]@/api/client['\"]" apps/client/src/ --type ts
# Resultado esperado: 0 matches

# AC3: lib/api.ts exporta apiFetch con genérico <T>
rg "export.*function apiFetch.*<T>" apps/client/src/lib/api.ts
# Resultado esperado: al menos 1 match

# AC4: lib/api.ts exporta ApiError
rg "export.*class ApiError" apps/client/src/lib/api.ts
# Resultado esperado: al menos 1 match

# AC5: lib/api.ts NO devuelve Response crudo (devuelve T)
rg "Promise<Response>" apps/client/src/lib/api.ts
# Resultado esperado: 0 matches

# AC6: TypeScript compila sin errores
pnpm --filter @spaces/client typecheck
# Resultado esperado: exit code 0
```

---

### Tarea 20.2 — Unificar `WsClient`

**Acción**: Reescribir `lib/ws-client.ts` con el `WsClient` de `api/ws.ts` (conexión a `/ws`, `AgentEvent` types, reconexión). Eliminar `api/ws.ts`. Migrar `useWebSocket.ts`, `attention-store.ts`, `useConnectionAware.ts`, `useTeam.ts` a la nueva API.

**Archivos**: `lib/ws-client.ts` (reescribir), `api/ws.ts` (borrar), `hooks/useWebSocket.ts`, `lib/attention/attention-store.ts`, `hooks/useConnectionAware.ts`, `hooks/useTeam.ts`

**Criterios de aceptación**:

```bash
# AC1: api/ws.ts no existe (unificado en lib/ws-client.ts)
ls apps/client/src/api/ws.ts 2>&1
# Resultado esperado: "No such file or directory"

# AC2: Nadie importa de @/api/ws
rg "from ['\"]@/api/ws['\"]" apps/client/src/ --type ts
# Resultado esperado: 0 matches

# AC3: lib/ws-client.ts exporta WsClient (clase o factory)
rg "export.*class WsClient\|export.*WsClient" apps/client/src/lib/ws-client.ts
# Resultado esperado: al menos 1 match

# AC4: WsClient usa AgentEvent de @spaces/core (no tipos legacy)
rg "AgentEvent" apps/client/src/lib/ws-client.ts
# Resultado esperado: al menos 1 match

# AC5: WsClient NO se conecta a /ws/v2
rg "/ws/v2" apps/client/src/lib/ws-client.ts
# Resultado esperado: 0 matches

# AC6: Los consumidores legacy fueron migrados (no importan api/ws viejo)
for f in "attention/attention-store" "useConnectionAware" "useTeam"; do
  rg "from ['\"].*api/ws" "apps/client/src/$f.ts" -q && echo "STILL OLD: $f" || echo "MIGRATED: $f"
done
# Resultado esperado: 3 "MIGRATED"

# AC7: TypeScript compila sin errores
pnpm --filter @spaces/client typecheck
# Resultado esperado: exit code 0
```

---

### Tarea 20.3 — Unificar gestión de sesiones

**Acción**: Reescribir `SessionsContext` para que use `useSessions` internamente. Mantener interfaz pública (`SessionsProvider`, `useSessions` context) para no romper consumidores.

**Archivos**: `contexts/SessionsContext.tsx`, `hooks/useSessions.ts`

**Criterios de aceptación**:

```bash
# AC1: SessionsContext.tsx importa de useSessions (usa la nueva lógica)
rg "from ['\"].*hooks/useSessions" apps/client/src/contexts/SessionsContext.tsx
# Resultado esperado: al menos 1 match

# AC2: SessionsContext.tsx NO usa el viejo lib/api directamente
rg "from ['\"]@/lib/api['\"]" apps/client/src/contexts/SessionsContext.tsx
# Resultado esperado: 0 matches

# AC3: SessionsContext.tsx < 150 líneas
wc -l apps/client/src/contexts/SessionsContext.tsx
# Resultado esperado: < 150

# AC4: useSessions.ts < 120 líneas (no creció)
wc -l apps/client/src/hooks/useSessions.ts
# Resultado esperado: < 120

# AC5: TypeScript compila sin errores
pnpm --filter @spaces/client typecheck
# Resultado esperado: exit code 0
```

---

## Tareas — Componentes Core de Chat

### Tarea 20.4 — Reemplazar `ChatArea.tsx` (927 → < 300 líneas)

**Acción**: Reemplazar por versión v2 (51 líneas) + features necesarios: tool calls inline, attachments, model selector. Migrar features uno a uno.

**Archivos**: `components/chat/ChatArea.tsx`

**Criterios de aceptación**:

```bash
# AC1: ChatArea.tsx < 300 líneas
wc -l apps/client/src/components/chat/ChatArea.tsx
# Resultado esperado: < 300

# AC2: ChatArea.tsx importa useChat del nuevo hook
rg "from ['\"].*hooks/useChat" apps/client/src/components/chat/ChatArea.tsx
# Resultado esperado: al menos 1 match

# AC3: ChatArea.tsx NO importa del viejo lib/api
rg "from ['\"]@/lib/api['\"]" apps/client/src/components/chat/ChatArea.tsx
# Resultado esperado: 0 matches

# AC4: ChatArea.tsx NO importa del viejo lib/ws-client
rg "from ['\"]@/lib/ws-client['\"]" apps/client/src/components/chat/ChatArea.tsx
# Resultado esperado: 0 matches

# AC5: TypeScript compila sin errores
pnpm --filter @spaces/client typecheck
# Resultado esperado: exit code 0
```

---

### Tarea 20.5 — Reemplazar `MessageList.tsx` (852 → < 300 líneas)

**Acción**: Versión v2 (40 líneas) + scroll automático + renderizado de tool calls. Extraer tool call rendering a `ToolCallCard.tsx` (< 150 líneas).

**Archivos**: `components/chat/MessageList.tsx`, `components/chat/ToolCallCard.tsx` (nuevo)

**Criterios de aceptación**:

```bash
# AC1: MessageList.tsx < 300 líneas
wc -l apps/client/src/components/chat/MessageList.tsx
# Resultado esperado: < 300

# AC2: ToolCallCard.tsx existe y tiene < 150 líneas
wc -l apps/client/src/components/chat/ToolCallCard.tsx
# Resultado esperado: < 150

# AC3: MessageList.tsx importa ToolCallCard
rg "ToolCallCard" apps/client/src/components/chat/MessageList.tsx
# Resultado esperado: al menos 1 match

# AC4: TypeScript compila sin errores
pnpm --filter @spaces/client typecheck
# Resultado esperado: exit code 0
```

---

### Tarea 20.6 — Reemplazar `ChatInput.tsx` (659 → < 300 líneas)

**Acción**: Versión v2 (70 líneas) + toolbar de attachments + model selector (extraído a prop). Extraer toolbar a `ChatToolbar.tsx` (< 100 líneas).

**Archivos**: `components/chat/ChatInput.tsx`, `components/chat/ChatToolbar.tsx` (nuevo)

**Criterios de aceptación**:

```bash
# AC1: ChatInput.tsx < 300 líneas
wc -l apps/client/src/components/chat/ChatInput.tsx
# Resultado esperado: < 300

# AC2: ChatToolbar.tsx existe y tiene < 100 líneas
wc -l apps/client/src/components/chat/ChatToolbar.tsx
# Resultado esperado: < 100

# AC3: ChatInput.tsx importa ChatToolbar
rg "ChatToolbar" apps/client/src/components/chat/ChatInput.tsx
# Resultado esperado: al menos 1 match

# AC4: TypeScript compila sin errores
pnpm --filter @spaces/client typecheck
# Resultado esperado: exit code 0
```

---

### Tarea 20.7 — Descomponer `MainLayout.tsx` (804 líneas)

**Acción**: Descomponer en `AppShell.tsx` (< 100 líneas), `AppSidebar.tsx` (< 150), `AppHeader.tsx` (< 100). Mantener soporte de mobile.

**Archivos**: `components/layout/AppShell.tsx` (nuevo), `AppSidebar.tsx` (nuevo), `AppHeader.tsx` (nuevo), `components/layout/MainLayout.tsx` (borrar)

**Criterios de aceptación**:

```bash
# AC1: MainLayout.tsx no existe (descompuesto)
ls apps/client/src/components/layout/MainLayout.tsx 2>&1
# Resultado esperado: "No such file or directory"

# AC2: AppShell.tsx existe y tiene < 100 líneas
wc -l apps/client/src/components/layout/AppShell.tsx
# Resultado esperado: < 100

# AC3: AppSidebar.tsx existe y tiene < 150 líneas
wc -l apps/client/src/components/layout/AppSidebar.tsx
# Resultado esperado: < 150

# AC4: AppHeader.tsx existe y tiene < 100 líneas
wc -l apps/client/src/components/layout/AppHeader.tsx
# Resultado esperado: < 100

# AC5: Nadie importa MainLayout
rg "from ['\"].*MainLayout['\"]" apps/client/src/ --type ts
# Resultado esperado: 0 matches

# AC6: AppShell se importa en el router o App.tsx
rg "AppShell" apps/client/src/router/ apps/client/src/App.tsx --type ts
# Resultado esperado: al menos 1 match

# AC7: TypeScript compila sin errores
pnpm --filter @spaces/client typecheck
# Resultado esperado: exit code 0
```

---

## Tareas — Eliminar `/v2` Island

### Tarea 20.8 — Eliminar ruta `/v2`

**Acción**: Quitar `Layout` (22 líneas) y sus hijos del router. Eliminar cualquier referencia a `/v2`.

**Archivos**: `router/routes.tsx`, `App.tsx`

**Criterios de aceptación**:

```bash
# AC1: No existe ruta /v2 en el router
rg "/v2" apps/client/src/router/ --type ts
# Resultado esperado: 0 matches

# AC2: Layout (v2) no se importa en el router ni App.tsx
rg "from ['\"].*components/Layout['\"]" apps/client/src/router/ apps/client/src/App.tsx --type ts
# Resultado esperado: 0 matches

# AC3: TypeScript compila sin errores
pnpm --filter @spaces/client typecheck
# Resultado esperado: exit code 0
```

---

### Tarea 20.9 — Eliminar componentes v2 huérfanos

**Acción**: Borrar los 7 componentes v2 que ya fueron mergeados a sus contrapartes legacy.

**Archivos a borrar**: `components/Layout.tsx`, `components/ChatArea.tsx`, `components/ChatInput.tsx`, `components/MessageList.tsx`, `components/MessageBubble.tsx`, `components/Markdown.tsx`, `components/SessionList.tsx`

**Criterios de aceptación**:

```bash
# AC1: Ninguno de los 7 archivos v2 existe
for f in "Layout" "ChatArea" "ChatInput" "MessageList" "MessageBubble" "Markdown" "SessionList"; do
  ls "apps/client/src/components/$f.tsx" 2>&1 | rg -q "No such file" && echo "DELETED: $f" || echo "STILL EXISTS: $f"
done
# Resultado esperado: 7 "DELETED"

# AC2: Nadie importa de los componentes v2 eliminados
for f in "Layout" "ChatArea" "ChatInput" "MessageList" "MessageBubble" "Markdown" "SessionList"; do
  count=$(rg -c "from ['\"].*components/$f['\"]" apps/client/src/ --type ts 2>/dev/null || echo 0)
  echo "$f: $count imports"
done
# Resultado esperado: 0 para cada uno

# AC3: TypeScript compila sin errores
pnpm --filter @spaces/client typecheck
# Resultado esperado: exit code 0
```

---

## Verificación Global

```bash
# VG1: Cero imports de archivos eliminados (api/client, api/ws, MainLayout, componentes v2)
for path in "@/api/client" "@/api/ws" "MainLayout" "components/Layout" "components/ChatArea" "components/ChatInput" "components/MessageList" "components/MessageBubble" "components/Markdown" "components/SessionList"; do
  count=$(rg -c "from ['\"].*$path" apps/client/src/ --type ts 2>/dev/null || echo 0)
  echo "$path: $count"
done
# Resultado esperado: 0 para todos

# VG2: Componentes core < 300 líneas
for f in "chat/ChatArea" "chat/MessageList" "chat/ChatInput" "layout/AppShell" "layout/AppSidebar" "layout/AppHeader"; do
  lines=$(wc -l < "apps/client/src/components/$f.tsx" 2>/dev/null || echo "MISSING")
  echo "$f: $lines"
done
# Resultado esperado: todos < 300 y no "MISSING"

# VG3: Solo existe un apiFetch (en lib/api.ts)
rg -l "export.*function apiFetch\|export const apiFetch" apps/client/src/ --type ts
# Resultado esperado: 1 archivo (lib/api.ts)

# VG4: Solo existe un WsClient (en lib/ws-client.ts)
rg -l "class WsClient\|export.*WsClient" apps/client/src/ --type ts
# Resultado esperado: 1 archivo (lib/ws-client.ts)

# VG5: La ruta /v2 no existe en el cliente
rg "/v2" apps/client/src/ --type ts
# Resultado esperado: 0 matches

# VG6: TypeScript compila sin errores
pnpm --filter @spaces/client typecheck
# Resultado esperado: exit code 0

# VG7: Build de cliente exitoso
pnpm --filter @spaces/client build
# Resultado esperado: exit code 0
```

---

## Estimación

| Tarea                           | Criterios        | Esfuerzo |
| ------------------------------- | ---------------- | -------- |
| 20.1 — Unificar apiFetch        | 6                | 1.5h     |
| 20.2 — Unificar WsClient        | 7                | 1.5h     |
| 20.3 — Unificar SessionsContext | 5                | 1h       |
| 20.4 — ChatArea < 300           | 5                | 1.5h     |
| 20.5 — MessageList < 300        | 4                | 1h       |
| 20.6 — ChatInput < 300          | 4                | 1h       |
| 20.7 — MainLayout → AppShell    | 7                | 2h       |
| 20.8 — Eliminar ruta /v2        | 3                | 15 min   |
| 20.9 — Eliminar componentes v2  | 3                | 15 min   |
| Verificación global             | 7                | 15 min   |
| **Total**                       | **51 criterios** | **~10h** |

---

_Plan reescrito aplicando `skills/criterios-de-aceptacion-verificables.md`. Original auditado en `plans/20-21-audit-criteria.md`._
