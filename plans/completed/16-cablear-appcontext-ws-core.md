# Plan 16 — Cablear AppContext y Migrar WebSocket + Rutas Core de Sesiones

**Estado:** ✅ COMPLETADO

## Contexto y Resumen de Cambios

1. **Ampliado AppContext (`apps/server/src/context.ts`)**:
   - Se añadió el método `dispose()` para liberar memoria y detener agentes activos al recibir eventos de apagado del servidor.

2. **CRUD del Engine como Default (`apps/server/src/routes/sessions/engine-session-crud.ts` & `index.ts`)**:
   - Implementados endpoints limpios utilizando el `ISessionStore` de `@spaces/storage`:
     - `GET /api/sessions` — Listar sesiones.
     - `POST /api/sessions` — Crear sesión y registrar agente en cache.
     - `GET /api/sessions/:id/messages` — Recuperar historial de mensajes.
     - `DELETE /api/sessions/:id` — Liberar agente y eliminar datos de sesión.
   - El router de sesiones del servidor fue sustituido por `createEngineSessionCrudRouter` de forma directa sin rutas legacy.

3. **WebSocket Productivo del Engine (`apps/server/src/routes/sessions/session-ws.ts` & `apps/client/src/api/ws.ts`)**:
   - Se migró la ruta `/ws/v2` a la ruta productiva `/ws`.
   - Se actualizó el cliente WebSocket (`apps/client/src/api/ws.ts`) para conectarse a `/ws`.
   - Se eliminaron el handler y contexto legacy de WebSocket en `apps/server/src/index.ts`.

4. **Eliminación de Código Zombie (`apps/server/src/core/server-context.ts`)**:
   - Se eliminó el archivo `server-context.ts` (`createServerContext`) y sus re-exports en `core/index.ts`.
   - `apps/server/src/index.ts` fue limpiado de auto-cleanups legacy y referencias a `memoryRegistry`.

5. **Verificación**:
   - `pnpm typecheck` ejecutado en todo el workspace (11 paquetes/apps) con **0 errores**.
