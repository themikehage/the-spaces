# Hito 14 — Workspace Files Panel

**Prerequisito**: Hito 12 completado y verificado (H12-A1 a H12-A8 en verde, marcado en `steps.md`).

**Objetivo**: Reemplazar el placeholder `WorkspaceFilesPanel` con un explorador de archivos funcional que conecte con los endpoints reales del backend. El panel vive en la **página 1** del `EntityChatScreen` (swipe derecho desde el chat).

**Sin esto, la navegación Entity-First (H11) entrega una segunda pantalla muerta.**

**Principios innegociables**:
- El panel se renderiza dentro del `PageView` existente — no abre una pantalla nueva.
- Los archivos se cargan por entidad (`entityType` + `entityId`), no por sesión.
- Toda la lógica de datos vive en un `WorkspaceNotifier` — el widget es stateless respecto al estado de red.
- Tap en archivo de texto → preview inline en `BottomSheet`. Tap en imagen → lightbox.
- `flutter analyze` verde antes de pasar al siguiente sub-hito.

---

## 1. Estado Actual (As-Is)

- `apps/mobile/lib/shared/widgets/workspace_files_panel.dart`: widget estático, 84 líneas, muestra un ícono y el texto "Coming in Hito 12". Cero interactividad.
- No existe `WorkspaceNotifier`, ni repositorio de archivos, ni ningún modelo de `WorkspaceFile`.
- El endpoint `/api/agents/:id/files` y `/api/projects/:id/files` existe en el backend.

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

- [ ] **H14-A1** — `WorkspaceFilesPanel` muestra la lista de archivos del workspace de la entidad cargados desde el backend. Estado de carga: skeleton list. Estado de error: banner con botón retry.
- [ ] **H14-A2** — Cada `WorkspaceFileItem` muestra: ícono por tipo (texto/imagen/otro), nombre, tamaño formateado, fecha de modificación.
- [ ] **H14-A3** — Tap en archivo de texto o código (`.md`, `.txt`, `.dart`, `.ts`, `.json`, `.py`, etc.) abre un `BottomSheet` con `SelectableText` y fuente monospace. El sheet tiene botón de copiar al portapapeles.
- [ ] **H14-A4** — Tap en imagen (`.png`, `.jpg`, `.gif`, `.webp`) abre un lightbox con zoom via `InteractiveViewer`.
- [ ] **H14-A5** — El panel tiene barra de búsqueda que filtra por nombre en cliente (sin nueva llamada a red).
- [ ] **H14-A6** — El panel tiene botón de refresh en la topbar del panel (no en el AppBar de EntityChatScreen).
- [ ] **H14-A7** — `flutter analyze lib/shared/widgets/workspace_files_panel.dart lib/features/workspace/` → cero warnings.
- [ ] **H14-A8** — `flutter test test/features/workspace/` → exit code 0.

---

## 3. Sub-hitos (orden estricto)

### Sub-hito 14.1: Modelo, Repositorio y Notifier

