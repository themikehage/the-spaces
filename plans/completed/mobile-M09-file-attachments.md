# M09 — Adjuntos de Archivo (Upload Multipart al Workspace)

**Ámbito**: `apps/mobile/lib/features/chat/widgets/chat_input_bar.dart`, repositorio y notifier de chat.  
**Problema**: Mobile solo permite adjuntar imágenes del dispositivo (base64 inline en el prompt). El web permite adjuntar cualquier archivo, subirlo al workspace vía `POST /api/workspace/assets/uploads` multipart, y documentos <100 KB se insertan inline como code block. En mobile no existe upload multipart ni soporte para archivos no-imagen.  
**Dependencias de hitos anteriores**: M04 (CRUD workspace, repositorio base). M01 para la preview de imágenes adjuntas.

---

## 1. Estado Actual (As-Is) — Mediciones Concretas

| Punto de medición | Evidencia |
|---|---|
| `chat_notifier.dart:363-383` usa `ImagePicker.pickImage` para imágenes | Solo imágenes del device |
| `chat_notifier.dart:414-428` convierte la imagen a base64 inline en el prompt | Sin upload al servidor |
| No existe llamada a `POST /api/workspace/assets/uploads` en mobile | `grep -r "uploads\|multipart\|FilePicker" apps/mobile/` → cero resultados esperados |
| Web: `ChatInput.tsx:113-197` hace upload multipart y obtiene una URL de workspace | Fuente: audit |
| Web: `ChatInput.tsx:38-111` inserta docs <100KB como code block inline | Fuente: audit |
| Web: `AttachmentPreview.tsx` muestra thumbnail + KB | Mobile: solo thumbnail de imagen |
| Web: `UserBubble.tsx:18-32,147-186` renderiza `[Attached File: path]` como card descargable | No existe en mobile |

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

- [ ] **A1** — El botón de adjuntar en el input permite seleccionar cualquier archivo (no solo imágenes) usando `file_picker` o equivalente.
- [ ] **A2** — Archivos > 100 KB: se suben al workspace vía `POST /api/workspace/assets/uploads` multipart y se insertan como `[Attached File: path]` en el prompt.
- [ ] **A3** — Archivos ≤ 100 KB de texto: se insertan inline como code block con el lenguaje detectado por extensión.
- [ ] **A4** — Imágenes siguen funcionando con el flujo base64 existente (no se rompe el comportamiento actual).
- [ ] **A5** — La preview del adjunto muestra: nombre del archivo, extensión, tamaño formateado, botón de eliminar.
- [ ] **A6** — En el bubble de usuario, los adjuntos de tipo `[Attached File: path]` se renderizan como una card con nombre, extensión y botón de descarga (usa lógica de M04 si disponible).
- [ ] **A7** — Si el upload falla, se muestra un `SnackBar` de error y el archivo NO se agrega al prompt.
- [ ] **A8** — `flutter analyze` produce cero errores y cero warnings nuevos.

---

## 3. Hitos Innegociables

---

### Hito 9.A — `FileUploadRepository` (upload multipart)

**Responsabilidad**: Encapsular el upload multipart al endpoint del workspace.

**Artefactos**:

1. **NUEVO** `apps/mobile/lib/features/chat/repositories/file_upload_repository.dart`
   - Método `uploadFile({ required String filePath, required String scope })` → `Future<UploadedFile>`.
   - Usa `http.MultipartRequest` con `POST /api/workspace/assets/uploads`.
   - Header `Authorization: Bearer $token`.
   - Retorna `UploadedFile({ required String path, required String url, required int sizeBytes })`.
   - Timeout de 30 segundos. On error → lanza `AppException` (o equivalente en mobile) con mensaje legible.

2. **NUEVO** `apps/mobile/lib/features/chat/models/uploaded_file.dart`
   - Clase inmutable: `UploadedFile({ required String path, required String url, required int sizeBytes, required String name, required String extension })`.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/features/chat/repositories/file_upload_repository.dart
