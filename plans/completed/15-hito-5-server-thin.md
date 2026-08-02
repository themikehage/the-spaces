# Hito 5: Server — Hono Thin

> Extraído de `plans/15-core-architecture-migration.md` para planificación detallada.

**Objetivo**: reemplazar el server monolítico por uno que delega al engine. Las rutas avanzadas conviven durante la transición.

## Estrategia de convivencia

El server existente sigue funcionando. El nuevo `AppContext` reemplaza los singletons globales. Las rutas migran una a una.

```
apps/server/src/
├── context.ts          ← NUEVO: AppContext (reemplaza singletons)
├── config.ts           ← NUEVO: config desde env
├── routes/
│   ├── sessions/
│   │   ├── index.ts           ← assembler
│   │   ├── sessions-crud.ts   ← POST/GET/DELETE /sessions
│   │   └── sessions-ws.ts     ← WS handler
│   └── [resto de rutas — sin cambios por ahora]
└── ws/
    └── handler.ts      ← REFACTOR: usar AgentRuntime events
```

| Tarea | Detalle | Estado |
|---|---|---|
| Crear `AppContext` | Reemplaza `createServerContext()` con deps del engine inyectadas | ✅ |
| Migrar `POST /sessions` | Crea `AgentRuntime` en lugar de `AgentSession` | ✅ |
| Migrar `GET /sessions` | Usa `ISessionStore.listSessions()` | ✅ |
| Migrar `DELETE /sessions/:id` | `agent.dispose()` + `sessionStore.delete()` | ✅ |
| Migrar WS handler | Forward de `agent.events` al WS client (`/ws/v2`) | ✅ |
| Migrar `GET /health` | Sin cambios | ✅ |

> Rutas que NO migran en este hito: `/teams`, `/schedules`, `/approvals`, `/mcp`, `/backup`, `/preview`, `/files`, `/gallery`.

**Criterio de done**: `pnpm --filter @spaces/server typecheck` → 0 errores. Flujo de chat funciona end-to-end.

---

## Plan de implementación detallado

Ver: `brain/48c19405-9d0e-46e6-b59c-685a218f5d06/implementation_plan.md`
