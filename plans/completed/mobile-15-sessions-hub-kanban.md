# Hito 15 — Sessions Hub Completo: Kanban + Archive + Session Management

**Prerequisito**: Hito 14 completado y verificado.

**Objetivo**: Elevar `SessionsScreen` de "lista simple + console" a un hub de control real, añadiendo la vista Kanban por estado de agente, la capacidad de archivar/desarchivar sesiones, y el borrado en cascada con navegación correcta.

**Sin esto, `/sessions` no es un hub — es una lista con una consola.**

**Principios innegociables**:
- El Kanban es una tercera tab en `SessionsScreen` — no una pantalla nueva.
- Archivado es una acción de `SessionPopover` dentro de `SessionListItem` — no un gesto swipe adicional.
- El borrado navega automáticamente a la siguiente sesión disponible en la misma lista, nunca a una pantalla vacía.
- `SessionsNotifier` es el único punto de mutación — los widgets solo invocan sus métodos.
- `flutter analyze` verde antes de pasar al siguiente sub-hito.

---

## 1. Estado Actual (As-Is)

- `sessions_screen.dart`: 2 tabs — "Sessions" (lista) y "Console".
- `session_list_item.dart`: muestra nombre, estado (dot), fecha. Solo acción disponible: `onDelete` via swipe.
- No existe `archive`, no existe Kanban, no existe `session_popover`.
- `SessionsNotifier.deleteSession(id)` elimina la sesión pero no navega a otra.
- Borrado borra el item y deja la lista vacía sin reacción si era la última sesión de la vista activa.

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

- [ ] **H15-A1** — `SessionsScreen` tiene 3 tabs: **Sessions** (lista) | **Kanban** | **Console**.
- [ ] **H15-A2** — Tab **Kanban** muestra 3 columnas: `Idle` / `Working` / `Done`. Cada columna lista las sesiones en ese estado con un `KanbanSessionCard` (nombre + dot + agente/proyecto).
- [ ] **H15-A3** — Las columnas del Kanban se actualizan reactivamente cuando el estado de una sesión cambia (evento WS `session_updated` o re-fetch).
- [ ] **H15-A4** — `SessionListItem` tiene un botón de menú (ícono `⋮`) que abre un `SessionPopover` con opciones: **Archive** / **Unarchive** / **Delete**.
- [ ] **H15-A5** — El tab Sessions tiene toggle **Active | Archived** en la toolbar. "Active" muestra sesiones no archivadas; "Archived" muestra las archivadas.
- [ ] **H15-A6** — Borrar una sesión navega automáticamente a la primera sesión restante de la lista activa. Si no queda ninguna, muestra el estado vacío sin error.
- [ ] **H15-A7** — `flutter analyze lib/features/sessions/` → cero warnings.
- [ ] **H15-A8** — `flutter test test/features/sessions/` → exit code 0.

---

## 3. Sub-hitos (orden estricto)

### Sub-hito 15.1: Archive + SessionPopover

**Responsabilidad**: Añadir acciones de gestión a cada sesión (archive/unarchive/delete) y el endpoint correspondiente en el repositorio.

**Contexto backend**: `PATCH /api/sessions/:id` con `{ archived: true }` archiva. `GET /api/sessions?archived=true` retorna las archivadas.

**Artefactos**:

1. **[MODIFY]** `apps/mobile/lib/features/sessions/data/sessions_repository.dart`
   - Añadir `Future<void> archiveSession(String id)` → `PATCH /api/sessions/:id` con `{ "archived": true }`.
   - Añadir `Future<void> unarchiveSession(String id)` → `PATCH /api/sessions/:id` con `{ "archived": false }`.
   - Añadir parámetro `bool archived = false` a `getSessions(...)` → `?archived=true` en la query string.

2. **[MODIFY]** `apps/mobile/lib/features/sessions/data/models/session.dart`
   - Añadir campo `@Default(false) bool archived` al modelo `Session`.

3. **[MODIFY]** `apps/mobile/lib/features/sessions/ui/sessions_notifier.dart`
   - Añadir `archiveSession(String id)` → llama al repositorio y actualiza la lista local.
   - Añadir `unarchiveSession(String id)` → ídem.
   - Añadir campo `showArchived` a `SessionsState` (default `false`).
   - Añadir `toggleShowArchived()` → cambia el flag y re-fetcha con `archived: showArchived`.
   - Modificar `deleteSession(id)` → tras eliminar, si el id borrado era el "activo" en cualquier entidad, emite evento `EntityEventBus.emit('session_deleted')`.

