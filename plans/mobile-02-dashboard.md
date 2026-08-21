# Hito 2 — Dashboard

**Prerequisito**: Hito 1 completado y verificado (todos los criterios H1-A* en verde).

**Objetivo**: Pantalla principal post-login con proyectos recientes, sesiones activas y quick actions. Equivalente de `DashboardPage` + `useDashboardData` del cliente web.

**Principios innegociables**:
- `DashboardRepository` es la única clase que hace HTTP para datos del dashboard.
- `DashboardNotifier` es la única fuente de estado — ningún widget llama a `ref.read(repository)` directamente.
- Pull-to-refresh nativo con `RefreshIndicator`.
- Badges de sesión activa actualizados via eventos WS — no polling.

---

## 1. Estado Actual (As-Is)

- Existe un placeholder de `DashboardScreen` conectado al router del Hito 1.
- No existen datos reales del backend en mobile.

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

- [x] **H2-A1** — `DashboardScreen` carga y muestra proyectos recientes del backend real.
- [x] **H2-A2** — `DashboardScreen` muestra sesiones activas con su estado (`running`, `idle`, `error`).
- [x] **H2-A3** — Pull-to-refresh refresca datos del backend sin navegación.
- [x] **H2-A4** — Cambiar el estado de una sesión desde el cliente web → el badge en mobile se actualiza en < 2 segundos via WS.
- [x] **H2-A5** — Estado `loading` muestra skeleton loaders (no spinners genéricos).
- [x] **H2-A6** — Estado `error` muestra mensaje de error con botón de retry.
- [x] **H2-A7** — `DashboardRepository` no tiene referencias a widgets ni a `BuildContext`.
- [x] **H2-A8** — `flutter analyze lib/features/dashboard/` produce cero warnings.
- [x] **H2-A9** — `flutter test test/features/dashboard/` produce exit code 0.

---

## 3. Hitos Innegociables

---

### Sub-hito 2.1: Modelos de datos

**Responsabilidad**: Clases Dart para Session y Project usadas en el dashboard.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/dashboard/data/models/dashboard_session.dart`
   - `DashboardSession` con `freezed`: `id`, `title`, `status`, `agentId`, `projectId`, `updatedAt`.
   - Generado/alineado desde el schema Zod de `packages/shared`.

2. **[NEW]** `apps/mobile/lib/features/dashboard/data/models/dashboard_project.dart`
   - `DashboardProject` con `freezed`: `id`, `name`, `description`, `sessionCount`, `updatedAt`.

**Verificación**:
```bash
cd apps/mobile && dart run build_runner build --delete-conflicting-outputs
flutter analyze lib/features/dashboard/data/models/
# → cero errores
```

---

### Sub-hito 2.2: DashboardRepository

**Responsabilidad**: Llamadas HTTP a `GET /api/sessions` y `GET /api/projects`.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/dashboard/data/dashboard_repository.dart`
   - `getActiveSessions()` → `GET /api/sessions?status=running` → `List<DashboardSession>`.
   - `getRecentProjects()` → `GET /api/projects?limit=5&sort=updatedAt` → `List<DashboardProject>`.
   - Delega HTTP a `ApiClient`. Sin `Dio` directo.

**Verificación**:
```bash
cd apps/mobile && flutter test test/features/dashboard/dashboard_repository_test.dart
# Retorna datos mockeados correctamente tipados. Lanza ApiException en 4xx.
```

---

### Sub-hito 2.3: DashboardNotifier

**Responsabilidad**: State machine del dashboard con carga inicial y actualización WS.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/dashboard/ui/dashboard_notifier.dart`
   - `DashboardState { sessions, projects, isLoading, error }` con `freezed`.
   - `DashboardNotifier extends AsyncNotifier<DashboardState>`.
   - `load()` — carga ambas listas del repository en paralelo.
   - `refresh()` — equivalente de pull-to-refresh.
   - `_listenToWsEvents()` — suscribe al `WsClient` y actualiza estado de sesiones en tiempo real para eventos `session_status`.

**Verificación**:
```bash
cd apps/mobile && flutter test test/features/dashboard/dashboard_notifier_test.dart
# load() → estado pasa de loading → datos.
# WS event session_status → estado de sesión actualizado sin reload completo.
```

---

### Sub-hito 2.4: DashboardScreen y widgets

**Responsabilidad**: UI que consume `DashboardNotifier`.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/dashboard/ui/dashboard_screen.dart`
   - Consume `DashboardNotifier` via `ref.watch`.
   - Secciones: "Active Sessions", "Recent Projects", "Quick Actions".
   - `RefreshIndicator` wrappea el `CustomScrollView`.
   - Sin `setState` ni lógica de negocio.

2. **[NEW]** `apps/mobile/lib/features/dashboard/ui/widgets/session_card.dart`
   - Muestra: título, agente asignado, badge de estado con color semántico (`running`=verde, `idle`=gris, `error`=rojo).
   - Toca → navega a `/sessions/:id` (placeholder en este hito).

3. **[NEW]** `apps/mobile/lib/features/dashboard/ui/widgets/project_card.dart`
   - Muestra: nombre, descripción, count de sesiones, fecha de última actualización.
   - Toca → navega a `/projects/:id` (placeholder).

4. **[NEW]** `apps/mobile/lib/features/dashboard/ui/widgets/dashboard_skeleton.dart`
   - Skeleton loaders equivalentes a los de `components/skeletons/` de la web.
   - Se muestra durante `isLoading`.

**Verificación visual**: Ejecutar en simulador conectado al backend local. Dashboard carga datos reales.

---

## 4. Verificación Final del Hito 2

```bash
# 1. Análisis estático
cd apps/mobile && flutter analyze lib/features/dashboard/
# → "No issues found!"

# 2. Tests del feature
cd apps/mobile && flutter test test/features/dashboard/
# → exit code 0

# 3. Sin Dio directo en features
grep -rn "import 'package:dio" apps/mobile/lib/features/dashboard/ --include="*.dart"
# → cero líneas

# 4. Sin setState en screen
grep -n "setState" apps/mobile/lib/features/dashboard/ui/dashboard_screen.dart
# → cero líneas

# 5. WS listener registrado y funcional
grep -n "_listenToWsEvents\|WsClient" apps/mobile/lib/features/dashboard/ui/dashboard_notifier.dart
# → al menos 1 línea
```

---

## 5. Restricciones No Negociables

1. **Orden estricto**: 2.1 → 2.2 → 2.3 → 2.4.
2. **Un commit por sub-hito**: `feat(mobile): hito-2.1-dashboard-models`, etc.
3. **Sin navegación real a Sessions/Projects**: solo placeholders de ruta en este hito.
4. **`flutter analyze` verde** antes de pasar al siguiente sub-hito.
5. **Actualizaciones de estado via WS**, no polling con `Timer`.
