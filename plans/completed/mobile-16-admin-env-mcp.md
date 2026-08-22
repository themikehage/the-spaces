# Hito 16 — Admin: Env Vars + MCP Marketplace

**Prerequisito**: Hito 15 completado y verificado.

**Objetivo**: Implementar las dos áreas administrativas de mayor prioridad que actualmente son placeholders en el drawer: **Env Vars** (gestión de variables de entorno del workspace) y **MCP Marketplace** (catálogo de servidores MCP con install/disconnect y editor raw). Estas son las más usadas por los usuarios power.

**Sin esto, los usuarios no pueden configurar el entorno ni los tools desde mobile.**

**Principios innegociables**:
- Cada área es una pantalla independiente accesible desde el drawer.
- Los valores de env vars se revelan bajo demanda (no se muestran en texto plano al cargar).
- El raw editor del `mcp-servers.json` es un `TextField` multilínea con validación JSON — no un editor de nodos.
- `ApiClient` es la única capa de red — sin `http.Client` directo en los notifiers.
- `flutter analyze` verde antes de pasar al siguiente sub-hito.

---

## 1. Estado Actual (As-Is)

- `AppDrawer` tiene items "Env Vars" y "MCP" que navegan a rutas `/env-vars` y `/mcp`.
- Ambas rutas no existen en `app_router.dart` — al pulsar no navega o muestra error 404.
- No existe ningún archivo en `lib/features/env_vars/` ni `lib/features/mcp/`.
- Endpoint `/api/env` → CRUD de variables. Endpoint `/api/mcp` → GET/POST de servers config.

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

### Env Vars
- [ ] **H16-A1** — La pantalla `/env-vars` lista todas las variables del workspace. Cada item muestra: nombre (KEY), valor enmascarado `••••••••`, fecha.
- [ ] **H16-A2** — Tap en el ícono de ojo revela/oculta el valor de esa variable (toggle local, sin llamada extra a red).
- [ ] **H16-A3** — FAB "+" abre un `BottomSheet` para añadir nueva variable: campo KEY (uppercase enforced) + campo VALUE (obscured por defecto con toggle).
- [ ] **H16-A4** — Swipe-to-delete en cada item (con `Dismissible`) + confirmación `AlertDialog`.
- [ ] **H16-A5** — Editor bulk: botón "Edit .env" abre un `BottomSheet` con `TextField` multilínea prellenado con todas las vars en formato `KEY=VALUE`. Al guardar → `POST /api/env/bulk`.

### MCP Marketplace
- [ ] **H16-A6** — La pantalla `/mcp` tiene 2 tabs: **Servers** (lista de servidores configurados) y **Raw** (editor JSON del `mcp-servers.json`).
- [ ] **H16-A7** — Tab Servers: lista de servidores con nombre, tipo de transporte (stdio/http), badge de estado (connected/disconnected/error). Botón de reconexión por item.
- [ ] **H16-A8** — FAB "+" en tab Servers abre un form para añadir servidor custom: nombre, tipo (stdio/http), comando o URL, variables de entorno del servidor.
- [ ] **H16-A9** — Tab Raw: `TextField` multilínea con el JSON actual de `mcp-servers.json`. Botón "Save" → `POST /api/mcp` con el JSON editado. Validación JSON antes de enviar (si inválido → `SnackBar` de error, sin llamada a red).
- [ ] **H16-A10** — `flutter analyze lib/features/env_vars/ lib/features/mcp/` → cero warnings.
- [ ] **H16-A11** — `flutter test test/features/env_vars/ test/features/mcp/` → exit code 0.

---

## 3. Sub-hitos (orden estricto)

### Sub-hito 16.1: Rutas y scaffolding de pantallas

**Responsabilidad**: Registrar las rutas en el router y crear las pantallas con estructura vacía.

**Artefactos**:

1. **[MODIFY]** `apps/mobile/lib/core/router/app_router.dart`
   - Añadir ruta `GoRoute(path: '/env-vars', builder: (_, __) => const EnvVarsScreen())` dentro del branch de shell o como ruta raíz (con bottom nav visible).
   - Añadir ruta `GoRoute(path: '/mcp', builder: (_, __) => const McpScreen())`.

