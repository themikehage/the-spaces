# Hito 5 — Chat

**Prerequisito**: Hito 4 completado y verificado (todos los criterios H4-A* en verde).

**Objetivo**: El core del producto. Chat en tiempo real con streaming de respuestas, rendering de markdown, visualización de tool calls y input con attachments. Equivalente de `ChatArea` + `useChatAreaState` + `useChatInputForm` del cliente web. Es el hito más complejo — se divide en 4 sub-fases ejecutadas en orden estricto.

**Principios innegociables**:
- `ChatRepository` es el único punto de acceso al WebSocket de sesión y al historial HTTP.
- `ChatNotifier` es la única fuente de estado del chat. Sin `StreamController` en widgets.
- Streaming token-by-token via `StreamBuilder` — nunca batching ni polling.
- Tool calls siempre visibles (colapsables) — nunca ocultos.
- El botón Stop funciona durante streaming: aborta la petición en el backend.

---

## 1. Estado Actual (As-Is)

- Existe placeholder de `ChatScreen` para la ruta `/sessions/:id`.
- `WsClient` del Hito 0 maneja conexión genérica — necesita método `connectToSession(sessionId)`.

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

- [x] **H5-A1** — Abrir una sesión → historial de mensajes carga desde `GET /api/sessions/:id/messages`.
- [x] **H5-A2** — Enviar mensaje → respuesta del asistente aparece streameada token a token en < 500ms desde el primer token.
- [x] **H5-A3** — Durante streaming, botón "Stop" cancela la generación (`DELETE /api/sessions/:id/stream` o equivalente del backend).
- [x] **H5-A4** — Bloques de markdown se renderizan correctamente: código con syntax highlight, listas, negritas, links.
- [x] **H5-A5** — Tool calls visibles como cards colapsables con nombre, argumentos y resultado.
- [x] **H5-A6** — Input soporta texto multilínea. "Enter" en mobile no envía (usa botón).
- [x] **H5-A7** — Attach image desde galería → imagen visible en preview antes de enviar → enviada con el mensaje.
- [x] **H5-A8** — Selector de modelo (bottom sheet) — cambia el modelo para la siguiente llamada.
- [x] **H5-A9** — Auto-scroll al último mensaje durante streaming. Scroll manual hacia arriba pausa el auto-scroll.
- [x] **H5-A10** — `ChatRepository` no tiene referencias a widgets.
- [x] **H5-A11** — `flutter analyze lib/features/chat/` produce cero warnings.
- [x] **H5-A12** — `flutter test test/features/chat/` produce exit code 0.

---

## 3. Hitos Innegociables

Los sub-hitos se ejecutan en orden estricto. **No se inicia el siguiente sin verificar el anterior.**

---

### Sub-hito 5.1: Rendering de mensajes (sin streaming)

**Responsabilidad**: Mostrar historial de mensajes existente correctamente formateado.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/chat/data/models/chat_message.dart`
   - `ChatMessage` con `freezed`: `id`, `role (user|assistant|system|tool)`, `content`, `toolCalls?`, `createdAt`.
   - `ToolCall`: `id`, `name`, `arguments`, `result?`, `status`.

2. **[NEW]** `apps/mobile/lib/features/chat/data/chat_repository.dart`
   - `getMessages(sessionId)` → `GET /api/sessions/:id/messages` → `List<ChatMessage>`.
   - `connectToSession(sessionId)` → extiende `WsClient` para filtrar eventos de la sesión.

3. **[NEW]** `apps/mobile/lib/features/chat/ui/widgets/message_bubble.dart`
   - Bubble de usuario (alineado a la derecha, color primario).
   - Bubble de asistente (alineado a la izquierda, color de superficie).

4. **[NEW]** `apps/mobile/lib/features/chat/ui/widgets/markdown_block.dart`
   - Wrappea `flutter_markdown` con tema alineado a `AppTheme`.
   - Código con fondo diferenciado y fuente monospace.

5. **[NEW]** `apps/mobile/lib/features/chat/ui/widgets/system_message_card.dart`
   - Card para mensajes de sistema con icono.

6. **[NEW]** `apps/mobile/lib/features/chat/ui/chat_screen.dart` (versión inicial — solo historial)
   - `ListView.builder` con historial de mensajes.
   - Auto-scroll al último al cargar.

**Verificación**:
```bash
cd apps/mobile && flutter test test/features/chat/message_rendering_test.dart
# Markdown parseado correctamente. Tool call con resultado renderiza ambas partes.
flutter analyze lib/features/chat/ui/widgets/
# → cero errores
```

---

### Sub-hito 5.2: Streaming en tiempo real

**Responsabilidad**: Acumulación de tokens streameados y actualización reactiva de la UI.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/chat/ui/chat_notifier.dart`
   - `ChatState { messages, streamingContent, isStreaming, error }` con `freezed`.
   - `ChatNotifier extends AsyncNotifier<ChatState>`.
   - `loadHistory(sessionId)` — carga historial inicial.
   - `_listenToStream(sessionId)` — suscribe al WS, acumula tokens en `streamingContent`.
   - Cuando llega evento `stream_end` → `streamingContent` → nuevo mensaje en `messages`.
   - `stopStreaming()` → `DELETE /api/sessions/:id/stream`.

