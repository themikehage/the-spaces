# M03 — Autocomplete Slash/@ + Skills Popover + Tools Popover en el Input (COMPLETED)

**Ámbito**: `apps/mobile/lib/features/chat/widgets/chat_input_bar.dart` y widgets de autocomplete.  
**Estado**: Completado e integrado.

---

## 1. Estado Final (To-Be) — Criterios de Aceptación

- [x] **A1** — Al escribir `/` en el input aparece un `AutocompletePopover` encima del teclado con la lista de tools y skills disponibles filtrables por texto.
- [x] **A2** — Al escribir `@` aparece el popover con la lista de agentes/proyectos mencionables.
- [x] **A3** — Seleccionar un item del popover inserta el texto correcto en el campo y cierra el popover.
- [x] **A4** — El popover cierra con `Esc` (teclado hardware) o al tocar fuera de él.
- [x] **A5** — Existe un botón de Skills en el `chat_input_bar` que abre un `SkillsSelectorSheet` con:
  - Tabs: ALL / GLOBAL / WORKSPACE.
  - Buscador de skills.
  - Tap en skill → inserta `/skill-name ` en el input.
- [x] **A6** — Existe un botón de Tools en el `chat_input_bar` que abre un `ToolsSelectorSheet` con:
  - Presets: Autonomous / Standard / ReadOnly.
  - Lista de tools con toggle on/off.
  - La configuración `tools` se envía al servidor como parte del payload del mensaje.
- [x] **A7** — `Alt+Enter` (teclado hardware) activa modo Follow-up; `Enter` envía como Steer (o selecciona el item del popover si está visible).
- [x] **A8** — Código modular y tipado estricto, `chat_input_bar.dart` < 300 líneas con `ChatInputHeaderRow` extraído.

---

## 2. Artefactos Implementados

1. `apps/mobile/lib/features/chat/models/autocomplete_item.dart`
2. `apps/mobile/lib/features/chat/controllers/autocomplete_controller.dart`
3. `apps/mobile/lib/features/chat/ui/widgets/autocomplete_popover.dart`
4. `apps/mobile/lib/features/chat/ui/widgets/chat_input_header_row.dart`
5. `apps/mobile/lib/features/chat/ui/widgets/chat_input_bar.dart`
6. `apps/mobile/lib/features/chat/ui/widgets/skills_selector_sheet.dart`
7. `apps/mobile/lib/features/chat/ui/chat_screen.dart`
8. `apps/mobile/lib/features/chat/ui/chat_notifier.dart`
9. `apps/mobile/lib/features/chat/data/chat_repository.dart`
10. `apps/mobile/test/features/chat/autocomplete_controller_test.dart`
11. `apps/mobile/test/features/chat/autocomplete_popover_test.dart`
12. `apps/mobile/test/features/chat/chat_input_autocomplete_test.dart`
13. `apps/mobile/test/features/chat/tools_and_skills_sheets_test.dart`
