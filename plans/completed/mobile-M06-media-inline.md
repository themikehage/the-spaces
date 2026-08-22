# M06 — Media Inline en Mensajes (HTML, PDF, Audio, Video)

**Ámbito**: `apps/mobile/lib/features/chat/widgets/` — bloques de mensaje.  
**Problema**: El web renderiza HTML embebido, PDFs inline, audio y video directamente en los mensajes del agente. En mobile no existe ningún bloque de media — estos contenidos simplemente no se muestran o caen al fallback genérico.  
**Dependencias de hitos anteriores**: M01 (auth images). M02 opcional (los componentes `cu_audio`, `cu_video`, `cu_pdf`, `cu_html` de M02 son la base reutilizable).

---

## 1. Estado Actual (As-Is) — Mediciones Concretas

| Punto de medición | Evidencia |
|---|---|
| `markdown_block.dart` no tiene handlers para bloques de tipo `html`, `pdf`, `audio`, `video` | Audit L69-70 |
| `message_bubble.dart` no detecta ni renderiza bloques de media en el contenido del mensaje | Audit L63-76 |
| Web: `MessageBlocks.tsx:114-191` despacha bloques por tipo con renderers específicos | Fuente: audit |
| No existe `media_block.dart` ni equivalente en mobile | `grep -r "MediaBlock\|AudioPlayer\|VideoPlayer\|PdfViewer" apps/mobile/lib/features/chat/` → cero resultados esperados |
| `tool_call_card.dart` existe para tool results, pero no hay bloques de media en texto del mensaje | Audit L33 |

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

- [x] **A1** — El contenido de un mensaje que contiene un bloque `<audio src="...">` muestra un `AudioBlock` con controles de reproducción (o botón "Abrir") en el bubble.
- [x] **A2** — Un bloque `<video src="...">` muestra un `VideoBlock` con thumbnail (si disponible) y botón "Abrir".
- [x] **A3** — Una referencia a PDF (URL terminada en `.pdf` o tag `<pdf>`) muestra un `PdfBlock` con botón "Abrir PDF" via `url_launcher`.
- [x] **A4** — HTML inline (`<html>` tag o resultado de `render_html`) muestra un `HtmlBlock` en `WebView` si `webview_flutter` está disponible, o un botón "Abrir en navegador" como fallback.
- [x] **A5** — `RichMarkdown`: syntax highlighting en bloques de código (usando `flutter_highlight` o librería existente). Botón "Copy" por bloque de código.
- [x] **A6** — Los bloques de media se detectan en el parser de contenido del mensaje, no en el markdown genérico.
- [x] **A7** — `flutter analyze` produce cero errores y cero warnings nuevos.
- [x] **A8** — Ningún bloque de media crashea si la URL es inaccesible o el formato es inválido.

---

## 3. Hitos Innegociables

---

### Hito 6.A — Parser de bloques de mensaje (`MessageBlockParser`)

**Responsabilidad**: Separar el contenido de un mensaje en bloques tipados antes de renderizarlo.

**Artefactos**:

1. **NUEVO** `apps/mobile/lib/features/chat/models/message_block.dart`
   - Sealed class / union type: `MarkdownBlockData`, `AudioBlockData`, `VideoBlockData`, `PdfBlockData`, `HtmlBlockData`, `CodeBlockData`.
   - Cada subtipo tiene los campos necesarios (url, mimeType, alt, etc.).

2. **NUEVO** `apps/mobile/lib/features/chat/utils/message_block_parser.dart`
   - Función pura: `List<MessageBlock> parseBlocks(String content)`.
   - Detecta patterns:
     - `<audio src="...">` → `AudioBlock(url)`
     - `<video src="...">` → `VideoBlock(url, thumbnail?)`
     - URL terminada en `.pdf` o `<pdf src="...">` → `PdfBlock(url)`
     - `<html>...</html>` → `HtmlBlock(content)`
     - Bloques de código ` ```lang...``` ` → `CodeBlock(lang, content)`
     - Todo lo demás → `MarkdownBlock(content)`
   - La función es pura y testeable de forma aislada.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/features/chat/models/
flutter analyze apps/mobile/lib/features/chat/utils/
# No issues found!

flutter test apps/mobile/test/features/chat/message_block_parser_test.dart
# Exit code 0 — test de casos: audio, video, pdf, html, code, markdown puro
```

---

### Hito 6.B — Widgets de bloques de media

**Responsabilidad**: Un widget por tipo de bloque, independiente del mensaje.

**Artefactos** (todos en `apps/mobile/lib/features/chat/ui/widgets/message_blocks/`):

1. `audio_block.dart`
   - Si `just_audio` o `audioplayers` está en `pubspec.yaml` → controles nativos.
   - Fallback: botón "Abrir audio" vía `url_launcher`.

2. `video_block.dart`
   - Si `video_player` está en `pubspec.yaml` → thumbnail + play inline.
   - Fallback: botón "Abrir video" vía `url_launcher`.

3. `pdf_block.dart`
   - Botón "Abrir PDF" vía `url_launcher` siempre. Sin iframe (mobile no lo soporta bien).
   - Si existe `flutter_pdfview` → preview de la primera página como thumbnail.

4. `html_block.dart`
   - Si `webview_flutter` está en `pubspec.yaml` → `WebView` con `initialData`.
   - Fallback: botón "Abrir en navegador" con `url_launcher`.

5. `code_block.dart`
   - Bloque de código con syntax highlighting (usar la librería ya presente en `pubspec.yaml`).
   - Header con el lenguaje y botón "Copy".
   - Fondo oscuro monoespaciado independientemente del tema.

**Regla**: verificar `pubspec.yaml` ANTES de referenciar cualquier paquete. Si no existe, usar el fallback con `url_launcher`.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/features/chat/ui/widgets/message_blocks/
# No issues found!
```

---

### Hito 6.C — Integración en `MessageBubble`

**Responsabilidad**: El bubble usa el parser y renderiza cada bloque con su widget.

**Artefactos**:

1. **MODIFICAR** `apps/mobile/lib/features/chat/ui/widgets/message_bubble.dart`
   - Reemplazar el render directo de `MarkdownBlock(content)` por:
     ```dart
     final blocks = MessageBlockParser.parseBlocks(message.content);
     Column(children: blocks.map(_renderBlock).toList())
     ```
   - Método `_renderBlock(MessageBlock block)` → switch sobre el tipo → widget correspondiente.
   - `MarkdownBlock` → `MarkdownBlock` widget (existente, con `authToken`).
   - `CodeBlock` → `CodeBlockWidget` (nuevo de 6.B).
   - `AudioBlock`, `VideoBlock`, `PdfBlock`, `HtmlBlock` → widgets de 6.B.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/features/chat/ui/widgets/message_bubble.dart
# No issues found!

flutter test apps/mobile/test/
# Exit code 0
```

---

## 4. Restricciones No Negociables

1. **El parser es una función pura** — sin side effects, testeable con `flutter_test` sin contexto de widgets.
2. **Verificar `pubspec.yaml` antes de usar cualquier dependencia de media**. Si no existe, usar el fallback de `url_launcher`.
3. **Sin crash si URL es inaccesible**: todos los widgets de media tienen estado de error visible (icono + mensaje breve).
4. **Un commit por hito**: `feat(mobile/chat): M06-A block parser`, `feat(mobile/chat): M06-B media widgets`, `feat(mobile/chat): M06-C bubble integration`.
5. **`flutter analyze` en verde** al final de cada hito.
6. **El parser de M06-A tiene tests unitarios** — mínimo un test por tipo de bloque detectado.