2. **[MODIFY]** `apps/mobile/lib/features/chat/ui/chat_screen.dart`
   - Añade `StreamingBubble` que muestra `state.streamingContent` durante streaming.
   - Auto-scroll reactivo a cambios de `streamingContent`.

3. **[NEW]** `apps/mobile/lib/features/chat/ui/widgets/streaming_bubble.dart`
   - Bubble con cursor parpadeante al final durante streaming.
   - Desaparece cuando el mensaje queda fijo en la lista.

**Verificación**:
```bash
cd apps/mobile && flutter test test/features/chat/streaming_test.dart
# WS token event → streamingContent acumula. stream_end → mensaje en lista. stop → isStreaming false.
```

---

### Sub-hito 5.3: Input y envío

**Responsabilidad**: Input expandible, envío de mensajes, stop durante streaming.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/chat/ui/widgets/chat_input_bar.dart`
   - `TextField` expandible (min 1 línea, max 6 líneas).
   - Botón Send (icono flecha) → `chatNotifier.sendMessage(text)`.
   - Durante streaming: Send se convierte en Stop (icono cuadrado) → `chatNotifier.stopStreaming()`.
   - Botón de attachment (icono clip).
   - Botón de modelo (icono CPU) → abre `ModelSelectorSheet`.

2. **[MODIFY]** `apps/mobile/lib/features/chat/ui/chat_notifier.dart`
   - `sendMessage(content, attachments?)` → `POST /api/sessions/:id/messages` → inicia stream.

3. **[NEW]** `apps/mobile/lib/features/chat/ui/widgets/model_selector_sheet.dart`
   - Bottom sheet con lista de modelos de `GET /api/models`.
   - Selección → actualiza modelo activo de la sesión.

**Verificación**:
```bash
cd apps/mobile && flutter test test/features/chat/chat_input_test.dart
# sendMessage → POST enviado. stopStreaming durante streaming → isStreaming=false.
```

---

### Sub-hito 5.4: Tool calls y attachments

**Responsabilidad**: Visualización de tool calls y envío de imágenes.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/chat/ui/widgets/tool_call_card.dart`
   - Card colapsable con: nombre del tool, argumentos (JSON formateado), resultado.
   - Estado del tool: `running` (spinner) / `done` (check) / `error` (X).
   - Equivalente del `ToolCallRow` de la web.

2. **[NEW]** `apps/mobile/lib/features/chat/ui/widgets/attachment_preview.dart`
   - Preview de imagen seleccionada antes de enviar.
   - Botón X para remover.

3. **[MODIFY]** `apps/mobile/lib/features/chat/ui/chat_notifier.dart`
   - `pickAttachment()` — abre `ImagePicker`, retorna path local.
   - `sendMessage` acepta `List<Attachment>`.

**Verificación**:
```bash
cd apps/mobile && flutter test test/features/chat/tool_call_test.dart
# Tool call running → spinner. Tool call con resultado → resultado visible. Colapsable funciona.
```

---

## 4. Verificación Final del Hito 5

```bash
# 1. Análisis estático
cd apps/mobile && flutter analyze lib/features/chat/
# → "No issues found!"

# 2. Tests del feature
cd apps/mobile && flutter test test/features/chat/
# → exit code 0

# 3. Sin StreamController en widgets
grep -rn "StreamController" apps/mobile/lib/features/chat/ui/ --include="*.dart"
# → cero líneas

# 4. Sin setState en ChatScreen
grep -n "setState" apps/mobile/lib/features/chat/ui/chat_screen.dart
# → cero líneas

# 5. Tool calls siempre en la lista
grep -n "toolCalls\|ToolCallCard" apps/mobile/lib/features/chat/ui/chat_screen.dart
# → al menos 1 línea

# 6. Stop implementado
grep -n "stopStreaming\|DELETE.*stream" apps/mobile/lib/features/chat/data/chat_repository.dart
# → al menos 1 línea
```

---

## 5. Restricciones No Negociables

1. **Orden estricto de sub-fases**: 5.1 → 5.2 → 5.3 → 5.4.
2. **Un commit por sub-fase**: `feat(mobile): hito-5.1-message-rendering`, etc.
3. **Streaming token-by-token**: nunca esperar el mensaje completo para renderizar.
4. **Tool calls visibles**: nunca ocultar tool calls aunque el usuario no los haya pedido ver.
5. **`flutter analyze` verde** antes de pasar a la siguiente sub-fase.
6. **Sin implementar features de Hitos 6+** en este hito.