2. **[NEW]** `apps/mobile/lib/features/env_vars/ui/env_vars_screen.dart`
   - `EnvVarsScreen` — `ConsumerWidget` con `Scaffold` y `AppBar(title: Text('Env Vars'))`.
   - Body placeholder: `Center(child: CircularProgressIndicator())` — se rellena en 16.2.

3. **[NEW]** `apps/mobile/lib/features/mcp/ui/mcp_screen.dart`
   - `McpScreen` — `ConsumerWidget` con `Scaffold`, `AppBar` y `TabBar` (Servers | Raw).
   - Body placeholder por tab — se rellena en 16.3 y 16.4.

**Verificación**:
```bash
# Navegar a /env-vars y /mcp desde el drawer no produce error de ruta
grep -n "env-vars\|/mcp" apps/mobile/lib/core/router/app_router.dart
# → al menos 2 líneas
flutter analyze lib/core/router/app_router.dart
# → cero warnings
```

---

### Sub-hito 16.2: Env Vars — datos y lista

**Responsabilidad**: Capa de datos + lista funcional con reveal, add y delete.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/env_vars/data/models/env_var.dart`
   - `EnvVar({ key, value, createdAt })`.
   - `factory EnvVar.fromJson(Map<String, dynamic>)`.

2. **[NEW]** `apps/mobile/lib/features/env_vars/data/env_vars_repository.dart`
   - `getEnvVars()` → `GET /api/env` → `List<EnvVar>`.
   - `addEnvVar({ key, value })` → `POST /api/env` con `{ key, value }`.
   - `deleteEnvVar(String key)` → `DELETE /api/env/:key`.
   - `bulkSaveEnvVars(String dotEnvContent)` → `POST /api/env/bulk` con `{ content: dotEnvContent }`.

3. **[NEW]** `apps/mobile/lib/features/env_vars/ui/env_vars_notifier.dart`
   - `EnvVarsState({ isLoading, vars, revealedKeys, error })`.
   - `EnvVarsNotifier` → `load()`, `toggleReveal(String key)`, `addVar({ key, value })`, `deleteVar(String key)`, `bulkSave(String content)`.
   - `revealedKeys`: `Set<String>` — `toggleReveal` añade o elimina la key del set.

4. **[MODIFY]** `apps/mobile/lib/features/env_vars/ui/env_vars_screen.dart`
   - Observa `envVarsNotifierProvider`.
   - `ListView.builder` de `EnvVarListItem`.
   - `FloatingActionButton` → abre `AddEnvVarSheet`.
   - Botón "Edit .env" en el `AppBar actions` → abre `BulkEnvEditorSheet`.

5. **[NEW]** `apps/mobile/lib/features/env_vars/ui/widgets/env_var_list_item.dart`
   - `EnvVarListItem({ envVar, isRevealed, onToggleReveal, onDelete })`.
   - Nombre KEY en monospace bold + valor `isRevealed ? envVar.value : '••••••••'`.
   - `IconButton(Icons.visibility_outlined)` para toggle reveal.
   - `Dismissible` para delete con `AlertDialog` de confirmación.

6. **[NEW]** `apps/mobile/lib/features/env_vars/ui/widgets/add_env_var_sheet.dart`
   - `TextField` para KEY (transforma a uppercase en `onChanged`).
   - `TextField` para VALUE (obscured, con toggle ojo).
   - Botón "Add" → `notifier.addVar(key: _key, value: _value)` → cierra el sheet.

7. **[NEW]** `apps/mobile/lib/features/env_vars/ui/widgets/bulk_env_editor_sheet.dart`
   - `TextField` multilínea prellenado con `vars.map((v) => '${v.key}=${v.value}').join('\n')`.
   - Botón "Save" → `notifier.bulkSave(content)` → cierra el sheet.

**Verificación**:
```bash
flutter analyze lib/features/env_vars/
# → cero warnings
# La lista muestra vars con valores enmascarados. Tap ojo → valor visible. Swipe → delete con confirm.
```

---

### Sub-hito 16.3: MCP — Tab Servers

**Responsabilidad**: Lista de servidores MCP configurados con estado y formulario de alta.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/mcp/data/models/mcp_server.dart`
   - `McpServer({ name, transport, command, url, status, env })`.
   - `transport`: `'stdio' | 'http'`.
   - `status`: `'connected' | 'disconnected' | 'error'`.
   - `factory McpServer.fromJson(Map<String, dynamic>)`.

