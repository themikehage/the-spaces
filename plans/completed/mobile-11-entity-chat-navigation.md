# Hito 11 — Entity-First Navigation (Chat as Primary Screen)

**Prerequisito**: Hito 10 completado (apps/mobile en estado verde con `flutter analyze`).

**Objetivo**: Cuando el usuario entra a una entidad (Agent/Project), ve directamente el último chat activo. La topbar muestra "Sessions" y "⋯" (config). Swipe derecho → Workspace/Files de esa entidad. El `ChatScreen` no muestra el bottom nav.

**Principios innegociables**:
- El chat es la pantalla raíz de cada entidad, no una pantalla hija.
- La navegación de entidad vive fuera del `StatefulShellRoute` (sin bottom nav).
- `PageView` horizontal es la única implementación del swipe entre Chat <-> Files.
- `EntitySessionNotifier` resuelve la sesión activa — sin duplicar lógica de streaming.
- `flutter analyze` verde antes de pasar a cualquier sub-hito siguiente.

---

## 1. Estado Actual (As-Is)

- `AgentDetailScreen` / `ProjectDetailScreen` muestran un formulario de configuración (EntityConfigEditor) con appBar + back.
- `ChatScreen` está anidado en el branch `sessions` del `StatefulShellRoute` — hereda el bottom nav.
- Entrar a `/agents/:id` muestra config. Para chatear hay que ir a `/sessions/:id` manualmente.
- No existe swipe entre chat y files para entidades.

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

- [ ] **H11-A1** — Navegar a `/agents/:id` o `/projects/:id` abre directamente el **último chat** (última sesión de esa entidad). Si no hay sesión previa, crea una nueva automáticamente.
- [ ] **H11-A2** — La **topbar** muestra: título de la entidad | botón "Sessions" | botón "⋯" (config).
- [ ] **H11-A3** — Swipe horizontal a la derecha desde el chat navega al panel de **Files/Workspace**. Swipe izquierdo regresa.
- [ ] **H11-A4** — Dot indicator (2 dots) muestra la posición actual (Chat | Files).
- [ ] **H11-A5** — El chat dentro de una entidad **NO muestra el bottom nav** (fuera del `StatefulShellRoute`).
- [ ] **H11-A6** — El bottom nav continúa visible en `SessionsScreen` y en el chat `/sessions/:id` standalone.
- [ ] **H11-A7** — "Sessions" abre un `BottomSheet` con la lista de sesiones filtradas por entidad. Tap → cambia sesión activa en el chat sin salir de la pantalla.
- [ ] **H11-A8** — "⋯" abre un `BottomSheet` con el `EntityConfigEditor`.
- [ ] **H11-A9** — `flutter analyze lib/features/agents/ lib/features/projects/` → cero warnings.
- [ ] **H11-A10** — `flutter test test/features/agents/ test/features/projects/` → exit code 0.

---

## 3. Sub-hitos (orden estricto)

### Sub-hito 11.1: Router — Rutas de entidad fuera del ShellRoute

**Responsabilidad**: Mover las rutas de detalle fuera del `StatefulShellRoute` para que no hereden el bottom nav.

**Artefactos**:

1. **[MODIFY]** `apps/mobile/lib/core/router/app_router.dart`
   - Mover `/agents/:id` y `/projects/:id` al nivel raíz (fuera de los branches), con `parentNavigatorKey: rootNavigatorKey`.
   - `/agents` y `/projects` (listas) permanecen dentro de sus branches (conservan bottom nav).
   - Añadir sub-rutas `/agents/:id/sessions/:sessionId` y `/projects/:id/sessions/:sessionId` para deep-link.

**Verificación**:
```bash
grep -n "parentNavigatorKey: rootNavigatorKey" apps/mobile/lib/core/router/app_router.dart
# → al menos 5 líneas (login + teams + workflows + agent-detail + project-detail)
cd apps/mobile && flutter analyze lib/core/router/
# → "No issues found!"
```

---

### Sub-hito 11.2: EntityChatScreen — PageView Chat <-> Files

**Responsabilidad**: Pantalla contenedora con PageView horizontal y topbar unificada.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/shared/widgets/entity_chat_screen.dart`
   - `EntityChatScreen({ entityType, entityId, entityName })`.
   - `PageController` para swipe horizontal: Página 0 = ChatScreen, Página 1 = WorkspaceFilesPanel (placeholder).
   - `AppBar` custom: leading Back, title = entityName, actions = ["Sessions" TextButton, "⋯" IconButton].
   - Dot indicator integrado.

2. **[NEW]** `apps/mobile/lib/shared/widgets/entity_page_indicator.dart`
   - Dos `AnimatedContainer` dots: activo = `AppColors.primary`, inactivo = `AppColors.mutedForeground`.

3. **[NEW]** `apps/mobile/lib/features/sessions/ui/widgets/entity_sessions_sheet.dart`
   - `BottomSheet` con lista de sesiones de la entidad (`GET /api/sessions?agentId=... | projectId=...`).
   - Item: nombre, dot de estado (active/streaming/sleeping), fecha.
   - Tap → callback `onSessionSelected(sessionId)`.
   - Botón "New Session" → crea y selecciona.

4. **[NEW]** `apps/mobile/lib/shared/widgets/entity_config_sheet.dart`
   - `BottomSheet` que envuelve `EntityConfigEditor` existente + botón "Save".

**Verificación**:
```bash
grep -n "PageController\|PageView" apps/mobile/lib/shared/widgets/entity_chat_screen.dart
# → al menos 2 líneas
cd apps/mobile && flutter analyze lib/shared/widgets/entity_chat_screen.dart
# → cero errores
```

---

### Sub-hito 11.3: EntitySessionNotifier — Resolución de sesión activa

**Responsabilidad**: Notifier que resuelve la última sesión de una entidad o crea una nueva.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/shared/notifiers/entity_session_notifier.dart`
   - `EntitySessionState { currentSessionId?, isLoading, error }` con `freezed`.
   - `EntitySessionNotifier(entityType, entityId) extends AsyncNotifier<EntitySessionState>`.
   - `resolveActiveSession()`: `GET /api/sessions?{agentId|projectId}=:id&limit=1` → si existe usa la primera; si no, `POST /api/sessions` con el param correspondiente.
   - `selectSession(sessionId)` y `createSession()`.

