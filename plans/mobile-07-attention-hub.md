# Hito 7 — Attention Hub & Notificaciones

**Prerequisito**: Hito 6 completado y verificado (todos los criterios H6-A* en verde).

**Objetivo**: Equivalente del `AttentionHub` de la TopBar web. El agente puede hacer preguntas (`ask_question`) o requerir aprobaciones (`approval`) desde el servidor — el usuario mobile las ve en tiempo real, puede responder y el agente continúa. También incluye notificaciones locales cuando la app está en background.

**Principios innegociables**:
- `AttentionNotifier` es la única fuente de estado de pendientes — se alimenta del stream WS global.
- Responder a una pregunta/aprobación cierra el item del hub sin recargar toda la UI.
- Notificaciones locales solo cuando la app está en background — nunca duplicar con el badge del hub.
- El stub `AttentionNotifier` del Hito 3 se reemplaza completamente en este hito.

---

## 1. Estado Actual (As-Is)

- `AttentionNotifier` es un stub que retorna `count: 0`.
- `AttentionBadge` en el shell muestra siempre 0.
- El backend emite eventos WS `ask_question` y `approval_required` cuando un agente los genera.

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

- [ ] **H7-A1** — Agente genera `ask_question` → `AttentionBadge` en el bottom nav se actualiza con count en < 1 segundo.
- [ ] **H7-A2** — Tap en badge → `AttentionSheet` (bottom sheet) con lista de preguntas y aprobaciones pendientes.
- [ ] **H7-A3** — Responder a una pregunta desde `AttentionSheet` → agente continúa en el servidor → item desaparece del hub.
- [ ] **H7-A4** — Aprobar/rechazar una aprobación → agente continúa/cancela → item desaparece del hub.
- [ ] **H7-A5** — App en background + agente genera pregunta → notificación local push aparece en el dispositivo.
- [ ] **H7-A6** — Tap en notificación push → app abre → `AttentionSheet` se abre directamente.
- [ ] **H7-A7** — `AttentionNotifier` no tiene referencias a widgets.
- [ ] **H7-A8** — `flutter analyze lib/features/attention/` produce cero warnings.
- [ ] **H7-A9** — `flutter test test/features/attention/` produce exit code 0.

---

## 3. Hitos Innegociables

---

### Sub-hito 7.1: AttentionRepository

**Responsabilidad**: Responder a preguntas y aprobaciones via HTTP.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/attention/data/models/attention_item.dart`
   - `AttentionItem` con `freezed`: `id`, `type (question|approval)`, `sessionId`, `agentId`, `content`, `options?`, `createdAt`.

2. **[NEW]** `apps/mobile/lib/features/attention/data/attention_repository.dart`
   - `getPending()` → `GET /api/approvals?status=pending` → `List<AttentionItem>`.
   - `respondToQuestion(id, answer)` → `POST /api/approvals/:id/respond`.
   - `respondToApproval(id, approved)` → `POST /api/approvals/:id/approve` o `.../reject`.

**Verificación**:
```bash
cd apps/mobile && flutter test test/features/attention/attention_repository_test.dart
# getPending → lista tipada. respondToQuestion → success. respondToApproval → success.
```

---

### Sub-hito 7.2: AttentionNotifier (implementación real)

**Responsabilidad**: Reemplazar el stub del Hito 3 con implementación real.

**Artefactos**:

1. **[MODIFY]** `apps/mobile/lib/features/attention/ui/attention_notifier.dart`
   - `AttentionState { items, pendingCount, isLoading }` con `freezed`.
   - `AttentionNotifier extends AsyncNotifier<AttentionState>`.
   - `load()` — carga pendientes iniciales del backend.
   - `_listenToWsEvents()` — suscribe al stream WS global:
     - Evento `ask_question` → agrega item a `items` y aumenta `pendingCount`.
     - Evento `approval_required` → ídem.
     - Evento `approval_resolved` / `question_answered` → remueve item de `items`.
   - `respondToQuestion(id, answer)` → llama repository → remueve de `items`.
   - `respondToApproval(id, approved)` → llama repository → remueve de `items`.

**Verificación**:
```bash
cd apps/mobile && flutter test test/features/attention/attention_notifier_test.dart
# WS ask_question → pendingCount aumenta. respondToQuestion → pendingCount decreases. stub reemplazado.
```

---

### Sub-hito 7.3: AttentionSheet y ApprovalCard

**Responsabilidad**: UI de hub de atención.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/attention/ui/attention_sheet.dart`
   - Bottom sheet con lista de `AttentionItem`.
   - Item de tipo `question` → muestra `QuestionCard`.
   - Item de tipo `approval` → muestra `ApprovalCard`.
   - Empty state si no hay pendientes.

2. **[NEW]** `apps/mobile/lib/features/attention/ui/widgets/question_card.dart`
   - Muestra la pregunta del agente.
   - Campo de texto + botón "Send" → `attentionNotifier.respondToQuestion(id, answer)`.

3. **[NEW]** `apps/mobile/lib/features/attention/ui/widgets/approval_card.dart`
   - Muestra el contexto de la aprobación.
   - Botones "Approve" y "Reject" → `attentionNotifier.respondToApproval(id, approved)`.

**Verificación visual**: En simulador, forzar evento WS desde el servidor → badge aparece → sheet abre → responder → badge baja.

---

### Sub-hito 7.4: Notificaciones locales en background

**Responsabilidad**: Push local cuando la app está en background.

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/attention/notifications/local_notification_service.dart`
   - Inicializa `flutter_local_notifications`.
   - `showAttentionNotification(item)` — muestra notificación con título y contenido del item.
   - Al tap → `GoRouter.go('/attention')` que abre `AttentionSheet`.

2. **[MODIFY]** `apps/mobile/lib/features/attention/ui/attention_notifier.dart`
   - En `_listenToWsEvents()`: si la app está en background → llama `localNotificationService.showAttentionNotification(item)`.

3. **[MODIFY]** `apps/mobile/pubspec.yaml` — agrega `flutter_local_notifications: ^17.0.0`.

**Verificación**:
```bash
cd apps/mobile && flutter test test/features/attention/local_notification_test.dart
# showAttentionNotification llamado cuando app en background. No llamado cuando app en foreground.
```

---

## 4. Verificación Final del Hito 7

```bash
# 1. Análisis estático
cd apps/mobile && flutter analyze lib/features/attention/
# → "No issues found!"

# 2. Tests
cd apps/mobile && flutter test test/features/attention/
# → exit code 0

# 3. AttentionBadge ya no muestra siempre 0
grep -n "pendingCount: 0" apps/mobile/lib/features/attention/ui/attention_notifier.dart
# → cero líneas (el stub hardcodeado fue eliminado)

# 4. WS listener implementado
grep -n "_listenToWsEvents\|ask_question\|approval_required" apps/mobile/lib/features/attention/ui/attention_notifier.dart
# → al menos 2 líneas

# 5. Notificaciones solo en background
grep -n "AppLifecycleState\|background" apps/mobile/lib/features/attention/notifications/local_notification_service.dart
# → al menos 1 línea
```

---

## 5. Restricciones No Negociables

1. **Orden estricto**: 7.1 → 7.2 → 7.3 → 7.4.
2. **El stub del Hito 3 se elimina completamente** — no convivencia con la implementación real.
3. **Un commit por sub-hito**: `feat(mobile): hito-7.1-attention-repository`, etc.
4. **Notificaciones locales solamente** — no push remoto en este hito.
5. **`flutter analyze` verde** antes de pasar al siguiente sub-hito.