4. **[NEW]** `apps/mobile/lib/features/sessions/ui/widgets/session_popover.dart`
   - `SessionPopover({ session, onArchive, onUnarchive, onDelete })`.
   - Abre con `showModalBottomSheet`.
   - Lista de `ListTile`: Archive/Unarchive (según `session.archived`) + Delete (con confirmación `AlertDialog`).
   - `static void show(BuildContext context, Session session, { callbacks... })`.

5. **[MODIFY]** `apps/mobile/lib/features/sessions/ui/widgets/session_list_item.dart`
   - Añadir `IconButton(Icons.more_vert)` al trailing del `ListTile`.
   - Al pulsar, llama `SessionPopover.show(...)` con los callbacks correctos.

**Verificación**:
```bash
flutter analyze lib/features/sessions/
# → cero warnings
```

---

### Sub-hito 15.2: Tab "Active | Archived" toggle

**Responsabilidad**: Separar visualmente sesiones activas de archivadas en la tab Sessions.

**Artefactos**:

1. **[MODIFY]** `apps/mobile/lib/features/sessions/ui/sessions_screen.dart`
   - En la tab "Sessions", añadir un `SegmentedButton` (o `ToggleButtons`) con "Active" / "Archived" debajo del título.
   - El estado del toggle está en `sessionsState.showArchived`.
   - Al cambiar: `notifier.toggleShowArchived()`.
   - La lista filtra según `showArchived` sin re-renderizar la pantalla completa.

**Verificación**:
```bash
flutter analyze lib/features/sessions/ui/sessions_screen.dart
# → cero warnings
# Tap "Archived" → lista muestra solo sesiones con archived: true.
# Tap "Active" → lista muestra solo sesiones con archived: false.
```

---

### Sub-hito 15.3: Tab Kanban

**Responsabilidad**: Vista de sesiones agrupadas por estado del agente.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/sessions/ui/sessions_kanban_view.dart`
   - `SessionsKanbanView` — `ConsumerWidget`.
   - Observa `sessionsNotifierProvider`.
   - Layout: `Row` con 3 `Expanded` — cada uno es una `KanbanColumn`.
   - Agrupación: `idle/sleeping` → columna "Idle", `streaming/working` → "Working", `done/completed` → "Done".

2. **[NEW]** `apps/mobile/lib/features/sessions/ui/widgets/kanban_column.dart`
   - `KanbanColumn({ title, sessions, color })`.
   - Header con título + badge de conteo.
   - `ListView` (sin physics en la columna individual) de `KanbanSessionCard`.

3. **[NEW]** `apps/mobile/lib/features/sessions/ui/widgets/kanban_session_card.dart`
   - `KanbanSessionCard({ session, onTap })`.
   - Card compacto: `SessionStatusDot` + nombre + subtítulo (agente o proyecto si existe).
   - `onTap` navega a la sesión: `context.push('/sessions/${session.id}')`.

4. **[MODIFY]** `apps/mobile/lib/features/sessions/ui/sessions_screen.dart`
   - Añadir tab "Kanban" entre "Sessions" y "Console".
   - Body del tab Kanban: `SessionsKanbanView()`.

**Verificación**:
```bash
flutter analyze lib/features/sessions/ui/
# → cero warnings
```

---

## 4. Verificación Final del Hito 15

```bash
# 1. Análisis estático
cd apps/mobile && flutter analyze lib/features/sessions/
# → "No issues found!"

# 2. Tests
cd apps/mobile && flutter test test/features/sessions/
# → exit code 0

# 3. Sessions tiene 3 tabs
grep -n "TabBar\|Tab(" apps/mobile/lib/features/sessions/ui/sessions_screen.dart | wc -l
# → al menos 3 líneas (3 Tab widgets)

# 4. SessionPopover no depende de SessionsNotifier directamente
grep -n "sessionsNotifier\|SessionsNotifier" apps/mobile/lib/features/sessions/ui/widgets/session_popover.dart
# → cero líneas

# 5. Archive llama al repositorio
grep -n "archiveSession\|unarchiveSession" apps/mobile/lib/features/sessions/ui/sessions_notifier.dart
# → al menos 2 líneas

# 6. Sin swipe adicional para archive
grep -rn "Dismissible" apps/mobile/lib/features/sessions/ui/widgets/session_popover.dart
# → cero líneas (archive no es swipe, es popover)
```

---

## 5. Restricciones No Negociables

1. **Orden estricto**: 15.1 → 15.2 → 15.3.
2. **Un commit por sub-hito**: `feat(mobile): hito-15.1-session-archive`, etc.
3. **`KanbanColumn` no muta estado** — es presentacional, solo recibe `List<Session>`.
4. **Sin nueva pantalla** — Kanban vive en tab dentro de `SessionsScreen`.
5. **`flutter analyze` verde** antes de pasar al siguiente sub-hito.
6. **Actualizar `steps.md`** al finalizar.
