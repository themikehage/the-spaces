# Plan 33 — Botón copiar siempre visible en mensajes + eliminar hover-reveal

**Estado:** 🔜 Pendiente de implementar — diagnóstico completado

## Contexto actual (inventario)

- **Copy existente:** solo en bloques de texto del asistente y oculto tras hover: `apps/client/src/components/chat/MessageBlocks.tsx:99-107` con `opacity-0 group-hover:opacity-100` (línea 102). Renderizado en los dos branch del bloque (líneas 112-113 y 261-263 sobre `<div className="relative group">`).
- **UserBubble** (`apps/client/src/components/chat/SystemMessage.tsx:182-317`): sin ninguna acción; footer solo timestamp (308-312).
- **Footer de metadatos asistente:** `apps/client/src/components/chat/MessageGroup.tsx:172-211` (siempre visible, texto plano).
- No existen edit/resend/delete/regenerate en ningún mensaje.

## Otras visibilidades gated por hover en chat

- `ImageGrid.tsx:224` y `:290` — overlay con botones Download / open-in-new-tab: `opacity-0 group-hover:opacity-100`.
- `AttachmentPreview.tsx:54` — botón X: `md:opacity-0 md:group-hover:opacity-100` (en mobile ya visible).
- `tools/DecomposeResult.tsx:87` — dimming de texto en hover (no es botón).
- Fuera de chat (si el objetivo es global): `WorkflowsListPage.tsx:100`, `SessionsKanbanPage.tsx:106-108`, `WorkspaceFileTreeNode.tsx:142`, `workflow/WorkflowStepCard.tsx:153`.

## Plan de fix

1. Añadir fila de acciones por mensaje (user + asistente), visible siempre, debajo del contenido:
   - Anclada donde hoy está el footer de metadatos (`MessageGroup.tsx:172-211`) para el asistente y al contenedor de `UserBubble` para el usuario.
   - Botón "Copiar" que copie el texto plano del mensaje (`navigator.clipboard.writeText`) con feedback tipo Check "Copiado" (reutilizar patrón de `MessageBlocks.tsx:89-107`).
2. Eliminar el copy flotante de `MessageBlocks.tsx:99-107` en favor de esa fila (evitar duplicados).
3. Quitar `opacity-0 group-hover:opacity-100` en imágenes (`ImageGrid.tsx`), attachment X (`AttachmentPreview.tsx`) y cualquier superficie de botones en chat → siempre visibles (estado hover solo de color).

## Verificación

- Typecheck client (`pnpm --filter client run typecheck` y `build`).
- Mobile: tocar mensaje / imagen muestra las acciones sin necesidad de hover.

## Archivos implicados

- `apps/client/src/components/chat/MessageBlocks.tsx`
- `apps/client/src/components/chat/MessageGroup.tsx`
- `apps/client/src/components/chat/SystemMessage.tsx` (`UserBubble`)
- `apps/client/src/components/chat/ImageGrid.tsx`
- `apps/client/src/components/chat/AttachmentPreview.tsx`