# No issues found!
```

---

### Hito 9.B — Selección de archivos con `FilePicker` + clasificación

**Responsabilidad**: Ampliar el flujo de selección de archivos para soportar cualquier tipo.

**Artefactos**:

1. **NUEVO** `apps/mobile/lib/features/chat/utils/file_classifier.dart`
   - Función pura: `FileType classifyFile(String path, int sizeBytes)`.
   - `FileType` enum: `inlineImage`, `inlineText`, `uploadRequired`.
   - `inlineImage`: extensión en `[jpg, jpeg, png, gif, webp]`.
   - `inlineText`: extensión de texto Y tamaño ≤ 100 * 1024 bytes.
   - `uploadRequired`: cualquier otro caso.
   - Función pura, testeable sin contexto.

2. **MODIFICAR** `apps/mobile/lib/features/chat/notifiers/chat_notifier.dart`
   - Reemplazar `ImagePicker.pickImage` por `FilePicker.platform.pickFiles(allowMultiple: false)` (verificar que `file_picker` está en `pubspec.yaml`; si no, añadirlo).
   - Usar `FileClassifier.classifyFile(path, size)` para determinar el tratamiento.
   - `inlineImage` → flujo base64 existente (sin cambios).
   - `inlineText` → leer bytes → insertar como code block en el draft del mensaje.
   - `uploadRequired` → llamar `FileUploadRepository.uploadFile` → insertar `[Attached File: $path]`.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/features/chat/utils/file_classifier.dart
flutter analyze apps/mobile/lib/features/chat/notifiers/chat_notifier.dart

flutter test apps/mobile/test/utils/file_classifier_test.dart
# Exit code 0 — tests para los 3 tipos de clasificación
```

---

### Hito 9.C — Preview de adjuntos en `ChatInputBar`

**Responsabilidad**: Mostrar los adjuntos pendientes con nombre, tamaño y botón de eliminar.

**Artefactos**:

1. **NUEVO** `apps/mobile/lib/features/chat/widgets/attachment_preview_bar.dart`
   - Row horizontal scrollable de chips de adjuntos.
   - Cada chip: icono de tipo (imagen/texto/genérico), nombre truncado, tamaño formateado, botón "×".
   - Tap en "×" → `chatNotifier.removeAttachment(index)`.
   - Visible solo cuando hay adjuntos pendientes.

2. **MODIFICAR** `apps/mobile/lib/features/chat/widgets/chat_input_bar.dart`
   - Montar `AttachmentPreviewBar` encima del input cuando `state.pendingAttachments.isNotEmpty`.
   - Sin romper el layout existente.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/features/chat/widgets/
# No issues found!
```

---

### Hito 9.D — Render de adjuntos en `UserBubble`

**Responsabilidad**: Mostrar `[Attached File: path]` como card descargable en el historial.

**Artefactos**:

1. **NUEVO** `apps/mobile/lib/features/chat/widgets/attached_file_card.dart`
   - Card con: icono de tipo, nombre del archivo, extensión (chip), tamaño formateado.
   - Botón "Download": llama al endpoint de descarga del workspace (M04) si disponible, o `url_launcher` como fallback.

2. **MODIFICAR** `apps/mobile/lib/features/chat/widgets/message_bubble.dart` (o `user_bubble.dart` si existe)
   - Parser que detecta `[Attached File: path]` en el contenido del mensaje de usuario.
   - Renderiza `AttachedFileCard` para cada match.
   - El texto `[Attached File: ...]` no se muestra en bruto al usuario.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/features/chat/
# No issues found!

flutter test apps/mobile/test/
# Exit code 0
```

---

## 4. Restricciones No Negociables

1. **El flujo de imágenes base64 existente NO se rompe**. `inlineImage` sigue el camino original.
2. **El upload multipart tiene timeout de 30 segundos** con feedback de progreso (indeterminate `LinearProgressIndicator` en el chip de adjunto durante la subida).
3. **Si el upload falla: SnackBar de error + el archivo no se agrega al draft**. Nunca mensaje silencioso.
4. **`file_classifier.dart` es una función pura con tests unitarios** — mínimo 6 tests (2 por tipo).
5. **Verificar `pubspec.yaml`** antes de usar `file_picker`. Si no existe, añadir la versión compatible con el SDK de Flutter del proyecto.
6. **Un commit por hito**: `feat(mobile/chat): M09-A upload repository`, etc.
7. **`flutter analyze` en verde** al final de cada hito.
8. **M04 debe estar disponible** para el botón de descarga en `AttachedFileCard`. Si no, usar `url_launcher` como fallback explícito.