2. **[NEW]** `apps/mobile/lib/features/mcp/data/mcp_repository.dart`
   - `getServers()` → `GET /api/mcp` → `List<McpServer>`.
   - `saveConfig(String rawJson)` → `POST /api/mcp` con el JSON string.
   - `reconnectServer(String name)` → `POST /api/mcp/:name/reconnect`.

3. **[NEW]** `apps/mobile/lib/features/mcp/ui/mcp_notifier.dart`
   - `McpState({ isLoading, servers, rawJson, error })`.
   - `McpNotifier` → `load()`, `reconnect(String name)`, `saveRaw(String json)`.

4. **[NEW]** `apps/mobile/lib/features/mcp/ui/widgets/mcp_server_list_item.dart`
   - `McpServerListItem({ server, onReconnect })`.
   - Nombre + badge de transporte (stdio/http) + `StatusDot` por estado.
   - Botón reconnect (ícono refresh) si `status != 'connected'`.

5. **[NEW]** `apps/mobile/lib/features/mcp/ui/widgets/add_mcp_server_sheet.dart`
   - Campos: nombre (TextField), tipo (SegmentedButton stdio/http), comando (si stdio) o URL (si http).
   - Al guardar → modifica el `rawJson` del notifier y llama `saveRaw(updatedJson)`.

**Verificación**:
```bash
flutter analyze lib/features/mcp/
# → cero warnings
```

---

### Sub-hito 16.4: MCP — Tab Raw

**Responsabilidad**: Editor raw del JSON de configuración de MCP.

**Artefactos**:

1. **[MODIFY]** `apps/mobile/lib/features/mcp/ui/mcp_screen.dart`
   - Tab "Raw": `TextField` multilínea observando `mcpState.rawJson`.
   - Botón "Save" en `AppBar actions` activo solo si tab Raw está visible.
   - Al pulsar "Save":
     1. Intenta `jsonDecode(content)` → si falla, `ScaffoldMessenger.showSnackBar('Invalid JSON')` y no llama al servidor.
     2. Si válido → `notifier.saveRaw(content)`.
   - Fuente monospace, `expands: true`, scroll.

**Verificación**:
```bash
flutter analyze lib/features/mcp/ui/mcp_screen.dart
# → cero warnings
# JSON inválido → SnackBar de error, sin llamada de red.
# JSON válido → POST /api/mcp enviado.
```

---

## 4. Verificación Final del Hito 16

```bash
# 1. Análisis estático
cd apps/mobile && flutter analyze lib/features/env_vars/ lib/features/mcp/
# → "No issues found!"

# 2. Tests
cd apps/mobile && flutter test test/features/env_vars/ test/features/mcp/
# → exit code 0

# 3. Rutas registradas
grep -n "env-vars\|/mcp" apps/mobile/lib/core/router/app_router.dart | wc -l
# → 2 líneas (una por ruta)

# 4. Sin jsonDecode sin validación en notifiers
grep -rn "jsonDecode" apps/mobile/lib/features/mcp/ui/ --include="*.dart" | grep -v "mcp_screen"
# → cero líneas (solo la pantalla valida, el notifier guarda el string raw)

# 5. Valores enmascarados al cargar (no en texto plano)
grep -n "envVar.value" apps/mobile/lib/features/env_vars/ui/widgets/env_var_list_item.dart
# → solo dentro de bloque `isRevealed ? ... : '••••••••'`

# 6. Drawer actualizado (rutas funcionan)
grep -n "env-vars\|/mcp" apps/mobile/lib/shared/widgets/app_drawer.dart
# → 2 líneas
```

---

## 5. Restricciones No Negociables

1. **Orden estricto**: 16.1 → 16.2 → 16.3 → 16.4.
2. **Un commit por sub-hito**: `feat(mobile): hito-16.1-env-vars-routes`, etc.
3. **Sin valores de env vars en texto plano** al renderizar la lista — siempre enmascarados por defecto.
4. **Validación JSON antes de POST** en el editor raw — el notifier nunca llama al server con JSON inválido.
5. **`McpNotifier` guarda el JSON como string** — no lo parsea ni lo convierte a modelo complejo. El servidor es la fuente de verdad del schema.
6. **`flutter analyze` verde** antes de pasar al siguiente sub-hito.
7. **Actualizar `steps.md`** al finalizar.
