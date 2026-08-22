# M02 — Custom UI Renderer (21 componentes declarativos)

**Ámbito**: `apps/mobile/lib/features/chat/widgets/tools/`  
**Problema**: El web tiene `CustomUiRenderer` con 21 componentes declarativos (card, tabs, steps, timeline, diff, stats, metric, progress, badge, markdown, code, table, section, audio, video, pdf, html, accordion, card-list, custom-html). En mobile no existe ninguno. Cuando el agente usa `render_html`, `render_chart`, `render_images` o cualquier custom UI tool, el mobile muestra solo el fallback JSON genérico.  
**Dependencias de hitos anteriores**: M01 (auth images) — el renderer de imágenes necesita el `AuthenticatedImageProvider`.

---

## 1. Estado Actual (As-Is) — Mediciones Concretas

| Punto de medición | Evidencia |
|---|---|
| `tools/tool_result_router.dart` despacha 5 renderers + `_GenericCard` | Archivo confirmado en audit |
| No existe ningún archivo `custom_ui_renderer.dart` en el proyecto | `grep -r "CustomUiRenderer" apps/mobile/` → cero resultados |
| Tool results de tipo `render_html`, `render_chart`, `render_images` caen al fallback genérico JSON | `tool_result_router.dart` sin case para esos tool names |
| Web: `ToolResultRouter.tsx:41-501` tiene ~30 cases con renderers especializados | Fuente: audit |

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

- [x] **A1** — `tool_result_router.dart` despacha a `CustomUiRenderer` para tool names: `render_html`, `render_chart`, `render_images`, `generate_image`, y cualquier result con `customUi` en el payload.
- [x] **A2** — Implementados los siguientes componentes como widgets Flutter independientes (un archivo por componente):
  - `cu_card.dart`, `cu_tabs.dart`, `cu_steps.dart`, `cu_timeline.dart`
  - `cu_stats.dart`, `cu_metric.dart`, `cu_progress.dart`, `cu_badge.dart`
  - `cu_markdown.dart`, `cu_code.dart`, `cu_table.dart`, `cu_section.dart`
  - `cu_accordion.dart`, `cu_card_list.dart`
  - `cu_image_grid.dart` (con `AuthenticatedImageProvider` de M01)
  - `cu_audio.dart`, `cu_video.dart` (placeholder con icono si el codec no está disponible)
  - `cu_pdf.dart` (visor de PDF con botón para copiar/descargar)
  - `cu_html.dart` (visor de HTML con toggle formatted / raw)
  - `cu_diff.dart` (diff de texto con colores añadir/quitar)
- [x] **A3** — `CustomUiRenderer` (`custom_ui_renderer.dart`) actúa como dispatcher: lee el campo `type` del payload y retorna el widget correspondiente. Si el tipo es desconocido, muestra el fallback estilizado.
- [x] **A4** — Ningún componente supera 300 líneas (regla de backend adaptada a Flutter).
- [x] **A5** — `flutter analyze` produce cero errores y cero warnings nuevos.
- [x] **A6** — Prueba manual y automatizada: tool result de tipo `render_images` muestra `ImageGrid` autenticado; `render_html` muestra HTML format; tipo desconocido muestra fallback.

---

## 3. Hitos Innegociables

---

### Hito 2.A — Scaffold del sistema (`CustomUiRenderer` + dispatcher)

**Responsabilidad**: Establecer el punto de entrada y el contrato de datos antes de implementar componentes.

**Artefactos**:

1. **NUEVO** `apps/mobile/lib/features/chat/ui/widgets/tools/custom_ui/custom_ui_renderer.dart`
   - Clase `CustomUiRenderer extends StatelessWidget`.
   - Constructor: `({ required dynamic ui, Map<String, dynamic>? presentation, String? authToken, String? sessionId })`.
   - Dispatch sobre el campo `type` del payload.
   - Fallback a widget de error/info estructurado.

2. **MODIFICAR** `apps/mobile/lib/features/chat/ui/widgets/tools/tool_result_router.dart`
   - Añadir cases para `render_html`, `render_chart`, `render_images`, `generate_image`, `custom_ui`, `custom_tool`.
   - Despacho a `CustomUiRenderer(ui: uiPayload, presentation: presentation, authToken: authToken, sessionId: sessionId)`.

---

### Hito 2.B — Componentes de Contenido (texto, código, datos)

**Artefactos** (todos en `apps/mobile/lib/features/chat/ui/widgets/tools/custom_ui/`):

1. `cu_markdown.dart` — Reusa `MarkdownBlock` con `authToken`.
2. `cu_code.dart` — Code block con copy button y feedback.
3. `cu_table.dart` — `DataTable` Flutter con header destacado, scroll horizontal y filas alternadas.
4. `cu_badge.dart` — Chip de color según `variant` (success/warning/error/info/neutral).
5. `cu_metric.dart` — Valor grande + label + delta/trend con icono y color.
6. `cu_stats.dart` — Grid de `cu_metric` items.
7. `cu_progress.dart` — `LinearProgressIndicator` / `CircularProgressIndicator` + label + porcentaje.

---

### Hito 2.C — Componentes de Layout (estructura y navegación)

**Artefactos**:

1. `cu_card.dart` — Container con status border, título, descripción, metadatos y acciones opcionales.
2. `cu_section.dart` — Grupo con título de sección y renderizado recursivo de children.
3. `cu_tabs.dart` — Pestañas interactivas con renderizado recursivo del contenido.
4. `cu_accordion.dart` — Acordeón colapsable con `defaultOpen`.
5. `cu_card_list.dart` — Grid de `cu_card`.
6. `cu_steps.dart` — Lista de pasos horizontal y vertical con estados (done/active/pending/error).
7. `cu_timeline.dart` — Lista de eventos con línea vertical y timestamps.

---

### Hito 2.D — Componentes de Media (imágenes, diff, media externa)

**Artefactos**:

1. `cu_image_grid.dart` — Grid de imágenes usando `AuthenticatedImageProvider` y `ImageLightbox.show`.
2. `cu_diff.dart` — Diff de texto coloreado (verde añadir, rojo quitar, numeración de líneas).
3. `cu_audio.dart` — Placeholder con icono + cover art con `AuthenticatedImageProvider` + botón copiar URL.
4. `cu_video.dart` — Placeholder con poster/thumbnail + botón copiar URL.
5. `cu_pdf.dart` — Tarjeta con número de página, zoom y botón copiar URL.
6. `cu_html.dart` — Visor de HTML con toggle formatted / raw y botón para copiar.

---

### Hito 2.E — Integración y smoke test

**Responsabilidad**: `CustomUiRenderer` registrado como handler definitivo. Suite de pruebas unitarias y de widgets.

**Verificación**:
```bash
flutter analyze apps/mobile/
# No issues found! (0 warnings, 0 errors)

flutter test apps/mobile/test/
# All 332 tests passed! (Exit code 0)
```
