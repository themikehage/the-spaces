# M07 — Footer de Costo/Tokens + BranchNav + DelegationNotification

**Ámbito**: `apps/mobile/lib/features/chat/widgets/` — message_bubble, system messages.  
**Problema**: Los mensajes del agente en mobile no muestran el proveedor, modelo, tokens, costo en `$` ni timestamp. No existe navegación entre ramas de mensaje (BranchNav). Las notificaciones de delegación (executive summary + artifacts) tampoco existen.  
**Dependencias de hitos anteriores**: Ninguna. Este hito es autónomo.

---

## 1. Estado Actual (As-Is) — Mediciones Concretas

| Punto de medición | Evidencia |
|---|---|
| `message_bubble.dart` no muestra footer con provider/model/tokens/cost | Audit L74 |
| `chat_notifier.dart:77-240` procesa eventos WS pero no almacena tokens/costo por mensaje | Verificar en notifier |
| No existe `branch_nav.dart` ni lógica de `POST /api/sessions/:id/navigate` | Audit L72 |
| No existe `delegation_notification.dart` | Audit L73 |
| Web: `MessageGroup.tsx:9-77` muestra el footer completo | Fuente: audit |
| Web: `SystemMessage.tsx:7-67` tiene `BranchNav`; `SystemMessage.tsx:69-148` tiene `DelegationNotification` | Fuente: audit |

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

- [x] **A1** — Cada mensaje del agente muestra un footer con: provider badge, model name, tokens usados (input + output), costo en `$` formateado (ej. `$0.0024`), y timestamp relativo.
- [x] **A2** — El footer es colapsable: por defecto visible; tap → colapsa/expande.
- [x] **A3** — Botón "Copy" en cada mensaje de agente copia el contenido al portapapeles.
- [x] **A4** — El badge STEERING / FOLLOW-UP aparece en los mensajes de usuario según el modo enviado.
- [x] **A5** — Cuando existe más de una rama para un mensaje (branching), aparece `BranchNav` con `< 1/N >` y tap navega la rama vía `POST /api/sessions/:id/navigate`.
- [x] **A6** — Cuando el agente devuelve una notificación de delegación, aparece `DelegationNotification` con executive summary y lista de artifacts.
- [x] **A7** — `flutter analyze` produce cero errores y cero warnings nuevos.

---

## 3. Hitos Innegociables

---

### Hito 7.A — Modelo de datos de metadata de mensaje

**Responsabilidad**: Los eventos WS ya traen los datos; solo falta capturarlos en el modelo de mensaje.

**Artefactos**:

1. **MODIFICAR** `apps/mobile/lib/features/chat/models/chat_message.dart` (o equivalente)
   - Añadir campos opcionales: `provider: String?`, `model: String?`, `inputTokens: int?`, `outputTokens: int?`, `costUsd: double?`, `steerMode: String?` (`steering` | `follow_up`), `siblings: List<String>?`, `details: Map<String, dynamic>?`.

2. **MODIFICAR** `apps/mobile/lib/features/chat/notifiers/chat_notifier.dart`
   - En los eventos `message_end` / `agent_end` / `context_usage`: extraer y almacenar en el mensaje correspondiente los campos `provider`, `model`, `inputTokens`, `outputTokens`, `costUsd`.
   - En el evento de creación de mensaje de usuario: almacenar `steerMode`.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/features/chat/
# No issues found!
```

---

### Hito 7.B — `MessageFooter` widget

**Responsabilidad**: Footer de metadata visible bajo cada mensaje de agente.

**Artefactos**:

1. **NUEVO** `apps/mobile/lib/features/chat/widgets/message_footer.dart`
   - Constructor: `({ String? provider, String? model, int? inputTokens, int? outputTokens, double? costUsd, DateTime? timestamp })`.
   - Layout horizontal: provider chip → model name → tokens → costo → timestamp → copy button.
   - Si `costUsd` es null → no muestra el campo.
   - Tap en el footer → colapsa/expande (solo muestra timestamp cuando colapsado).
   - Copy button → `Clipboard.setData(ClipboardData(text: messageContent))` → `SnackBar` de confirmación.

2. **MODIFICAR** `apps/mobile/lib/features/chat/widgets/message_bubble.dart`
   - Añadir `MessageFooter` al bottom del bubble del agente.
   - Añadir badge STEERING / FOLLOW-UP en los bubbles de usuario según `steerMode`.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/features/chat/widgets/message_footer.dart
flutter analyze apps/mobile/lib/features/chat/widgets/message_bubble.dart
# No issues found!
```

---

### Hito 7.C — `BranchNav` widget + endpoint de navegación

**Responsabilidad**: Navegación entre ramas de mensaje.

**Artefactos**:

1. **NUEVO** `apps/mobile/lib/features/chat/widgets/branch_nav.dart`
   - Widget: `< 1/N >` con botones prev/next. Solo visible si `message.siblings.length > 1`.
   - Tap en botón → llama `chatNotifier.navigateBranch(targetId)`.

2. **MODIFICAR** `apps/mobile/lib/features/chat/repositories/chat_repository.dart` (o equivalente)
   - Método `navigateBranch(String sessionId, String targetId)` → `POST /api/sessions/$sessionId/navigate` con body `{ targetId }`.

3. **MODIFICAR** `apps/mobile/lib/features/chat/notifiers/chat_notifier.dart`
   - Método `navigateBranch` → llama el repositorio → recarga el historial para que el chat muestre la rama seleccionada.

4. **MODIFICAR** `message_bubble.dart`
   - Mostrar `BranchNav` debajo del footer si `message.siblings != null && message.siblings!.length > 1`.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/features/chat/
# No issues found!
```

---

### Hito 7.D — `DelegationNotification` widget

**Responsabilidad**: Mostrar el resultado de una delegación con executive summary y artifacts.

**Artefactos**:

1. **NUEVO** `apps/mobile/lib/features/chat/widgets/delegation_notification.dart`
   - Card distinguible (borde lateral de color, icono de agente delegado).
   - Header: nombre del agente delegado + estado (running/done/error).
   - Sección "Executive Summary": texto colapsable.
   - Sección "Artifacts": lista de archivos producidos.
   - Se renderiza como un tipo de mensaje de sistema cuando `message.isDelegation`.

2. **MODIFICAR** `apps/mobile/lib/features/chat/notifiers/chat_notifier.dart`
   - Manejar el evento WS de delegación y agregar un `ChatMessage` de tipo `delegation` al estado.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/features/chat/
# No issues found!

flutter test apps/mobile/test/features/chat/message_footer_branch_test.dart
# Exit code 0
```

---

## 4. Restricciones No Negociables

1. **El footer es progresivamente mejorado**: si `costUsd` es null, no se muestra el campo — nunca "null" o "0" como texto.
2. **BranchNav solo aparece cuando `siblings.length > 1`** — sin botones huérfanos.
3. **Copy del mensaje usa `Clipboard`** — sin dependencias externas.
4. **Un commit por hito**: `feat(mobile/chat): M07 message footer, branch navigation, and delegation notification`.
5. **`flutter analyze` en verde** al final de cada hito.
6. **El costo se formatea con 4 decimales mínimos**: `$0.0024`, no `$0.0`.
