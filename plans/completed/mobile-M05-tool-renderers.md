# M05 — Tool Renderers Restantes (find, ls, exa, memory, chart, share_file, manage_*)

**Ámbito**: `apps/mobile/lib/features/chat/ui/widgets/tools/`  
**Problema**: Mobile tiene solo 5 renderers (bash/edit/read/grep/write) + fallback genérico. El web tiene ~30 renderers. Los 15+ restantes de mayor frecuencia de uso caen al fallback JSON sin estructura legible.  
**Dependencias de hitos anteriores**: M02 (Custom UI Renderer scaffold). Los renderers de chart e imágenes resan los componentes de M02.

---

## 1. Estado Actual (As-Is) — Mediciones Concretas

| Punto de medición | Evidencia |
|---|---|
| `tool_result_router.dart` tiene cases para: `bash`, `edit`, `read_file`, `grep_search`, `write_to_file` | Audit L33 |
| El fallback es `_GenericCard` con JSON formateado | Audit L96 |
| Web `ToolResultRouter.tsx:41-501` tiene ~30 cases | Audit L80 |
| Tools con resultado frecuente que caen al fallback: `find`, `list_dir`, `exa_search`, `mem_save/search`, `manage_workflow`, `task` | Audit L84-98 |

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

- [x] **A1** — `tool_result_router.dart` despacha a renderers específicos para todos los tools listados en el Hito 5.A-5.C.
- [x] **A2** — `find` y `list_dir` muestran una lista de rutas con iconos de archivo/carpeta y separadores de directorio.
- [x] **A3** — `exa_search` muestra cards con dominio, título, snippet y costo estimado.
- [x] **A4** — `memory_*` (save/search/get) muestran el tipo semántico/episódico, importancia y contenido truncado expandible.
- [x] **A5** — `share_file` muestra una card con el nombre de archivo, tamaño y botón de descarga/copia.
- [x] **A6** — `manage_workflow` y `task`/`decompose_tasks` muestran el estado del workflow/task de forma estructurada.
- [x] **A7** — `web_fetch` muestra el título de la página, URL y snippet del contenido con apertura en navegador.
- [x] **A8** — Tipos no cubiertos siguen cayendo al `_GenericCard` — sin crash.
- [x] **A9** — `flutter analyze` produce cero errores y cero warnings nuevos.

---

## 3. Hitos Innegociables

---

### Hito 5.A — Renderers de sistema de archivos (`find`, `list_dir`, `ls`)

**Artefactos**:

1. **NUEVO** `apps/mobile/lib/features/chat/ui/widgets/tools/find_result_card.dart`
   - Lista de rutas devueltas por `find` / `list_dir`.
   - Icono carpeta/archivo según si la ruta termina en `/` o tiene extensión.
   - Paths clickeables: tap → copia la ruta al portapapeles.
   - Muestra el count de resultados en el header.

2. **MODIFICAR** `tool_result_router.dart`
   - Añadir cases: `find`, `list_dir`, `ls` → `FindResultCard`.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/features/chat/ui/widgets/tools/
# No issues found!
```

---

### Hito 5.B — Renderers de búsqueda y memoria (`exa_search`, `memory_*`, `web_fetch`)

**Artefactos**:

1. **NUEVO** `apps/mobile/lib/features/chat/ui/widgets/tools/exa_result_card.dart`
   - Lista de resultados web: dominio (en chip), título, snippet (max 3 líneas, expandible), URL.
   - Tap en URL → `url_launcher`.
   - Costo estimado en el footer de la card.

2. **NUEVO** `apps/mobile/lib/features/chat/ui/widgets/tools/memory_result_card.dart`
   - Card con tipo de memoria (semántica/episódica/procedimental), nivel de importancia (1-5 puntos visuales) y contenido.
   - Para `mem_save`: confirmación de guardado con la key y tags.
   - Para `mem_search`: lista de resultados similares al `exa_result_card`.

3. **NUEVO** `apps/mobile/lib/features/chat/ui/widgets/tools/web_fetch_card.dart`
   - Título de la página, URL, snippet de contenido (expandible).
   - Botón "Open" → `url_launcher`.

4. **MODIFICAR** `tool_result_router.dart`
   - Cases: `exa_search` → `ExaResultCard`; `mem_save`, `mem_search`, `mem_get_observation` → `MemoryResultCard`; `web_fetch` → `WebFetchCard`.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/features/chat/ui/widgets/tools/
# No issues found!
```

---

### Hito 5.C — Renderers de workflow, tasks y file sharing

**Artefactos**:

1. **NUEVO** `apps/mobile/lib/features/chat/ui/widgets/tools/workflow_card.dart`
   - Para `manage_workflow`, `manage_factory`: muestra el nombre del workflow, estado con chip de color, y acciones ejecutadas como lista.

2. **NUEVO** `apps/mobile/lib/features/chat/ui/widgets/tools/task_card.dart`
   - Para `task`, `decompose_tasks`: lista de subtareas con estado (pending/active/done/failed), pasos estimados y dependencias.

3. **NUEVO** `apps/mobile/lib/features/chat/ui/widgets/tools/share_file_card.dart`
   - Card con nombre de archivo, badge de tipo/extensión con paleta dedicada.
   - Botón de copia rápida de ruta al portapapeles.

4. **MODIFICAR** `tool_result_router.dart`
   - Cases: `manage_workflow`, `manage_factory` → `WorkflowCard`; `task`, `decompose_tasks` → `TaskCard`; `share_file` → `ShareFileCard`.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/features/chat/ui/widgets/tools/
# No issues found!

flutter test apps/mobile/test/
# Exit code 0 (366 tests passed)
```

---

## 4. Restricciones No Negociables

1. **Cada renderer es un archivo independiente** — nunca agrupar 2+ renderers en un mismo archivo.
2. **Ningún renderer > 200 líneas**. Si crece, extraer sub-widgets.
3. **El fallback `_GenericCard` se mantiene intacto** — los tipos no mapeados siguen funcionando.
4. **Sin crash si el payload llega malformado**: cada renderer usa `payload['key'] as Type?` con fallback null-safe.
5. **Un commit por hito**: `feat(mobile/chat): M05-A filesystem renderers`, etc.
6. **`flutter analyze` en verde** al final de cada hito.
7. **M02 debe estar mergeado** antes de que `TaskCard` intente reusar `cu_steps.dart`.
