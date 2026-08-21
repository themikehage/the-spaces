# Hito 3 — Navegación & Layout Shell

**Prerequisito**: Hito 2 completado y verificado (todos los criterios H2-A* en verde).

**Objetivo**: Shell de navegación principal que organiza todas las secciones de la app. Equivalente del `MainLayout` + sidebar + `useMainLayoutState` del cliente web. Desde este hito todos los hitos posteriores viven dentro del shell.

**Principios innegociables**:
- `ShellRoute` de GoRouter como única implementación del shell — no `IndexedStack` manual.
- `NavigationNotifier` maneja el estado de navegación. Ningún widget tiene lógica de routing.
- El estado de cada tab se preserva al cambiar de tab (GoRouter `ShellRoute` + branch navigation).
- `AttentionBadge` en el bottom nav muestra el count de pendientes desde el stream WS desde este hito.

---

## 1. Estado Actual (As-Is)

- Existe `DashboardScreen` standalone con router básico.
- No existe bottom nav ni drawer.
- Las rutas de Sessions, Projects, Agents, Settings no existen aún (son placeholders).

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

- [x] **H3-A1** — Bottom nav con 5 tabs: Dashboard, Sessions, Projects, Agents, Settings. Cada tab es tappable y navega a su screen (placeholder si la screen aún no existe).
- [x] **H3-A2** — Cambiar de tab preserva el scroll y estado de la screen anterior.
- [x] **H3-A3** — AppDrawer accesible desde icono en AppBar con: Teams, Workflows, Skills, MCP, Schedules, Logs.
- [x] **H3-A4** — `AttentionBadge` visible en la tab de Sessions (o en AppBar) con count numérico de pendientes.
- [x] **H3-A5** — Deep links funcionales: navegar a `/sessions/abc123` desde notificación → abre la app en `SessionsScreen` con el id correcto.
- [x] **H3-A6** — `GoRouter` es la única fuente de verdad de la ruta activa — ningún widget tiene su propia lógica de routing.
- [x] **H3-A7** — `flutter analyze lib/core/router/ lib/shared/widgets/` produce cero warnings.
- [x] **H3-A8** — `flutter test test/core/router/` produce exit code 0.

---

## 3. Hitos Innegociables

---

### Sub-hito 3.1: ShellRoute con bottom nav

**Responsabilidad**: Estructura de navegación principal con preservación de estado por tab.

**Artefactos**:

1. **[MODIFY]** `apps/mobile/lib/core/router/app_router.dart`
   - Reemplazar el router plano por `StatefulShellRoute.indexedStack` de GoRouter.
   - Branches: `dashboard`, `sessions`, `projects`, `agents`, `settings`.
   - Cada branch tiene su propio `Navigator` para preservar estado.
   - Rutas anidadas declaradas en cada branch (e.g., `/sessions/:id` dentro del branch `sessions`).

2. **[NEW]** `apps/mobile/lib/shared/widgets/app_shell.dart`
   - Widget `AppShell` que recibe `StatefulNavigationShell` y renderiza `NavigationBar` + `body`.
   - Items del `NavigationBar`: iconos + labels mapeados desde constantes.
   - Sin lógica de routing — delega a `navigationShell.goBranch(index)`.

**Verificación**:
```bash
cd apps/mobile && flutter test test/core/router/shell_route_test.dart
# Cambiar de tab → índice correcto activo. Deep link → branch correcto activo.
```

---

### Sub-hito 3.2: NavigationNotifier

**Responsabilidad**: Estado de navegación global (tab activo, drawer abierto).

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/core/router/navigation_notifier.dart`
   - `NavigationState { currentBranch, isDrawerOpen }` con `freezed`.
   - `NavigationNotifier extends Notifier<NavigationState>`.
   - Métodos: `selectBranch(index)`, `openDrawer()`, `closeDrawer()`.

**Verificación**:
```bash
cd apps/mobile && flutter test test/core/router/navigation_notifier_test.dart
# selectBranch(2) → state.currentBranch == 2
```

---

### Sub-hito 3.3: AppDrawer

**Responsabilidad**: Drawer con secciones secundarias de la app.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/shared/widgets/app_drawer.dart`
   - Items: Teams, Workflows, Skills, MCP, Schedules, Logs.
   - Cada item navega a su ruta (placeholders en este hito, implementados en hitos posteriores).
   - Se cierra automáticamente tras la navegación.

**Verificación**: Visual en simulador — drawer abre y cierra correctamente.

---

### Sub-hito 3.4: AttentionBadge placeholder

**Responsabilidad**: Badge de pendientes que se conectará con el Hito 7. En este hito solo muestra el UI, sin datos reales.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/shared/widgets/attention_badge.dart`
   - Recibe `count: int` como parámetro.
   - Si `count == 0` → oculto. Si `count > 0` → badge rojo con número.
   - Integrado en el `NavigationDestination` de Sessions.

2. **[NEW]** `apps/mobile/lib/features/attention/ui/attention_notifier.dart` (stub)
   - `AttentionState { pendingCount: 0 }` — retorna 0 hasta el Hito 7.

**Verificación**:
```bash
grep -n "AttentionBadge\|attentionNotifier" apps/mobile/lib/shared/widgets/app_shell.dart
# → badge integrado en el shell
```

---

## 4. Verificación Final del Hito 3

```bash
# 1. Análisis estático
cd apps/mobile && flutter analyze lib/core/router/ lib/shared/widgets/
# → "No issues found!"

# 2. Tests de navegación
cd apps/mobile && flutter test test/core/router/
# → exit code 0

# 3. Sin Navigator.push directo en widgets del shell
grep -rn "Navigator.push\|Navigator.of" apps/mobile/lib/shared/widgets/ --include="*.dart"
# → cero líneas

# 4. Sin IndexedStack manual (usamos ShellRoute)
grep -rn "IndexedStack" apps/mobile/lib/ --include="*.dart"
# → cero líneas
```

---

## 5. Restricciones No Negociables

1. **Orden estricto**: 3.1 → 3.2 → 3.3 → 3.4.
2. **Un commit por sub-hito**: `feat(mobile): hito-3.1-shell-route`, etc.
3. **Screens de hitos 4-10 son placeholders** vacíos en este hito — se reemplazan en sus respectivos hitos.
4. **`flutter analyze` verde** antes de pasar al siguiente sub-hito.
5. **Sin lógica de negocio en widgets del shell**: solo navegación y layout.
