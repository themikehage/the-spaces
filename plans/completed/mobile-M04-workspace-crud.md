# M04 — CRUD de Workspace + Árbol Navegable de Carpetas

**Ámbito**: `apps/mobile/lib/features/workspace/`  
**Problema**: El workspace mobile es completamente de solo lectura. No existe crear/renombrar/borrar/editar. Tocar una carpeta no hace nada (sin árbol expandible). El auto-refresh solo es manual. La experiencia es equivalente a tener un visor de archivos estático vs un gestor completo.  
**Dependencias de hitos anteriores**: Ninguna. Este hito es autónomo.

---

## 1. Estado Actual (As-Is) — Mediciones Concretas

| Punto de medición | Evidencia |
|---|---|
| `workspace_repository.dart:32-57` solo hace `GET /api/workspace` — sin PUT/PATCH/DELETE | Audit confirmado |
| `workspace_files_panel.dart` lista archivos en lista plana; tap en carpeta no navega | Audit L133 |
| `workspace_notifier.dart` no expone métodos de mutación | `grep -n "create\|rename\|delete\|edit" apps/mobile/lib/features/workspace/` → cero resultados esperados |
| No existe `workspace_file_editor.dart` en mobile | Audit L132 |
| El refresh es solo manual (pull-to-refresh) | `workspace_files_panel.dart:100-109,313` |
| El web usa `workspace.service.ts` con PUT/PATCH/DELETE y los endpoints documentados | Fuente: audit |

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

- [x] **A1** — Tocar una carpeta en el workspace panel la expande/colapsa mostrando sus hijos (lazy load vía `GET /api/workspace/{path}`).
- [x] **A2** — Long press o swipe en un archivo muestra opciones: Rename, Delete, Download. Las acciones ejecutan las llamadas API correspondientes.
- [x] **A3** — Existe un botón "+" en el workspace panel que permite: Create File, Create Folder.
- [x] **A4** — Tap en un archivo de texto abre `WorkspaceFileEditor` con el contenido editable y botón "Save" (`PUT` con content).
- [x] **A5** — El árbol se actualiza automáticamente tras eventos WS `agent_end` y `write` tool (auto-refresh por WS).
- [x] **A6** — Download funciona: `GET ...?download=true` → guarda en el directorio de descargas del dispositivo.
- [x] **A7** — Borrar muestra un diálogo de confirmación antes de ejecutar `DELETE`.
- [x] **A8** — Todos los errores de API se muestran con un `SnackBar` de error — nunca silent failures.
- [x] **A9** — `flutter analyze` produce cero errores y cero warnings nuevos.

---

## 3. Hitos Innegociables

---

### Hito 4.A — Extender `WorkspaceRepository` con mutaciones

**Responsabilidad**: Añadir los contratos API que aún no existen en el repositorio. Sin UI todavía.

**Artefactos**:

1. **MODIFICAR** `apps/mobile/lib/features/workspace/repositories/workspace_repository.dart`
   - `Future<WorkspaceFile> createFile({ required String path, required String scope, String content = '' })` → `PUT /api/workspace` con `{ path, type: 'file', content }`.
   - `Future<void> createFolder({ required String path, required String scope })` → `PUT /api/workspace` con `{ path, type: 'directory' }`.
   - `Future<WorkspaceFile> renameFile({ required String oldPath, required String newPath, required String scope })` → `PATCH /api/workspace` con `{ path: oldPath, newPath }`.
   - `Future<void> deleteFile({ required String path, required String scope })` → `DELETE /api/workspace?path={path}&scope`.
   - `Future<WorkspaceFile> saveFile({ required String path, required String scope, required String content })` → `PUT /api/workspace` con `{ path, content }`.
   - `Future<List<WorkspaceFile>> listChildren({ required String path, required String scope })` → `GET /api/workspace/{path}?scope`.
   - `Future<void> downloadFile({ required String path, required String scope, required String localDest })` → `GET /api/workspace?path={path}&download=true` → guarda bytes.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/features/workspace/repositories/
# No issues found!
```

---

### Hito 4.B — Extender `WorkspaceNotifier` con acciones de mutación

**Responsabilidad**: Exponer acciones al UI con manejo de estado de loading/error.

**Artefactos**:

1. **MODIFICAR** `apps/mobile/lib/features/workspace/notifiers/workspace_notifier.dart`
   - Añadir métodos: `createFile`, `createFolder`, `renameFile`, `deleteFile`, `saveFile`, `downloadFile`.
   - Cada método: set `isLoading = true` → llama al repositorio → actualiza el árbol de archivos en estado → set `isLoading = false`. En error: set `error` para que el UI lo muestre.
   - Añadir método `loadChildren(String path)` para lazy expand de carpetas.
   - Añadir método `refreshOnAgentEnd()` llamado desde el WS listener.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/features/workspace/notifiers/
# No issues found!
```

