# Hito 4 — Sessions List

**Prerequisito**: Hito 3 completado y verificado (todos los criterios H3-A* en verde).

**Objetivo**: Lista de sesiones con filtros, búsqueda y creación desde mobile. Equivalente de `SessionsPage` + `useSessionList` del cliente web. Las sesiones creadas desde mobile deben aparecer en el cliente web y viceversa.

**Principios innegociables**:
- `SessionsRepository` es la única clase que hace HTTP de sesiones.
- Invalidación de lista via eventos WS — no polling.
- Creación de sesión via bottom sheet — no página nueva (mobile UX).
- Paginación lazy: cargar más al llegar al final de la lista (no cargar todo de una vez).

---

## 1. Estado Actual (As-Is)

- Existe un placeholder de `SessionsScreen` dentro del shell del Hito 3.
- El backend expone `GET /api/sessions`, `POST /api/sessions`, `DELETE /api/sessions/:id`.

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

- [ ] **H4-A1** — `SessionsScreen` muestra lista real de sesiones del backend con skeleton durante carga.
- [ ] **H4-A2** — Búsqueda por nombre de sesión filtra la lista en tiempo real (filtro local, sin HTTP).
- [ ] **H4-A3** — Filtro por estado: All, Active, Idle. Persiste en `AppStorage` entre sesiones de app.
- [ ] **H4-A4** — Scroll hasta el final → carga página siguiente (paginación lazy).
- [ ] **H4-A5** — FAB "+" abre `NewSessionSheet` (bottom sheet) con campos: nombre, agente, proyecto.
- [ ] **H4-A6** — Crear sesión desde mobile → aparece en el cliente web sin necesidad de refresh manual.
- [ ] **H4-A7** — Swipe-to-delete en una sesión → confirmación → `DELETE /api/sessions/:id` → desaparece de la lista.
- [ ] **H4-A8** — Sesión creada desde el cliente web → aparece en mobile en < 2 segundos via WS.
- [ ] **H4-A9** — Tap en sesión → navega a `/sessions/:id` (placeholder del Hito 5 de Chat).
- [ ] **H4-A10** — `flutter analyze lib/features/sessions/` produce cero warnings.
- [ ] **H4-A11** — `flutter test test/features/sessions/` produce exit code 0.

---

## 3. Hitos Innegociables

---

### Sub-hito 4.1: Modelos de sesión

**Responsabilidad**: Clases Dart para Session alineadas con `packages/shared`.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/sessions/data/models/session.dart`
   - `Session` con `freezed`: `id`, `title`, `status`, `agentId`, `projectId`, `createdAt`, `updatedAt`, `messageCount`.
   - JSON serializable. Alineado con el schema Zod de `packages/shared`.

2. **[NEW]** `apps/mobile/lib/features/sessions/data/models/create_session_input.dart`
   - `CreateSessionInput`: `title`, `agentId?`, `projectId?`.

**Verificación**:
```bash
cd apps/mobile && dart run build_runner build --delete-conflicting-outputs
flutter analyze lib/features/sessions/data/models/
# → cero errores
```

---

### Sub-hito 4.2: SessionsRepository

**Responsabilidad**: CRUD de sesiones via `ApiClient`.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/sessions/data/sessions_repository.dart`
   - `getSessions({ page, limit, status? })` → `GET /api/sessions` → `PaginatedResult<Session>`.
   - `createSession(CreateSessionInput)` → `POST /api/sessions` → `Session`.
   - `deleteSession(id)` → `DELETE /api/sessions/:id` → `void`.
   - Sin `Dio` directo — usa `ApiClient`.

**Verificación**:
```bash
cd apps/mobile && flutter test test/features/sessions/sessions_repository_test.dart
# getSessions → lista tipada. createSession → retorna Session. deleteSession → sin error.
```

---

### Sub-hito 4.3: SessionsNotifier

**Responsabilidad**: State machine de la lista de sesiones con paginación y filtros.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/sessions/ui/sessions_notifier.dart`
   - `SessionsState { sessions, isLoading, isLoadingMore, hasMore, filter, searchQuery, error }` con `freezed`.
   - `SessionsNotifier extends AsyncNotifier<SessionsState>`.
   - `load()` — carga primera página.
   - `loadMore()` — carga siguiente página y concatena.
   - `setFilter(status)` — cambia filtro y recarga.
   - `search(query)` — filtra lista local por título.
   - `createSession(input)` — llama repository + invalida lista.
   - `deleteSession(id)` — llama repository + remueve de lista local.
   - `_listenToWsEvents()` — escucha `session_created` / `session_deleted` del stream WS global.

**Verificación**:
```bash
cd apps/mobile && flutter test test/features/sessions/sessions_notifier_test.dart
# load() → lista. loadMore() → lista concatenada. WS event → lista actualizada.
```

---

### Sub-hito 4.4: SessionsScreen y NewSessionSheet

**Responsabilidad**: UI de lista y creación.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/sessions/ui/sessions_screen.dart`
   - `ListView.builder` con `SessionListItem`.
   - `SearchBar` en AppBar (nativo de Material 3).
   - Chips de filtro: All / Active / Idle.
   - Scroll listener para `loadMore()`.
   - FAB con `+` → abre `NewSessionSheet`.
   - Swipe-to-delete via `Dismissible`.

2. **[NEW]** `apps/mobile/lib/features/sessions/ui/widgets/session_list_item.dart`
   - Título, agente asignado, badge de estado, timestamp relativo.
   - Tap → `context.go('/sessions/${session.id}')`.

3. **[NEW]** `apps/mobile/lib/features/sessions/ui/widgets/new_session_sheet.dart`
   - Bottom sheet con campos: nombre, selector de agente, selector de proyecto.
   - Botón "Create" → `sessionsNotifier.createSession(input)` → cierra sheet.

**Verificación visual**: Lista real en simulador, creación funcional, swipe-delete con confirmación.

---

## 4. Verificación Final del Hito 4

```bash
# 1. Análisis estático
cd apps/mobile && flutter analyze lib/features/sessions/
# → "No issues found!"

# 2. Tests del feature
cd apps/mobile && flutter test test/features/sessions/
# → exit code 0

# 3. Sin Dio directo en el feature
grep -rn "import 'package:dio" apps/mobile/lib/features/sessions/ --include="*.dart"
# → cero líneas

# 4. Sin setState en screens
grep -n "setState" apps/mobile/lib/features/sessions/ui/sessions_screen.dart
# → cero líneas

# 5. Paginación implementada
grep -n "loadMore\|hasMore" apps/mobile/lib/features/sessions/ui/sessions_notifier.dart
# → al menos 2 líneas

# 6. WS listener implementado
grep -n "_listenToWsEvents\|session_created" apps/mobile/lib/features/sessions/ui/sessions_notifier.dart
# → al menos 1 línea
```

---

## 5. Restricciones No Negociables

1. **Orden estricto**: 4.1 → 4.2 → 4.3 → 4.4.
2. **Un commit por sub-hito**: `feat(mobile): hito-4.1-session-models`, etc.
3. **Sin implementar ChatScreen** en este hito — el tap a sesión va a placeholder.
4. **Paginación lazy obligatoria** — no cargar todas las sesiones en memoria.
5. **`flutter analyze` verde** antes de pasar al siguiente sub-hito.
