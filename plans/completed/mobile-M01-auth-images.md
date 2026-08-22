# M01 — Imágenes Inline con Auth en Markdown

**Ámbito**: `apps/mobile/lib/features/chat/ui/widgets/markdown_block.dart` y soporte en el repositorio de sesión.  
**Problema**: Las imágenes embebidas en el markdown de los mensajes del agente se renderizan sin el header `Authorization: Bearer <token>`. El servidor requiere autenticación en todos los endpoints de assets → las imágenes no cargan (broken image).  
**Dependencias de hitos anteriores**: Ninguna. Este hito es autónomo.

---

## 1. Estado Actual (As-Is) — Mediciones Concretas

| Punto de medición | Evidencia |
|---|---|
| `markdown_block.dart` usa `flutter_markdown` con el `MarkdownStyleSheet` por defecto | No hay override de `imageBuilder` ni `inlineSyntaxes` para URLs de workspace |
| `workspace_repository.dart:147-157` obtiene `rawUrl` con token como query param solo para imágenes del file browser | El patrón no existe en el flujo de mensajes de chat |
| `chat_notifier.dart` no extrae ni expone el token de sesión al widget de markdown | El widget no tiene acceso al Bearer token |
| `flutter_markdown` renderiza `![alt](url)` con `Image.network(url)` sin headers | Cualquier URL que requiera `Authorization` header falla con 401/403 |

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

Criterios **binarios**. El hito está completo cuando todos son `true`.

- [x] **A1** — `MarkdownBlock` acepta un parámetro `authToken: String?` y lo propaga al `imageBuilder`.
- [x] **A2** — El `imageBuilder` devuelve un widget que descarga la imagen con `Authorization: Bearer $authToken` cuando la URL coincide con el patrón del servidor.
- [x] **A3** — URLs externas (no de workspace) se renderizan con `Image.network` sin modificación.
- [x] **A4** — El token se pasa desde `MessageBubble` sin romper la cadena de widgets existente.
- [x] **A5** — Estado `loading` muestra shimmer/indicador; estado `error` muestra icono roto, nunca crash.
- [x] **A6** — `flutter analyze` produce cero errores y cero warnings nuevos respecto a `main`.
- [x] **A7** — Prueba manual: imagen generada por agente al workspace se visualiza en el bubble sin abrir file browser.

---

## 3. Hitos Innegociables

Los hitos se ejecutan en orden estricto. **Cada hito pasa su verificación antes de comenzar el siguiente.**

---

### Hito 1.A — `AuthenticatedImageProvider`

**Responsabilidad**: Proveedor de imagen con Bearer token como header HTTP.

**Artefactos**:

1. **NUEVO** `apps/mobile/lib/shared/providers/authenticated_image_provider.dart`
   - `AuthenticatedImageProvider extends ImageProvider<AuthenticatedImageProvider>`.
   - Constructor: `({ required String url, String? token, double scale = 1.0, Map<String, String>? headers })`.
   - Override de `loadImage`/`obtainKey` usando `HttpClient` con header `Authorization: Bearer $token`.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/shared/providers/authenticated_image_provider.dart
# No issues found!
```

---

### Hito 1.B — `imageBuilder` en `MarkdownBlock`

**Responsabilidad**: Conectar el proveedor autenticado al renderer de markdown.

**Artefactos**:

1. **MODIFICAR** `apps/mobile/lib/features/chat/ui/widgets/markdown_block.dart`
   - Añadir parámetro `final String? authToken`.
   - `sizedImageBuilder` en `MarkdownBody`:
     - URL de workspace + token → `AuthenticatedImageProvider`.
     - URL externa → `NetworkImage`.
   - Envuelto en `ClipRRect` consistente con el diseño actual con tap hacia `ImageLightbox`.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/features/chat/ui/widgets/markdown_block.dart
# No issues found!
```

---

### Hito 1.C — Propagación desde `MessageBubble`

**Responsabilidad**: El árbol de widgets entrega el token correcto.

**Artefactos**:

1. **MODIFICAR** `apps/mobile/lib/features/chat/ui/widgets/message_bubble.dart`
   - Recibir `authToken` y propagarlo a `MarkdownBlock`.

2. **MODIFICAR** `apps/mobile/lib/features/chat/ui/widgets/streaming_bubble.dart`
   - Mismo patrón.

3. **MODIFICAR** `apps/mobile/lib/features/chat/ui/chat_screen.dart`
   - Extraer `authToken` de `authTokenProvider` y propagar a bubbles.

**Verificación**:
```bash
flutter analyze apps/mobile/lib/features/chat/
# No issues found!

flutter test apps/mobile/test/
# Exit code 0 (325 tests passed)
```

---

## 4. Restricciones No Negociables

1. Sin dependencias nuevas si `http` ya está en `pubspec.yaml`. Verificar antes de añadir.
2. Sin cambios de comportamiento en textos, código ni otros elementos markdown.
3. Un commit por hito: `feat(mobile/chat): M01-A auth image provider`, etc.
4. `flutter analyze` en verde al final de cada hito.
5. El token nunca se hardcodea ni se loguea.
6. Tipos explícitos en todos los métodos — cero `dynamic` innecesarios.