**Responsabilidad**: Capa de datos para archivos del workspace.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/workspace/data/models/workspace_file.dart`
   - `WorkspaceFile({ path, name, size, modifiedAt, mimeType })`.
   - `bool get isImage => mimeType?.startsWith('image/') == true`.
   - `bool get isText` → extensiones: md, txt, dart, ts, tsx, js, jsx, json, yaml, yml, py, sh, env, toml, html, css, xml, csv.
   - `String get sizeFormatted` → "12 KB", "1.2 MB", etc.
   - `factory WorkspaceFile.fromJson(Map<String, dynamic>)`.

2. **[NEW]** `apps/mobile/lib/features/workspace/data/workspace_repository.dart`
   - `WorkspaceRepository({ ApiClient client })`.
   - `Future<List<WorkspaceFile>> getFiles({ required String entityType, required String entityId })`.
   - Endpoint: `GET /api/{entityType}s/{entityId}/files` → lista de archivos.
   - `Future<String> getFileContent({ required String entityType, required String entityId, required String path })`.
   - Endpoint: `GET /api/{entityType}s/{entityId}/files/content?path={encodedPath}`.

3. **[NEW]** `apps/mobile/lib/features/workspace/ui/workspace_notifier.dart`
   - `WorkspaceArgs({ entityType, entityId })` — clave del provider family.
   - `WorkspaceState({ isLoading, files, filteredFiles, error, query })`.
   - `WorkspaceNotifier` → `loadFiles()`, `setQuery(String)`, `refresh()`.
   - `filteredFiles` = `files.where((f) => f.name.toLowerCase().contains(query.toLowerCase()))`.
   - Provider: `workspaceNotifierProvider = StateNotifierProvider.autoDispose.family<WorkspaceNotifier, WorkspaceState, WorkspaceArgs>`.

**Verificación**:
```bash
flutter analyze lib/features/workspace/
# → cero warnings
```

---

### Sub-hito 14.2: WorkspaceFilesPanel — lista + búsqueda

**Responsabilidad**: UI principal del panel.

**Artefactos**:

1. **[MODIFY]** `apps/mobile/lib/shared/widgets/workspace_files_panel.dart`
   - Reemplazar el placeholder completo.
   - `ConsumerWidget` que observa `workspaceNotifierProvider(WorkspaceArgs(...))`.
   - Estado loading: `SkeletonList(itemCount: 8)`.
   - Estado error: `Center` con ícono + mensaje + `ElevatedButton('Retry', onPressed: notifier.refresh)`.
   - Estado vacío: ícono `Icons.folder_open_outlined` + texto "No files in workspace".
   - Estado data: `Column` con `TextField` de búsqueda + `ListView.builder` de `WorkspaceFileItem`.
   - El `TextField` llama `notifier.setQuery(value)` en `onChanged`.
   - Botón refresh en la esquina superior derecha del panel (un `TextButton('Refresh')`).

2. **[NEW]** `apps/mobile/lib/features/workspace/ui/widgets/workspace_file_item.dart`
   - `WorkspaceFileItem({ file, onTap })`.
   - Ícono dinámico por tipo: imagen → `Icons.image_outlined`, texto/código → `Icons.description_outlined`, otro → `Icons.insert_drive_file_outlined`.
   - Nombre del archivo en bold, path relativo en muted.
   - Row secundaria: tamaño formateado + separador + fecha `modifiedAt` en formato "Aug 22".
   - `onTap` invocado en `ListTile.onTap`.

**Verificación**:
```bash
flutter analyze lib/shared/widgets/workspace_files_panel.dart lib/features/workspace/ui/
# → cero warnings
```

---

### Sub-hito 14.3: File Preview (texto e imagen)

**Responsabilidad**: Visualización de contenido de archivos inline.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/workspace/ui/widgets/file_preview_sheet.dart`
   - `FilePreviewSheet({ file, entityType, entityId })`.
   - `ConsumerStatefulWidget` que llama `workspaceRepository.getFileContent(...)` en `initState`.
   - Estado cargando: `CircularProgressIndicator` centrado.
   - Estado error: texto de error + botón retry.
   - Si `file.isText`: `SelectableText` con `TextStyle(fontFamily: 'monospace', fontSize: 13)` dentro de un `SingleChildScrollView`.
   - Botón "Copy" en el header del sheet → `Clipboard.setData`.
   - `static void show(BuildContext context, ...)` para apertura estandarizada.

2. **[NEW]** `apps/mobile/lib/features/workspace/ui/widgets/image_lightbox.dart`
   - `ImageLightbox({ imageUrl })`.
   - `Scaffold` con fondo negro, `InteractiveViewer` con `Image.network`, botón X para cerrar.
   - `static void show(BuildContext context, String imageUrl)`.

3. **[MODIFY]** `apps/mobile/lib/features/workspace/ui/widgets/workspace_file_item.dart`
   - `onTap` abre `FilePreviewSheet.show(...)` si `file.isText`.
   - `onTap` abre `ImageLightbox.show(...)` si `file.isImage`.

**Verificación**:
```bash
flutter analyze lib/features/workspace/ui/widgets/
# → cero warnings
```

---

## 4. Verificación Final del Hito 14

```bash
# 1. Análisis estático
cd apps/mobile && flutter analyze lib/shared/widgets/workspace_files_panel.dart lib/features/workspace/
# → "No issues found!"

# 2. Tests
cd apps/mobile && flutter test test/features/workspace/
# → exit code 0

# 3. Sin placeholder
grep -n "Coming in Hito" apps/mobile/lib/shared/widgets/workspace_files_panel.dart
# → cero líneas

# 4. WorkspaceNotifier no conoce ChatNotifier
grep -rn "chatNotifier\|ChatNotifier" apps/mobile/lib/features/workspace/ --include="*.dart"
# → cero líneas

# 5. Sin lógica de preview en WorkspaceFilesPanel (solo en FilePreviewSheet)
grep -n "FilePreviewSheet\|ImageLightbox" apps/mobile/lib/shared/widgets/workspace_files_panel.dart
# → cero líneas (la delegación es vía callback onTap en WorkspaceFileItem)
```

---

## 5. Restricciones No Negociables

1. **Orden estricto**: 14.1 → 14.2 → 14.3.
2. **Un commit por sub-hito**: `feat(mobile): hito-14.1-workspace-data`, etc.
3. **`WorkspaceNotifier` no depende de `ChatNotifier`** — son contextos independientes.
4. **Sin navegación nueva**: preview y lightbox son sheets/dialogs sobre el panel actual.
5. **`flutter analyze` verde** antes de pasar al siguiente sub-hito.
6. **Sin `StreamController` en widgets nuevos** — estado en Riverpod.
7. **Actualizar `steps.md`** al finalizar el hito, marcando H12 también como completado si no está.
