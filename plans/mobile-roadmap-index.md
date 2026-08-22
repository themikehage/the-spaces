# Mobile Roadmap — Índice de Hitos

**Fuente**: [`mobile-chat-workspace-vs-web-audit.md`](./mobile-chat-workspace-vs-web-audit.md)  
**Regla de ejecución**: Un hito a la vez. El hito siguiente solo comienza cuando el anterior tiene `flutter analyze` en verde y sus criterios de aceptación verificados.

---

## Orden de Ejecución

| # | Plan | Scope | Dependencias | Estado |
|---|---|---|---|---|
| **M01** | [auth-images](./mobile-M01-auth-images.md) | `markdown_block.dart` + `AuthenticatedImageProvider` | Ninguna | ⬜ Pendiente |
| **M02** | [custom-ui-renderer](./mobile-M02-custom-ui-renderer.md) | `tools/custom_ui/` — 21 componentes | M01 (para ImageGrid) | ⬜ Pendiente |
| **M03** | [input-autocomplete](./mobile-M03-input-autocomplete.md) | `chat_input_bar.dart` + popovers | Ninguna | ⬜ Pendiente |
| **M04** | [workspace-crud](./mobile-M04-workspace-crud.md) | `features/workspace/` — CRUD + árbol | Ninguna | ⬜ Pendiente |
| **M05** | [tool-renderers](./mobile-M05-tool-renderers.md) | `tools/` — find, exa, memory, chart, share | M02 scaffold | ⬜ Pendiente |
| **M06** | [media-inline](./mobile-M06-media-inline.md) | `message_blocks/` — html, pdf, audio, video | M01 (auth), M02 opcional | ⬜ Pendiente |
| **M07** | [message-footer-branch](./mobile-M07-message-footer-branch.md) | `message_footer.dart`, `branch_nav.dart`, `delegation_notification.dart` | Ninguna | ⬜ Pendiente |
| **M08** | [streaming-partial](./mobile-M08-streaming-partial.md) | `chat_notifier.dart` + `subagent_live_view.dart` | M02 scaffold | ⬜ Pendiente |
| **M09** | [file-attachments](./mobile-M09-file-attachments.md) | `file_upload_repository.dart` + input bar | M04 (download), M01 (preview) | ⬜ Pendiente |

---

## Restricciones Globales (aplican a todos los hitos)

1. **`flutter analyze` en verde** al terminar cada sub-hito. Sin warnings nuevos respecto a `main`.
2. **Ningún archivo > 300 líneas**. Si crece, extraer sub-widgets o sub-módulos.
3. **Un commit por sub-hito** con el prefijo `feat(mobile/chat)` o `feat(mobile/workspace)` según corresponda.
4. **Sin dependencias nuevas** sin verificar primero que no existen en `pubspec.yaml`.
5. **Sin cambios de comportamiento en lo que ya funciona**. Cada hito es aditivo.
6. **Error handling obligatorio**: toda llamada async tiene manejo de error visible al usuario.
7. **Cero `dynamic` innecesarios** — tipos explícitos en todos los modelos y métodos nuevos.

---

## Árbol de Dependencias

```
M01 (auth images)
 └─ M02 (custom UI) ──┬─ M05 (tool renderers)
                      └─ M08 (streaming partial)
 └─ M06 (media inline)
 └─ M09 (file attachments, preview)

M03 (input autocomplete)   ← autónomo

M04 (workspace CRUD)
 └─ M09 (file attachments, download)
 └─ M08 (auto-refresh WS) [opcional]

M07 (footer + branchnav)   ← autónomo
```

---

## Criterio de "Done" Global

El roadmap está completo cuando:

```bash
flutter analyze apps/mobile/lib/
# No issues found!

flutter test apps/mobile/test/
# Exit code 0

# Y las 9 tablas de criterios de aceptación tienen todos los checkboxes marcados.
```