---

### Hito 4.C — Árbol navegable en `WorkspaceFilesPanel`

**Responsabilidad**: Reemplazar la lista plana por un árbol expandible con lazy loading.

**Artefactos**:

1. **NUEVO** `apps/mobile/lib/features/workspace/widgets/workspace_tree_node.dart`
   - Widget recursivo para un nodo (archivo o carpeta).
   - Carpeta: `ExpansionTile` que al expandirse llama `notifier.loadChildren(path)`.
   - Archivo: `ListTile` con icono, nombre, tamaño, acciones (long press).
   - Muestra `CircularProgressIndicator` mientras carga los hijos.

2. **MODIFICAR** `apps/mobile/lib/features/workspace/widgets/workspace_files_panel.dart`
   - Reemplazar el `ListView` plano por un `ListView` de `WorkspaceTreeNode`.
   - Mantener el buscador y pull-to-refresh existentes.
   - Añadir botón "+" en el `AppBar` o toolbar.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/features/workspace/widgets/
# No issues found!
```

---

### Hito 4.D — Dialogs de acción (crear, renombrar, borrar)

**Responsabilidad**: UX de las operaciones de mutación.

**Artefactos**:

1. **NUEVO** `apps/mobile/lib/features/workspace/widgets/workspace_action_dialogs.dart`
   - `showCreateDialog(BuildContext, {bool isFolder})` → `AlertDialog` con `TextField` para el nombre. On confirm → `notifier.createFile` o `notifier.createFolder`.
   - `showRenameDialog(BuildContext, WorkspaceFile)` → `AlertDialog` con `TextField` pre-rellenado. On confirm → `notifier.renameFile`.
   - `showDeleteConfirmDialog(BuildContext, WorkspaceFile)` → `AlertDialog` de confirmación. On confirm → `notifier.deleteFile`.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/features/workspace/widgets/workspace_action_dialogs.dart
# No issues found!
```

---

### Hito 4.E — `WorkspaceFileEditor` (edición inline de texto)

**Responsabilidad**: Editor de archivos de texto con save.

**Artefactos**:

1. **NUEVO** `apps/mobile/lib/features/workspace/widgets/workspace_file_editor.dart`
   - `StatefulWidget` con `TextEditingController` inicializado con el contenido del archivo.
   - `AppBar` con botón "Save" y botón "Cancel".
   - On Save → `notifier.saveFile(path, content)` → pop.
   - Muestra loading overlay durante el guardado.
   - Solo se abre para archivos de texto (no binarios). Los binarios siguen abriendo el preview existente.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/features/workspace/
# No issues found!
```

---

### Hito 4.F — Auto-refresh por WebSocket

**Responsabilidad**: El workspace se actualiza automáticamente cuando el agente escribe archivos.

**Artefactos**:

1. **MODIFICAR** `apps/mobile/lib/features/chat/notifiers/chat_notifier.dart`
   - En el handler del evento WS `agent_end`: llamar `workspaceNotifier.refreshOnAgentEnd()` si el workspace panel está activo.
   - En el handler del evento `tool_execution_end` con tool name `write` o `edit`: ídem.

2. **Alternativa más limpia** (preferida si existe un event bus en mobile):
   - Emitir un evento interno al finalizar `agent_end`.
   - El `WorkspaceNotifier` se suscribe y llama `refresh()`.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/
# No issues found!

flutter test apps/mobile/test/
# Exit code 0
```

---

## 4. Restricciones No Negociables

1. **Orden estricto de hitos**: 4.A (repo) → 4.B (notifier) → 4.C (tree UI) → 4.D (dialogs) → 4.E (editor) → 4.F (WS refresh).
2. **Ningún archivo > 300 líneas**. Si `workspace_files_panel.dart` crece, extraer `_FileSearchBar` y `_FileActions` como widgets.
3. **Sin cambios de comportamiento en el preview existente** (`file_preview_sheet.dart`, `image_lightbox.dart`). Solo se extiende.
4. **Error handling obligatorio**: todo método async del notifier tiene try/catch con `state = state.copyWith(error: e.toString())`.
5. **Un commit por hito**: `feat(mobile/workspace): M04-A repository mutations`, etc.
6. **`flutter analyze` en verde** al final de cada hito.
7. **El borrar siempre pide confirmación** — nunca borrado silencioso.
