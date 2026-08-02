# Plan 18 — Eliminar los 26 Singletons → Dependency Injection (COMPLETADO)

> **Fecha de finalización:** 2026-08-02  
> **Estado:** COMPLETADO  
> **Repositorio:** `the-spaces`

---

## Resumen de Logros

1. **Eliminación del Singleton Global `sessionManager`:**
   - Se removió la exportación estática de `export const sessionManager = new SessionManager();` en `apps/server/src/core/session-manager.ts`.
   - Se actualizaron todos los puntos de consumo en controladores/rutas Hono (`routes/sessions.ts`, `routes/sessions/session-crud.ts`, `routes/agents.ts`, `routes/teams.ts`, `routes/settings.ts`, `routes/backup.ts`, `routes/env.ts`, `routes/files.ts`, `routes/models.ts`, `routes/providers.ts`), delegaciones y utilidades de backend.

2. **Inyección de Dependencias vía `AppContext` & Fábricas:**
   - Se registró `sessionManager` como miembro explícito de `AppContext` en `apps/server/src/context.ts`.
   - Las rutas Hono acceden a `sessionManager` de manera determinista utilizando `c.get("appContext").sessionManager`.
   - Los componentes de servicios (ej. `OrchestrationRunner`, `ScheduleService`, `createUserSession`) aceptan `sessionManager` inyectado a través de su constructor/opciones.

3. **Verificación Estricta:**
   - `pnpm typecheck` validó 0 errores en todos los paquetes del monorepo.

---

## Verificación

```bash
# Verificación de typecheck en todo el workspace
pnpm typecheck
# Output: Done en todos los paquetes y aplicaciones.
```
