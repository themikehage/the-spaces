# Hito 0 — Scaffolding & Fundación Flutter

**Objetivo**: Tener el proyecto Flutter corriendo en simulador, conectado al backend local, con design tokens y cliente HTTP/WS base definidos. Ningún hito posterior comienza sin que este esté verde.

**Principios innegociables**:
- Todo acceso HTTP pasa por `ApiClient` (`lib/core/api/api_client.dart`). Nunca `Dio` directo en features.
- Todo acceso a storage pasa por `AppStorage` con keys tipadas. Nunca `SharedPreferences` o `FlutterSecureStorage` directo en features.
- Design tokens definidos en `lib/core/theme/` como constantes Dart — no valores hardcodeados en widgets.
- El proyecto Flutter vive en `apps/mobile/` del monorepo existente.
- El script puente `scripts/sync-types.sh` es la única fuente de verdad para sincronizar contratos desde `packages/shared`.

---

## 1. Estado Actual (As-Is)

- No existe `apps/mobile/` en el monorepo.
- No existe ningún script puente entre los schemas Zod de `packages/shared` y Dart.
- El backend expone `GET /api/health`, API REST y WebSocket en `/ws` — listos para ser consumidos.

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

Criterios **binarios y verificables**. El hito está completo cuando todos son `true`.

- [x] **H0-A1** — `apps/mobile/` existe con estructura `lib/core/` + `lib/features/` + `lib/shared/`.
- [x] **H0-A2** — `flutter analyze` produce **cero** errores y **cero** warnings.
- [x] **H0-A3** — `flutter test` produce exit code 0 (tests de smoke de `ApiClient`).
- [x] **H0-A4** — `GET /api/health` desde el app retorna `200` logueado en consola de debug.
- [x] **H0-A5** — El WebSocket client establece conexión con el servidor local y loguea el evento `connected`.
- [x] **H0-A6** — Design tokens de color, tipografía y espaciado mapeados desde `index.css` de la web, sin valores hardcodeados fuera de `app_theme.dart`.
- [x] **H0-A7** — Script `scripts/sync-types.sh` existe, está documentado y genera `lib/core/models/shared_types.dart` desde los schemas exportados de `packages/shared`.
- [x] **H0-A8** — `pnpm dev` sigue funcionando sin cambios (el monorepo no se rompe).

---

## 3. Hitos Innegociables

Los sub-hitos se ejecutan en orden estricto. **Cada uno termina con su verificación antes de continuar.**

---

### Sub-hito 0.1: Crear el proyecto Flutter

**Responsabilidad**: Estructura base del proyecto.

**Artefactos**:

1. **[NEW]** `apps/mobile/` — creado con:
   ```bash
   flutter create --org com.spaces --project-name spaces_mobile --platforms ios,android apps/mobile
   ```

2. **[MODIFY]** `apps/mobile/pubspec.yaml` — dependencias iniciales:
   ```yaml
   dependencies:
     flutter_riverpod: ^2.6.1
     riverpod_annotation: ^2.3.5
     go_router: ^14.0.0
     dio: ^5.7.0
     web_socket_channel: ^3.0.0
     flutter_secure_storage: ^9.2.2
     shared_preferences: ^2.3.2
     flutter_markdown: ^0.7.4
     intl: ^0.19.0
     freezed_annotation: ^2.4.4
     json_annotation: ^4.9.0

   dev_dependencies:
     build_runner: ^2.4.12
     freezed: ^2.5.7
     json_serializable: ^6.8.0
     riverpod_generator: ^2.4.3
     flutter_lints: ^4.0.0
   ```

3. **[NEW]** `apps/mobile/lib/core/` — estructura de directorios:
   ```
   lib/core/
   ├── api/
   │   └── api_client.dart
   ├── ws/
   │   └── ws_client.dart
   ├── storage/
   │   └── app_storage.dart
   ├── theme/
   │   └── app_theme.dart
   └── router/
       └── app_router.dart
   ```

**Verificación**:
```bash
cd apps/mobile && flutter pub get && flutter analyze
# Debe producir: "No issues found!"
```

---

### Sub-hito 0.2: ApiClient base

**Responsabilidad**: Wrapper HTTP centralizado equivalente a `apiFetch()` de la web.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/core/api/api_client.dart`
   - Instancia singleton de `Dio` con `baseUrl` desde `AppConfig.apiBaseUrl`.
   - Interceptor de auth: inyecta `Authorization: Bearer <token>` si existe token en storage.
   - Interceptor de errores: mapea respuestas 4xx/5xx a excepciones tipadas (`ApiException`).
   - Método `get<T>`, `post<T>`, `put<T>`, `delete<T>` tipados.

2. **[NEW]** `apps/mobile/lib/core/api/api_exception.dart`
   - Clases: `ApiException`, `UnauthorizedException`, `NotFoundException`, `ServerException`.
   - Equivalente a la jerarquía `AppError` del backend.

3. **[NEW]** `apps/mobile/lib/core/config/app_config.dart`
   - `apiBaseUrl` — `http://localhost:3000` en debug, configurable por env.
   - `wsBaseUrl` — `ws://localhost:3000`.