2. **[MODIFY]** `apps/mobile/lib/shared/widgets/entity_chat_screen.dart`
   - Consume `entitySessionNotifierProvider(entityType, entityId)`.
   - Loading → `CircularProgressIndicator`. Ready → `ChatScreen(sessionId: currentSessionId!)`.

**Verificación**:
```bash
flutter test test/shared/entity_session_notifier_test.dart
# Con sesión existente → currentSessionId = id. Sin sesiones → POST llamado → currentSessionId = nueva.
cd apps/mobile && flutter analyze lib/shared/notifiers/
# → cero warnings
```

---

### Sub-hito 11.4: Integrar AgentDetailScreen y ProjectDetailScreen

**Responsabilidad**: Reemplazar las pantallas actuales por `EntityChatScreen`.

**Artefactos**:

1. **[MODIFY]** `apps/mobile/lib/features/agents/ui/agent_detail_screen.dart`
   - Reemplazar el `Scaffold` actual por `EntityChatScreen(entityType: 'agent', entityId: agentId, entityName: agent.name)`.
   - `_confirmDelete` se mueve al `EntityConfigSheet`.

2. **[MODIFY]** `apps/mobile/lib/features/projects/ui/project_detail_screen.dart`
   - Equivalente con `entityType: 'project'`.

**Verificación**:
```bash
cd apps/mobile && flutter analyze lib/features/agents/ lib/features/projects/
# → "No issues found!"
grep -rn "BottomNavigationBar\|NavigationBar" apps/mobile/lib/features/agents/ apps/mobile/lib/features/projects/ --include="*.dart"
# → cero líneas
```

---

### Sub-hito 11.5: Fix — Verificar bottom nav en rutas correctas

**Responsabilidad**: Verificar que `ChatScreen` en `/sessions/:id` muestra bottom nav y en `/agents/:id` no.

**Artefactos**:

1. **[MODIFY]** `apps/mobile/lib/features/chat/ui/chat_screen.dart` (solo si necesario)
   - `ChatScreen` no debe importar ni referenciar `AppShell` o `NavigationBar`.

**Verificación**:
```bash
grep -rn "NavigationBar\|AppShell\|BottomNavigationBar" apps/mobile/lib/features/chat/ --include="*.dart"
# → cero líneas
cd apps/mobile && flutter analyze lib/features/chat/
# → cero warnings
```

---

## 4. Verificación Final del Hito 11

```bash
# 1. Análisis estático
cd apps/mobile && flutter analyze lib/features/agents/ lib/features/projects/ lib/shared/
# → "No issues found!"

# 2. Tests
cd apps/mobile && flutter test test/features/agents/ test/features/projects/ test/shared/
# → exit code 0

# 3. Sin bottom nav en pantallas de entidad
grep -rn "NavigationBar\|BottomNavigationBar" apps/mobile/lib/features/agents/ apps/mobile/lib/features/projects/ --include="*.dart"
# → cero líneas

# 4. PageView en EntityChatScreen
grep -n "PageView\|PageController" apps/mobile/lib/shared/widgets/entity_chat_screen.dart
# → al menos 2 líneas

# 5. EntitySessionNotifier resuelve sesión
grep -n "resolveActiveSession\|createSession" apps/mobile/lib/shared/notifiers/entity_session_notifier.dart
# → al menos 2 líneas

# 6. Sin Navigator.push en pantallas de entidad
grep -rn "Navigator.push" apps/mobile/lib/features/agents/ apps/mobile/lib/features/projects/ --include="*.dart"
# → cero líneas
```

---

## 5. Restricciones No Negociables

1. **Orden estricto**: 11.1 → 11.2 → 11.3 → 11.4 → 11.5.
2. **Un commit por sub-hito**: `feat(mobile): hito-11.1-router-entity-routes`, etc.
3. **El panel Files/Workspace es un `PlaceholderWidget` hasta el H12** — no implementar file listing aquí.
4. **`flutter analyze` verde** antes de pasar al siguiente sub-hito.
5. **`ChatScreen` no conoce el shell** — sin imports de `AppShell` ni `NavigationBar`.
6. **`EntitySessionNotifier` usa `SessionRepository` existente** — sin duplicar llamadas HTTP.
