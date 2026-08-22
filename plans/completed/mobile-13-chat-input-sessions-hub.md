# Hito 13 — Chat Input Avanzado & Sessions Hub

**Prerequisito**: Hito 12 completado y verificado (H12-A1 a H12-A8 en verde).

**Objetivo**: (A) Completar el input del chat con las features que lo distinguen del input básico: context meter, steer vs follow-up, historial de mensajes. (B) Convertir `SessionsScreen` en el hub real de la app: Kanban (idle/working/done) + Console de logs en vivo.

**Principios innegociables**:
- `ChatInputBarNotifier` maneja todo el estado del input — sin `setState` en el widget.
- El context meter se actualiza desde el estado del `ChatNotifier`, no con una llamada HTTP propia.
- `SessionsConsoleNotifier` usa el stream WS `global_log` existente — sin polling.
- `KanbanNotifier` usa el stream WS de sesiones activas — sin polling.
- `flutter analyze` verde antes de pasar al siguiente sub-hito.

---

## 1. Estado Actual (As-Is)

- `ChatInputBar` es un widget con `TextField` básico, botón Send/Stop, attach y model selector.
- `SessionsScreen` muestra solo la lista plana de sesiones. No hay Kanban ni Console.
- No existe context meter ni indicador de uso de tokens.

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

- [x] **H13-A1** — `ChatInputBar` muestra un **context ring** (donut) de color según umbral: verde < 60%, naranja 60-85%, rojo > 85%. Tap → snackbar con tokens usados / límite.
- [x] **H13-A2** — El input distingue **Steer** (mensaje principal, Enter envía) y **Follow-up** (comentario lateral). Botón de toggle Steer/Follow-up en el input.
- [x] **H13-A3** — Historial de mensajes enviados navegable con botones `↑` / `↓` en el teclado (o botones en la UI) — los últimos 20 mensajes del historial local.
- [x] **H13-A4** — El botón "Compact" aparece cuando el context meter supera el 85%. Al pulsarlo → `POST /api/sessions/:id/compact` y recarga el historial.
- [x] **H13-A5** — `SessionsScreen` tiene 2 tabs: **"Sessions"** (lista actual) y **"Console"** (log stream en vivo).
- [x] **H13-A6** — Tab Console: eventos WS `global_log` en tiempo real. Filtros: Mensajes/Razonamiento/Herramientas (toggles). Auto-scroll con botón "Freeze". Máx 500 eventos.
- [x] **H13-A7** — En la lista de Sessions, cada item muestra un **dot de estado** coloreado: active (azul), streaming (verde animado), task-running (naranja), sleeping (gris).
- [x] **H13-A8** — **Auto-renombre** de sesión: cuando se envía el primer mensaje, el título de la sesión se actualiza con los primeros 50 caracteres del mensaje.
- [x] **H13-A9** — `flutter analyze lib/features/chat/ lib/features/sessions/` → cero warnings.
- [x] **H13-A10** — `flutter test test/features/chat/ test/features/sessions/` → exit code 0.

---

## 3. Sub-hitos (orden estricto)

### Sub-hito 13.1: Context Meter en el input

**Responsabilidad**: Indicador visual de uso de contexto integrado en el `ChatInputBar`.

**Contexto web**: `ContextButton.tsx` + `ContextIndicator.tsx`. El estado de contexto llega por WS (`context_usage` event con `{ used, limit }`).

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/chat/ui/widgets/context_ring.dart`
   - `ContextRing({ used, limit, onTap })`.
   - `CustomPainter` con arco que va de 0 a `used/limit * 2π`.
   - Color: `AppColors.success` < 60%, `AppColors.warning` 60-85%, `AppColors.error` > 85%.
   - Tamaño: 28x28px para caber en el input bar.
   - `onTap` → muestra `SnackBar` con "{used} / {limit} tokens".

2. **[NEW]** `apps/mobile/lib/features/chat/ui/widgets/compact_button.dart`
   - Botón small visible solo cuando `usedRatio > 0.85`.
   - Label "Compact". Al tap → `chatNotifier.compact()`.

3. **[MODIFY]** `apps/mobile/lib/features/chat/ui/chat_notifier.dart`
   - Añadir `contextUsed: int`, `contextLimit: int` al `ChatState`.
   - Manejar evento WS `context_usage` → actualizar valores.
   - `compact()` → `POST /api/sessions/:id/compact` → `loadHistory()`.

4. **[MODIFY]** `apps/mobile/lib/features/chat/ui/widgets/chat_input_bar.dart`
   - Añadir `ContextRing` y `CompactButton` como parte del row de acciones.

**Verificación**:
```bash
flutter test test/features/chat/context_meter_test.dart
# used=900, limit=1000 → color rojo. used=500, limit=1000 → color verde. compact() → POST llamado.
flutter analyze lib/features/chat/ui/widgets/context_ring.dart
# → cero errores
```

---

### Sub-hito 13.2: Input — Steer/Follow-up e historial

**Responsabilidad**: Toggle Steer/Follow-up y navegación por historial de mensajes enviados.

**Contexto web**: `useChatInputForm.ts` — `inputMode: 'steer' | 'followup'`, historial con flechas ↑/↓.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/chat/ui/widgets/input_mode_toggle.dart`
   - Segmented control de 2 opciones: "Steer" / "Follow-up".
   - Steer → color primario. Follow-up → color secundario.
   - Al cambiar → `chatNotifier.setInputMode(mode)`.