**Verificación**:
```bash
cd apps/mobile && flutter test test/core/api/api_client_test.dart
# GET /api/health → 200, cuerpo parseado sin error.
```

---

### Sub-hito 0.3: WsClient base

**Responsabilidad**: Equivalente de `ws-client.ts` — conexión, reconexión automática, stream de eventos.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/core/ws/ws_client.dart`
   - Conecta a `AppConfig.wsBaseUrl/ws`.
   - Expone `Stream<Map<String, dynamic>> events` con broadcast.
   - Reconexión automática con backoff exponencial (max 5 intentos).
   - Métodos: `connect(sessionId)`, `disconnect()`, `send(Map)`.

**Verificación**:
```bash
cd apps/mobile && flutter test test/core/ws/ws_client_test.dart
# Conecta, envía ping, recibe pong (mock server), desconecta sin error.
```

---

### Sub-hito 0.4: AppStorage tipado

**Responsabilidad**: Equivalente de `storage.ts` — keys tipadas, secure para tokens.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/core/storage/app_storage.dart`
   - Enum `StorageKey { authToken, userId, selectedModel, ... }`.
   - `secureRead(StorageKey)` / `secureWrite(StorageKey, value)` via `FlutterSecureStorage`.
   - `prefRead(StorageKey)` / `prefWrite(StorageKey, value)` via `SharedPreferences` para datos no sensibles.

**Verificación**:
```bash
cd apps/mobile && flutter test test/core/storage/app_storage_test.dart
# Write → Read de token retorna el valor correcto.
```

---

### Sub-hito 0.5: Design tokens

**Responsabilidad**: Mapear la paleta de colores, tipografía y espaciados de `index.css` a Dart.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/core/theme/app_theme.dart`
   - `AppColors` — constantes de color mapeadas desde las CSS vars de `index.css` (`--color-primary`, `--color-bg`, etc.).
   - `AppTypography` — `TextStyle`s para heading, body, caption, code.
   - `AppSpacing` — constantes de spacing (4, 8, 12, 16, 24, 32, 48px).
   - `AppTheme.dark()` y `AppTheme.light()` — `ThemeData` completos.

**Verificación**:
```bash
grep -rn "Colors\." apps/mobile/lib/ --include="*.dart" | grep -v "app_theme.dart" | grep -v "_test.dart"
# Debe producir CERO líneas (ningún widget usa Colors.* directamente).
```

---

### Sub-hito 0.6: Script puente de tipos

**Responsabilidad**: Sincronizar contratos Dart desde `packages/shared` sin duplicar manualmente.

**Artefactos**:

1. **[NEW]** `scripts/sync-types.sh`
   ```bash
   #!/usr/bin/env bash
   # Genera lib/core/models/shared_types.dart desde packages/shared
   # Requiere: quicktype (npm install -g quicktype)
   # Uso: ./scripts/sync-types.sh
   ```
   - Exporta JSON Schema desde los tipos Zod de `packages/shared` via script TS auxiliar.
   - Usa `quicktype` para generar clases Dart con `freezed` annotations.
   - Escribe en `apps/mobile/lib/core/models/`.

2. **[NEW]** `scripts/export-shared-schema.ts` — script TS que importa los schemas Zod de `packages/shared` y los serializa a JSON Schema.

3. **[MODIFY]** `package.json` raíz — agrega script `"sync-mobile-types": "bash scripts/sync-types.sh"`.

**Verificación**:
```bash
bash scripts/sync-types.sh
ls apps/mobile/lib/core/models/
# Debe listar al menos: session.dart, agent.dart, project.dart, team.dart
flutter analyze apps/mobile/lib/core/models/
# Cero errores.
```

---

## 4. Verificación Final del Hito 0

```bash
# 1. Sin errores de análisis estático
cd apps/mobile && flutter analyze
# → "No issues found!"

# 2. Tests de smoke pasan
cd apps/mobile && flutter test
# → exit code 0

# 3. Backend no se rompe
cd apps/server && pnpm typecheck
# → exit code 0

# 4. Monorepo entero sigue buildando
cd ../../ && pnpm build
# → exit code 0

# 5. Sin hardcoded colors/spacing fuera del theme
grep -rn "Colors\.\|fontSize:" apps/mobile/lib --include="*.dart" | grep -v "app_theme.dart" | grep -v "_test.dart"
# → cero líneas
```

---

## 5. Restricciones No Negociables

1. **Orden estricto de sub-hitos**: 0.1 → 0.2 → 0.3 → 0.4 → 0.5 → 0.6.
2. **Sin lógica de negocio en este hito**: solo infraestructura y fundación.
3. **Un commit por sub-hito**: `feat(mobile): hito-0.1-flutter-project`, `feat(mobile): hito-0.2-api-client`, etc.
4. **`flutter analyze` en verde al final de cada sub-hito**.
5. **El monorepo no se rompe**: `pnpm build` debe seguir pasando.
6. **Ningún feature screen** se construye en este hito. Solo `core/`.
