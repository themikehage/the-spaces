# Plan 20 — Limpiar Cliente (Integrar v2, Eliminar Componentes Legacy) (COMPLETADO)

> **Fecha de finalización:** 2026-08-02  
> **Estado:** COMPLETADO  
> **Repositorio:** `the-spaces`

---

## Resumen de Logros

1. **Unificación de Infraestructura de API & WebSocket:**
   - Se reescribió `lib/api.ts` con la firma tipada `apiFetch<T>(path, init?) -> Promise<T>` con `ApiError`, soporte para 204 No Content y disparo del evento `auth-unauthorized` en status 401.
   - Se eliminó el archivo duplicado `api/client.ts`.
   - Se reescribió `lib/ws-client.ts` con la implementación orientada a eventos `AgentEvent` de `@spaces/core` (reconexión automática, cola offline, ping/pong).
   - Se eliminó `api/ws.ts` y se actualizaron todos los consumidores (`useWebSocket`, `attention-store`, `useConnectionAware`, `useTeam`).

2. **Unificación de Gestión de Sesiones:**
   - Se refactorizó `SessionsContext.tsx` (128 líneas) para consumir `useSessions` de `@/hooks/useSessions` internamente, manteniendo la superficie pública del contexto sin romper consumidores.

3. **Descomposición de Componentes Core de Chat (< 300 Líneas):**
   - `ChatArea.tsx`: reducido de 927 a 131 líneas.
   - `MessageList.tsx`: reducido de 852 a 85 líneas, extrayendo el renderizado de llamadas a herramientas a `ToolCallCard.tsx` (60 líneas).
   - `ChatInput.tsx`: reducido de 659 a 95 líneas, extrayendo la barra de herramientas a `ChatToolbar.tsx` (66 líneas).

4. **Descomposición de Layout y Eliminación de la Isla /v2:**
   - Se eliminó el god object `MainLayout.tsx` (803 líneas) y se reemplazó por la arquitectura modular `AppShell.tsx` (55 líneas), `AppSidebar.tsx` (43 líneas) y `AppHeader.tsx` (41 líneas).
   - Se eliminó la ruta `/v2` de `router/routes.tsx`.
   - Se eliminaron los 7 componentes v2 huérfanos: `Layout.tsx`, `ChatArea.tsx`, `ChatInput.tsx`, `MessageList.tsx`, `MessageBubble.tsx`, `Markdown.tsx`, `SessionList.tsx`.

5. **Verificación Estricta:**
   - `pnpm --filter client typecheck`: 0 errores.
   - `pnpm --filter client build`: compilación exitosa.

---

## Verificación

```bash
# Verificación de TypeScript en el cliente
pnpm --filter client typecheck

# Verificación de compilación de producción del cliente
pnpm --filter client build
```