2. **[MODIFY]** `apps/mobile/lib/features/chat/ui/chat_notifier.dart`
   - Añadir `inputMode: InputMode` (steer|followup) al `ChatState`.
   - `sentHistory: List<String>` — últimos 20 mensajes enviados (persiste en `SessionStorage`).
   - `sendMessage(text)` → si `inputMode == followup`, añade flag en el payload `{ followUp: true }`.
   - `navigateHistory(delta)` → sube/baja en `sentHistory`.

3. **[MODIFY]** `apps/mobile/lib/features/chat/ui/widgets/chat_input_bar.dart`
   - Añadir `InputModeToggle` sobre el `TextField`.
   - Botones `↑` `↓` para navegar el historial cuando `sentHistory.isNotEmpty`.

**Verificación**:
```bash
flutter test test/features/chat/input_mode_test.dart
# Toggle a follow-up → inputMode == followup en el state. sendMessage → payload con followUp: true.
# navigateHistory(-1) → text field lleno con el último mensaje enviado.
flutter analyze lib/features/chat/ui/widgets/input_mode_toggle.dart
# → cero errores
```

---

### Sub-hito 13.3: Session dot status

**Responsabilidad**: Indicador visual del estado de cada sesión en la lista.

**Contexto web**: `SessionItem.tsx` con dot coloreado según `session.status`.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/sessions/ui/widgets/session_status_dot.dart`
   - `SessionStatusDot({ status })`.
   - `active` → `AppColors.primary`, tamaño 8px.
   - `streaming` → `AppColors.success` con `AnimatedOpacity` pulsante (0.3-1.0 cada 700ms).
   - `task_running` → `AppColors.warning`.
   - `sleeping` | default → `AppColors.mutedForeground`.

2. **[MODIFY]** `apps/mobile/lib/features/sessions/ui/widgets/session_list_item.dart` (o el widget equivalente en `sessions_screen.dart`)
   - Añadir `SessionStatusDot` al leading del item.

3. **[MODIFY]** `apps/mobile/lib/features/sessions/ui/sessions_notifier.dart`
   - Manejar eventos WS `session_status_changed` → actualizar el status de la sesión en la lista.

**Verificación**:
```bash
flutter test test/features/sessions/session_status_dot_test.dart
# status='streaming' → widget con AnimatedOpacity. status='sleeping' → color muted.
flutter analyze lib/features/sessions/ui/widgets/session_status_dot.dart
# → cero errores
```

---

### Sub-hito 13.4: Auto-renombre de sesión

**Responsabilidad**: Cuando se envía el primer mensaje de una sesión, el título se actualiza automáticamente.

**Artefactos**:

1. **[MODIFY]** `apps/mobile/lib/features/chat/ui/chat_notifier.dart`
   - En `sendMessage`: si `messages.isEmpty` (primera vez) → tras recibir la respuesta, llama `PATCH /api/sessions/:id` con `{ name: text.substring(0, 50) }`.
   - Emite `EntityEventBus.emit('session_renamed')` para que la lista de sesiones se actualice.

2. **[MODIFY]** `apps/mobile/lib/features/sessions/ui/sessions_notifier.dart`
   - Escucha `EntityEventBus` evento `session_renamed` → recarga la lista.

**Verificación**:
```bash
flutter test test/features/chat/auto_rename_test.dart
# Primera sendMessage → PATCH /api/sessions/:id llamado con name = primeros 50 chars.
grep -n "session_renamed\|EntityEventBus" apps/mobile/lib/features/chat/ui/chat_notifier.dart
# → al menos 1 línea
```

---

### Sub-hito 13.5: Sessions Console (log stream en vivo)

**Responsabilidad**: Tab "Console" en `SessionsScreen` con eventos WS `global_log` en tiempo real.

**Contexto web**: `SessionConsoleView.tsx`. Suscripción al stream `global_log`. Filtros de tipo de evento. Auto-scroll con freeze. Máx 500 eventos con ring buffer.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/sessions/ui/sessions_console_notifier.dart`
   - `ConsoleEvent { type, source, content, timestamp }`.
   - `SessionsConsoleState { events: List<ConsoleEvent>, filters: Set<EventType>, isFrozen, isConnected }` con `freezed`.
   - `SessionsConsoleNotifier extends AsyncNotifier<SessionsConsoleState>`.
   - Suscripción al stream WS `global_log` en `build()`.
   - Ring buffer: máx 500 eventos (al llegar al límite, drop del más antiguo).
   - `toggleFilter(type)`, `toggleFreeze()`, `clear()`.

