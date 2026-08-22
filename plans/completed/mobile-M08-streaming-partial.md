# M08 — Streaming Parcial de Tools (`tool_execution_update` + `subagent_event`)

**Ámbito**: `apps/mobile/lib/features/chat/notifiers/chat_notifier.dart` y widgets de tool cards.  
**Problema**: Mobile ignora los eventos WS `tool_execution_update` (resultados parciales en vivo de herramientas) y `subagent_event` (log en vivo de subagentes delegados). Cuando un tool tarda, el usuario ve el spinner indefinidamente sin ningún feedback de progreso. En el web existe `SubagentLiveView` con el log en vivo.  
**Dependencias de hitos anteriores**: M02 (Custom UI scaffold) para `SubagentLiveView`.

---

## 1. Estado Actual (As-Is) — Mediciones Concretas

| Punto de medición | Evidencia |
|---|---|
| `chat_notifier.dart:77-240` maneja ~12 tipos de eventos WS | Sin case para `tool_execution_update` |
| `chat_notifier.dart:77-240` sin case para `subagent_event` | Audit L105 |
| `tool_call_card.dart` muestra estado running/error/done pero sin resultados parciales | Audit L32 |
| Web: `tool_execution_update` muestra resultados parciales en el card del tool en vivo | Audit L97 |
| Web: `SubagentLiveView` renderiza el log del subagente evento por evento | Audit L88 |
| No existe `subagent_live_view.dart` en mobile | `grep -r "SubagentLiveView\|subagent_event" apps/mobile/` → cero resultados esperados |

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

- [x] **A1** — Al llegar un evento `tool_execution_update`, el `ToolCallCard` correspondiente actualiza su contenido con los resultados parciales sin esperar al `tool_execution_end`.
- [x] **A2** — El resultado parcial se renderiza como texto/markdown dentro del card (no JSON crudo).
- [x] **A3** — Al llegar eventos `subagent_event`, aparece un `SubagentLiveView` card que acumula los eventos del subagente en tiempo real.
- [x] **A4** — El `SubagentLiveView` muestra: nombre del subagente, estado (running/done), log de eventos en lista expandible con timestamps.
- [x] **A5** — Cuando el subagente termina (`subagent_event` de tipo `done`), el card muestra el resultado final y colapsa el log.
- [x] **A6** — `flutter analyze` produce cero errores y cero warnings nuevos.
- [x] **A7** — El rendimiento del chat no degrada con actualizaciones frecuentes (>10/seg): el widget usa `ListView.builder` con keys estables, no rebuild del árbol completo.

---

## 3. Hitos Innegociables

---

### Hito 8.A — Manejar `tool_execution_update` en el notifier

**Responsabilidad**: Capturar el evento y actualizar el estado del tool call correspondiente.

**Artefactos**:

1. **MODIFICAR** `apps/mobile/lib/features/chat/notifiers/chat_notifier.dart`
   - Añadir case en el switch de eventos WS:
     ```dart
     case 'tool_execution_update':
       _handleToolExecutionUpdate(event);
     ```
   - Método `_handleToolExecutionUpdate(WsEvent event)`:
     - Localiza el `ToolCall` por `toolCallId` en el estado actual.
     - Acumula el `partialResult` en el campo `liveOutput: String?` del `ToolCall`.
     - Emite el nuevo estado (sin rebuild de toda la lista de mensajes — solo el tool call afectado).

2. **MODIFICAR** `apps/mobile/lib/features/chat/models/tool_call.dart` (o equivalente)
   - Añadir campo `liveOutput: String?` para acumular resultados parciales.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/features/chat/models/
flutter analyze apps/mobile/lib/features/chat/notifiers/
# No issues found!
```

---

### Hito 8.B — Actualizar `ToolCallCard` para mostrar `liveOutput`

**Responsabilidad**: El card del tool muestra los resultados parciales en tiempo real.

**Artefactos**:

1. **MODIFICAR** `apps/mobile/lib/features/chat/widgets/tools/tool_call_card.dart`
   - Cuando `toolCall.status == running && toolCall.liveOutput != null`:
     - Mostrar `liveOutput` debajo del spinner, en un `SelectableText` monospaciado truncado (max 20 líneas, con botón "Ver más").
   - Cuando `toolCall.status == done`:
     - Ocultar `liveOutput` y mostrar el resultado final (renderer existente).
   - Cuando `toolCall.status == error`:
     - Mostrar el error con color rojo.
   - Usar `ValueKey(toolCall.id)` en el widget para evitar rebuilds de los demás cards.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/features/chat/widgets/tools/tool_call_card.dart
# No issues found!
```

---

### Hito 8.C — Manejar `subagent_event` + `SubagentLiveView`

**Responsabilidad**: Mostrar el log en vivo de subagentes delegados.

**Artefactos**:

1. **MODIFICAR** `apps/mobile/lib/features/chat/notifiers/chat_notifier.dart`
   - Añadir case `subagent_event` → `_handleSubagentEvent(event)`.
   - Método `_handleSubagentEvent`:
     - Si no existe un `SubagentSession` para el `subagentId` → crear uno con estado `running`.
     - Acumular el evento en `SubagentSession.events: List<SubagentEvent>`.
     - Si el evento es de tipo `done` o `error` → actualizar el estado del `SubagentSession`.
     - Emitir el nuevo estado.

2. **NUEVO** `apps/mobile/lib/features/chat/models/subagent_session.dart`
   - Clase inmutable: `SubagentSession({ required String id, required String name, required SubagentStatus status, required List<SubagentEvent> events, String? result })`.
   - `SubagentEvent`: `({ required String type, required String content, required DateTime timestamp })`.

3. **NUEVO** `apps/mobile/lib/features/chat/widgets/subagent_live_view.dart`
   - Card con header: nombre del subagente + badge de estado (running/done/error).
   - Cuerpo: `ExpansionTile` con la lista de eventos (tipo + contenido + timestamp).
   - Cuando `status == done`: muestra el resultado final y el `ExpansionTile` colapsa por defecto.
   - Cuando `status == running`: el `ExpansionTile` está expandido por defecto, muestra el último evento destacado.
   - Usa `ListView.builder` para la lista de eventos — nunca `Column` con `map`.

4. **MODIFICAR** `apps/mobile/lib/features/chat/widgets/message_bubble.dart`
   - Si el mensaje tiene `subagentSessions` asociados → renderizar un `SubagentLiveView` por cada uno.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/features/chat/
# No issues found!

flutter test apps/mobile/test/
# Exit code 0
```

---

## 4. Restricciones No Negociables

1. **Keys estables en todos los widgets de lista**: `ValueKey(toolCall.id)`, `ValueKey(event.timestamp.millisecondsSinceEpoch)`. Sin keys por índice.
2. **Sin rebuild de la lista completa de mensajes** al llegar `tool_execution_update`. Solo el tool call afectado se reconstruye.
3. **`SubagentLiveView` usa `ListView.builder`** — nunca `Column` con map para listas potencialmente largas.
4. **El `liveOutput` tiene un límite visual de 20 líneas** con "Ver más" — nunca muestra contenido infinito sin scroll.
5. **Un commit por hito**: `feat(mobile/chat): M08-A tool update handler`, etc.
6. **`flutter analyze` en verde** al final de cada hito.
