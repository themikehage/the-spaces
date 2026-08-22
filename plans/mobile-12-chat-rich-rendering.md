# Hito 12 — Chat Rich Rendering: Tool Calls, Approvals & ThinkingBlock

**Prerequisito**: Hito 11 completado y verificado (H11-A1 a H11-A10 en verde).

**Objetivo**: Elevar el chat de "funcional básico" a "equivalente al web" en los tres componentes más críticos: (A) tool calls con renderers especializados, (B) aprobaciones y preguntas inline, (C) ThinkingBlock colapsable con cursor parpadeante.

**Sin esto, el producto mobile es funcionalmente inferior al web en su core.**

**Principios innegociables**:
- Todos los renderers de tool calls son widgets stateless que reciben el `ToolCall` como parámetro.
- `ToolResultRouter` es el único dispatcher — ningún widget conoce directamente el tipo de tool.
- `ApprovalForm` y `AskQuestionForm` resuelven **inline en el chat**, no en un hub separado.
- Los formularios de aprobación usan el mismo `WsClient` para emitir la respuesta.
- `flutter analyze` verde antes de pasar al siguiente sub-hito.

---

## 1. Estado Actual (As-Is)

- `tool_call_card.dart`: muestra nombre + args JSON + resultado como texto plano. Un solo renderer genérico.
- No existe ThinkingBlock diferenciado del contenido normal.
- No existe ApprovalForm ni AskQuestionForm en el chat.
- El `ChatNotifier` recibe eventos `tool_start`/`tool_end` pero no distingue tipo de tool.

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

- [x] **H12-A1** — `ThinkingBlock` renderiza el contenido de razonamiento del agente colapsado por defecto, con borde izquierdo de color y header "Thinking...". Tiene cursor parpadeante durante streaming.
- [x] **H12-A2** — `ToolResultRouter` despacha por `toolName` a renderers especializados:
  - `EditResult`: diff con hunks (+/- líneas numeradas).
  - `ReadResult`: texto plano para archivos, lightbox para imágenes.
  - `BashResult`: bloque de código con fondo oscuro + exit code badge.
  - `GrepResult`: matches con patrón resaltado + archivo:línea.
  - `WriteResult`: ruta del archivo escrito + badge "Created/Modified".
  - Fallback genérico (`GenericToolCard`): nombre + args + resultado JSON.
- [x] **H12-A3** — `ApprovalForm` inline: aparece como card en el flujo del chat con severidad (info/warning/critical), timeout countdown de 15s, botones Approve/Deny. Resuelve vía `WsClient`.
- [x] **H12-A4** — `AskQuestionForm` inline: pregunta del agente + opciones multi-select + campo de respuesta custom. Envía respuesta vía `WsClient`.
- [x] **H12-A5** — `ToolCallCard` base sigue siendo colapsable — el renderer especializado vive dentro del cuerpo del card.
- [x] **H12-A6** — Mensajes de sistema con `role == 'tool'` se diferencian visualmente de los de asistente.
- [x] **H12-A7** — `flutter analyze lib/features/chat/` → cero warnings.
- [x] **H12-A8** — `flutter test test/features/chat/` → exit code 0.

---

## 3. Sub-hitos (orden estricto)

### Sub-hito 12.1: ThinkingBlock

**Responsabilidad**: Renderizar bloques de razonamiento del agente de forma diferenciada.