2. **[NEW]** `apps/mobile/lib/features/sessions/ui/sessions_console_screen.dart`
   - `ListView.builder` con los eventos del ring buffer.
   - Colores por tipo: `text_delta` → blanco, `thinking_delta` → violeta, `tool_start`/`tool_end` → azul, `error` → rojo.
   - Chips de filtro en el top: "Messages", "Reasoning", "Tools".
   - FAB "Freeze/Unfreeze" con icono según estado.
   - Auto-scroll al nuevo evento si no está frozen.

3. **[MODIFY]** `apps/mobile/lib/features/sessions/ui/sessions_screen.dart`
   - Añadir `TabBar` con 2 tabs: "Sessions" (lista actual) y "Console".
   - `TabBarView` con `SessionsListView` y `SessionsConsoleScreen`.

**Verificación**:
```bash
flutter test test/features/sessions/sessions_console_notifier_test.dart
# 501 eventos → lista tiene 500 (el primero se droppea). toggleFreeze → isFrozen = true.
# toggleFilter('tool_start') → filtro activo, ese tipo no aparece en la lista.
flutter analyze lib/features/sessions/ui/sessions_console_notifier.dart
# → cero errores
grep -n "StreamController" apps/mobile/lib/features/sessions/ui/ -r --include="*.dart"
# → cero líneas
```

---

## 4. Verificación Final del Hito 13

```bash
# 1. Análisis estático
cd apps/mobile && flutter analyze lib/features/chat/ lib/features/sessions/
# → "No issues found!"

# 2. Tests
cd apps/mobile && flutter test test/features/chat/ test/features/sessions/
# → exit code 0

# 3. Sin setState en notifiers
grep -rn "setState" apps/mobile/lib/features/chat/ui/ apps/mobile/lib/features/sessions/ui/ --include="*.dart"
# → solo en ConsumerStatefulWidget._ChatScreenState (el scroll controller es legítimo)

# 4. Context ring presente en el input
grep -n "ContextRing" apps/mobile/lib/features/chat/ui/widgets/chat_input_bar.dart
# → al menos 1 línea

# 5. Sessions Console conectado al WS
grep -n "global_log\|wsClient" apps/mobile/lib/features/sessions/ui/sessions_console_notifier.dart
# → al menos 1 línea

# 6. Sin polling (sin Timer.periodic) en los nuevos notifiers
grep -rn "Timer.periodic" apps/mobile/lib/features/sessions/ui/ apps/mobile/lib/features/chat/ui/ --include="*.dart"
# → cero líneas
```

---

## 5. Restricciones No Negociables

1. **Orden estricto**: 13.1 → 13.2 → 13.3 → 13.4 → 13.5.
2. **Un commit por sub-hito**: `feat(mobile): hito-13.1-context-meter`, etc.
3. **No implementar Kanban de sesiones en este hito** — queda para H14 si se decide priorizar.
4. **`flutter analyze` verde** antes de pasar al siguiente sub-hito.
5. **`SessionsConsoleNotifier` sin `StreamController`** — usa el `WsClient` existente como stream.
6. **El historial de input (`sentHistory`) es local** — no se persiste en el backend.
