# Hito 7: Client — Componentes Core — ✅ [COMPLETADO]

> Extraído de `plans/15-core-architecture-migration.md` para planificación e implementación detallada.

**Objetivo**: componentes de chat refactorizados y desacoplados (< 200 líneas cada uno), componibles sobre los hooks base del Hito 6.

---

## Componentes Core Implementados (`apps/client/src/components/`)

| Componente | Descripción | Límite | Estado |
|---|---|---|---|
| `Markdown.tsx` | Renderer liviano usando `react-markdown` + `remark-gfm` | < 80 líneas (17 líneas) | ✅ |
| `MessageBubble.tsx` | Burbuja user/assistant/system con soporte para text, tool_use y tool_result | < 100 líneas (72 líneas) | ✅ |
| `ChatInput.tsx` | Textarea con auto-focus, Enter para enviar, Shift+Enter para nueva línea y botón send/stop contextual | < 100 líneas (71 líneas) | ✅ |
| `MessageList.tsx` | Lista con scroll automático al fondo en streaming/mensajes nuevos | < 200 líneas (35 líneas) | ✅ |
| `ChatArea.tsx` | Integración de `MessageList` + `ChatInput` consumiendo `useChat` | < 150 líneas (47 líneas) | ✅ |
| `SessionList.tsx` | Sidebar de sesiones con crear, seleccionar y eliminar consumiendo `useSessions` | < 150 líneas (71 líneas) | ✅ |
| `Layout.tsx` | Shell responsivo que compone `SessionList` + `ChatArea` | < 150 líneas (22 líneas) | ✅ |

---

## Integración y Routing

- Agregada ruta `/v2` en `apps/client/src/router/routes.tsx` para renderizar el nuevo `Layout` de forma aislada sin romper la UI existente.

---

## Verificación

- `pnpm --filter client typecheck` → 0 errores
- `pnpm typecheck` (workspace completo) → 0 errores
- Todos los archivos cumplen estrictamente las restricciones de líneas (< 200 líneas por clase/componente) y convenciones de TypeScript strict mode.
