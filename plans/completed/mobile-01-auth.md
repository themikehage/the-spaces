# Hito 1 — Auth & Session Guard

**Prerequisito**: Hito 0 completado y verificado (todos los criterios H0-A* en verde).

**Objetivo**: Login funcional, persistencia de token segura, y guard de rutas. El usuario que abre la app sin sesión va a `/login`; con sesión activa va directo al Dashboard. Equivalente de `LoginPage` + `auth-client.ts` del cliente web.

**Principios innegociables**:
- `AuthRepository` es la única clase que llama a endpoints de auth. Ningún widget ni Notifier hace HTTP directo.
- El token se persiste únicamente en `FlutterSecureStorage` via `AppStorage`. Nunca en `SharedPreferences`.
- El guard de rutas vive en `GoRouter.redirect` — no en widgets individuales.
- Estado de auth como state machine: `{ authenticated, unauthenticated, loading, error }`. Sin booleans sueltos.

---

## 1. Estado Actual (As-Is)

- No existe pantalla de login en mobile.
- No existe ningún mecanismo de auth ni guard de rutas.
- El backend expone `POST /api/auth/login` y `POST /api/auth/logout` (contratos en `packages/shared`).

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

- [x] **H1-A1** — Abrir la app sin token → pantalla `LoginScreen` renderiza sin errores.
- [x] **H1-A2** — Login exitoso con credenciales válidas → token persiste en secure storage → redirect a `DashboardScreen`.
- [x] **H1-A3** — Login con credenciales inválidas → mensaje de error visible en pantalla, sin crash.
- [x] **H1-A4** — Matar y reabrir la app con token vigente → no muestra `LoginScreen`, va directo a Dashboard.
- [x] **H1-A5** — Logout → token eliminado de storage → redirect a `LoginScreen`.
- [x] **H1-A6** — `AuthRepository` no tiene ninguna referencia a widgets ni a `BuildContext`.
- [x] **H1-A7** — `GoRouter.redirect` implementado y funcional como único punto de guard.
- [x] **H1-A8** — `flutter analyze` produce cero warnings en `lib/features/auth/`.
- [x] **H1-A9** — `flutter test` en `test/features/auth/` produce exit code 0.

---

## 3. Hitos Innegociables

---

### Sub-hito 1.1: AuthRepository

**Responsabilidad**: Encapsular todas las llamadas HTTP de auth y la persistencia del token.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/auth/data/auth_repository.dart`
   - `login(email, password)` → llama `POST /api/auth/login` via `ApiClient` → persiste token en `AppStorage`.
   - `logout()` → llama `POST /api/auth/logout` → elimina token de `AppStorage`.
   - `getToken()` → lee de `AppStorage`, retorna `null` si no existe.
   - `isAuthenticated()` → retorna `true` si token existe y no está expirado.

2. **[NEW]** `apps/mobile/lib/features/auth/data/models/auth_response.dart`
   - Clase `AuthResponse` con `freezed` + `json_serializable`.
   - Campos: `token: String`, `userId: String`, generados desde el schema de `packages/shared`.

**Verificación**:
```bash
cd apps/mobile && flutter test test/features/auth/auth_repository_test.dart
# login exitoso → token en storage. login fallido → lanza UnauthorizedException.
```

---

### Sub-hito 1.2: AuthNotifier (state machine)

**Responsabilidad**: Estado global de autenticación como state machine con Riverpod.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/auth/ui/auth_notifier.dart`
   - States: `AuthState { authenticated(userId), unauthenticated, loading, error(message) }` con `freezed`.
   - `AuthNotifier extends AsyncNotifier<AuthState>`.
   - Métodos: `login(email, password)`, `logout()`, `checkAuth()`.
   - Delega toda lógica a `AuthRepository`. Sin HTTP directo.

**Verificación**:
```bash
cd apps/mobile && flutter test test/features/auth/auth_notifier_test.dart
# login() → estado pasa de loading → authenticated.
# login() con error → estado pasa de loading → error.
```

---

### Sub-hito 1.3: LoginScreen

**Responsabilidad**: UI de login que consume `AuthNotifier`.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/auth/ui/login_screen.dart`
   - Campos: email, password.
   - Botón "Sign In" que dispara `authNotifier.login()`.
   - Estado `loading` → muestra `CircularProgressIndicator`, deshabilita botón.
   - Estado `error` → muestra mensaje de error inline (no dialog).
   - Sin `setState` ni lógica de negocio — solo consume el Notifier.
   - Diseño visual alineado con `AppTheme` (colores, tipografía del Hito 0).

**Verificación visual**: Ejecutar en simulador. Login exitoso → redirect a placeholder de Dashboard.

---

### Sub-hito 1.4: GoRouter con guard

**Responsabilidad**: Navegación declarativa con redirect de auth.

**Artefactos**:

1. **[MODIFY]** `apps/mobile/lib/core/router/app_router.dart`
   - Rutas declaradas: `/login`, `/dashboard` (placeholder), `/sessions`, `/sessions/:id`.
   - `redirect` implementado:
     ```dart
     redirect: (context, state) {
       final isAuthenticated = ref.read(authNotifierProvider).isAuthenticated;
       if (!isAuthenticated && state.matchedLocation != '/login') return '/login';
       if (isAuthenticated && state.matchedLocation == '/login') return '/dashboard';
       return null;
     }
     ```
   - El `GoRouter` se provee como `Provider` de Riverpod.

**Verificación**:
```bash
cd apps/mobile && flutter test test/core/router/app_router_test.dart
# Sin token → navegación a /dashboard → redirect a /login.
# Con token → navegación a /login → redirect a /dashboard.
```

---

## 4. Verificación Final del Hito 1

```bash
# 1. Análisis estático
cd apps/mobile && flutter analyze lib/features/auth/ lib/core/router/
# → "No issues found!"

# 2. Tests del feature
cd apps/mobile && flutter test test/features/auth/ test/core/router/
# → exit code 0

# 3. Sin imports de Dio o HttpClient fuera de api_client.dart
grep -rn "import 'package:dio" apps/mobile/lib/features/ --include="*.dart"
# → cero líneas

# 4. Sin referencias a FlutterSecureStorage fuera de app_storage.dart
grep -rn "FlutterSecureStorage" apps/mobile/lib/features/ --include="*.dart"
# → cero líneas
```

---

## 5. Restricciones No Negociables

1. **Orden estricto**: 1.1 → 1.2 → 1.3 → 1.4.
2. **Un commit por sub-hito**: `feat(mobile): hito-1.1-auth-repository`, etc.
3. **`AuthRepository` no conoce widgets**: retorna solo datos y lanza excepciones.
4. **`flutter analyze` verde** antes de pasar al siguiente sub-hito.
5. **Sin UI de features posteriores** (Dashboard real, Sessions, etc.) en este hito.