**Contexto web**: `MessageBlocks.tsx` distingue `type == 'thinking'` y renderiza un bloque colapsable con borde izquierdo de color y animación de cursor.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/chat/ui/widgets/thinking_block.dart`
   - `ThinkingBlock({ content, isStreaming })`.
   - Header "Thinking" con icono `Icons.psychology_alt` y chevron de colapso.
   - Cuerpo: texto en fuente ligeramente más pequeña, color muted, borde izquierdo `AppColors.primary`.
   - Si `isStreaming: true` → muestra cursor parpadeante (`AnimatedOpacity` 0<->1 cada 500ms).
   - Por defecto colapsado si `content.length > 200`, expandido si es corto.

2. **[MODIFY]** `apps/mobile/lib/features/chat/ui/widgets/message_bubble.dart`
   - Detectar bloques de tipo `thinking` en el `ChatMessage.content` (si el backend emite `{type: 'thinking', text: '...'}`) y renderizar `ThinkingBlock` antes del contenido principal.

3. **[MODIFY]** `apps/mobile/lib/features/chat/ui/widgets/streaming_bubble.dart`
   - Si `streamingContent` contiene un prefijo de thinking (protocolo del backend), separarlo y renderizar `ThinkingBlock(isStreaming: true)` + el contenido normal.

**Verificación**:
```bash
flutter test test/features/chat/thinking_block_test.dart
# Contenido largo → colapsado por defecto. Tap header → expande. isStreaming: true → cursor visible.
flutter analyze lib/features/chat/ui/widgets/thinking_block.dart
# → cero errores
```

---

### Sub-hito 12.2: ToolResultRouter y renderers especializados

**Responsabilidad**: Router de renderers de tool calls + renderers para los tools más usados.

**Contexto web**: `ToolResultRouter.tsx` despacha a ~30 renderers. Aquí implementamos los 5 más frecuentes + fallback.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/chat/ui/widgets/tools/tool_result_router.dart`
   - `ToolResultRouter({ toolCall }) → Widget`.
   - Switch por `toolCall.name`:
     - `'edit'` | `'str_replace'` → `EditResultRenderer`.
     - `'read'` | `'view_file'` → `ReadResultRenderer`.
     - `'bash'` | `'run_command'` → `BashResultRenderer`.
     - `'grep_search'` | `'search'` → `GrepResultRenderer`.
     - `'write_to_file'` | `'create_file'` → `WriteResultRenderer`.
     - default → `GenericToolCard`.

2. **[NEW]** `apps/mobile/lib/features/chat/ui/widgets/tools/edit_result_renderer.dart`
   - Parsea el resultado como diff (líneas `+`, `-`, ` `).
   - Líneas `+` → fondo verde sutil. Líneas `-` → fondo rojo sutil. Contexto → normal.
   - Número de línea en cada fila.
   - Fuente monospace, scroll horizontal para líneas largas.

3. **[NEW]** `apps/mobile/lib/features/chat/ui/widgets/tools/bash_result_renderer.dart`
   - Bloque de código con fondo `AppColors.darkCard`.
   - Badge de exit code: 0 → verde "OK", otro → rojo "Exit :N".
   - Scroll vertical para outputs largos (max height 300px con scroll interno).

4. **[NEW]** `apps/mobile/lib/features/chat/ui/widgets/tools/read_result_renderer.dart`
   - Si el resultado contiene una URL de imagen → `Image.network` con lightbox al tap.
   - Si es texto → `SelectableText` con fuente monospace.

5. **[NEW]** `apps/mobile/lib/features/chat/ui/widgets/tools/grep_result_renderer.dart`
   - Lista de matches con formato `archivo:línea: contenido`.
   - El patrón buscado resaltado con fondo `AppColors.warning.withOpacity(0.3)`.

6. **[NEW]** `apps/mobile/lib/features/chat/ui/widgets/tools/write_result_renderer.dart`
   - Ruta del archivo con icono de archivo.
   - Badge "Created" o "Modified" según el resultado.

7. **[NEW]** `apps/mobile/lib/features/chat/ui/widgets/tools/generic_tool_card.dart`
   - Fallback: nombre del tool en bold + args JSON + resultado JSON en bloques de código plegables.

8. **[MODIFY]** `apps/mobile/lib/features/chat/ui/widgets/tool_call_card.dart`
   - El cuerpo (parte colapsable) ahora usa `ToolResultRouter(toolCall: toolCall)` en vez de texto plano.

**Verificación**:
```bash
flutter test test/features/chat/tool_result_router_test.dart
# tool.name='bash' → BashResultRenderer. tool.name='unknown' → GenericToolCard.
# Diff con líneas +/- → fondo correcto en EditResultRenderer.
flutter analyze lib/features/chat/ui/widgets/tools/
# → cero warnings
```

---

### Sub-hito 12.3: ApprovalForm inline

**Responsabilidad**: Formulario de aprobación de tool que aparece en el flujo del chat y resuelve via WebSocket.

**Contexto web**: `ApprovalForm.tsx` en `SystemMessage.tsx`. Severidades: info/warning/critical. Timeout 15s con countdown. Resuelve vía WS con `{type: 'tool_approval', approved: bool}`.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/chat/ui/widgets/approval_form.dart`
   - `ApprovalForm({ toolCallId, toolName, severity, message, timeoutSeconds })`.
   - Severidad: `info` → azul, `warning` → naranja, `critical` → rojo.
   - Countdown: `AnimatedBuilder` sobre `ValueNotifier<int>` que decrementa cada segundo.
   - Si llega a 0 → auto-deny.
   - Botones: "Approve" (filled) y "Deny" (outlined).
   - Al resolver → emite `WsClient.send({type: 'tool_approval', toolCallId, approved: bool})` y se marca como resuelto (oculta botones, muestra badge del resultado).

2. **[MODIFY]** `apps/mobile/lib/features/chat/data/models/chat_message.dart`
   - Añadir `ApprovalRequest { toolCallId, toolName, severity, message, timeoutSeconds, resolved?, approvedResult? }` a la discriminated union de content.

3. **[MODIFY]** `apps/mobile/lib/features/chat/ui/widgets/message_bubble.dart`
   - Si `message.content` es `ApprovalRequest` → renderizar `ApprovalForm` en vez de `MarkdownBlock`.

4. **[MODIFY]** `apps/mobile/lib/features/chat/ui/chat_notifier.dart`
   - Manejar evento WS `tool_approval_required` → añadir mensaje de tipo `ApprovalRequest` a la lista.
   - Al resolver → actualizar el mensaje con el resultado.

**Verificación**:
```bash
flutter test test/features/chat/approval_form_test.dart
# severity='critical' → borde rojo. Countdown llega a 0 → auto-deny. Approve → WS send llamado.
flutter analyze lib/features/chat/ui/widgets/approval_form.dart
# → cero errores
```

---

### Sub-hito 12.4: AskQuestionForm inline

**Responsabilidad**: Formulario de pregunta del agente con multi-select + respuesta custom.

**Contexto web**: `AskQuestionForm.tsx`. El agente emite una pregunta con opciones. El usuario selecciona una o más + puede escribir respuesta custom.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/chat/ui/widgets/ask_question_form.dart`
   - `AskQuestionForm({ questionId, question, options?, allowCustom })`.
   - Pregunta en texto bold.
   - Si `options` → lista de `ChoiceChip` (multi-select).
   - Si `allowCustom` → `TextField` para respuesta libre.
   - Botón "Send Answer" → emite `WsClient.send({type: 'ask_question_response', questionId, selectedOptions, customAnswer})`.
   - Una vez enviado → se marca como resuelto (muestra la respuesta elegida, oculta el form).

2. **[MODIFY]** `apps/mobile/lib/features/chat/data/models/chat_message.dart`
   - Añadir `QuestionRequest { questionId, question, options?, allowCustom, resolved?, answer? }`.

3. **[MODIFY]** `apps/mobile/lib/features/chat/ui/widgets/message_bubble.dart`
   - Si `message.content` es `QuestionRequest` → `AskQuestionForm`.

4. **[MODIFY]** `apps/mobile/lib/features/chat/ui/chat_notifier.dart`
   - Manejar evento WS `ask_question` → añadir `QuestionRequest` a la lista.

**Verificación**:
```bash
flutter test test/features/chat/ask_question_form_test.dart
# Con opciones → ChoiceChip visibles. Selección + Send → WS send llamado con opciones correctas.
flutter analyze lib/features/chat/ui/widgets/ask_question_form.dart
# → cero errores
```

---

## 4. Verificación Final del Hito 12

```bash
# 1. Análisis estático
cd apps/mobile && flutter analyze lib/features/chat/
# → "No issues found!"

# 2. Tests
cd apps/mobile && flutter test test/features/chat/
# → exit code 0

# 3. ToolResultRouter es el único dispatcher
grep -rn "toolCall.name\|tool_name\|toolName" apps/mobile/lib/features/chat/ui/widgets/ --include="*.dart" | grep -v "tool_result_router.dart"
# → cero líneas (solo el router conoce el nombre del tool para despachar)

# 4. Sin ApprovalForm en pantallas fuera del chat
grep -rn "ApprovalForm\|AskQuestionForm" apps/mobile/lib/ --include="*.dart" | grep -v "features/chat/"
# → cero líneas

# 5. ThinkingBlock implementado
grep -n "ThinkingBlock" apps/mobile/lib/features/chat/ui/widgets/message_bubble.dart
# → al menos 1 línea

# 6. Sin StreamController en widgets nuevos
grep -rn "StreamController" apps/mobile/lib/features/chat/ui/ --include="*.dart"
# → cero líneas
```

---

## 5. Restricciones No Negociables

1. **Orden estricto**: 12.1 → 12.2 → 12.3 → 12.4.
2. **Un commit por sub-hito**: `feat(mobile): hito-12.1-thinking-block`, etc.
3. **`ToolResultRouter` no conoce `ChatNotifier`** — es stateless, solo recibe `ToolCall`.
4. **ApprovalForm resuelve inline** — no navega a otra pantalla ni abre un hub.
5. **`flutter analyze` verde** antes de pasar al siguiente sub-hito.
6. **No implementar `CustomUiRenderer` ni `ChartView`** en este hito — quedan para H13.
