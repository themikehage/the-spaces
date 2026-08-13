# Plan 35 — Quitar checkbox "Remember this decision" de la modal de autorización

**Estado:** 🔜 Pendiente de implementar — diagnóstico completado

## Contexto

La modal de autorización es `apps/client/src/components/approvals/GlobalApprovalOverlay.tsx`. Incluye un checkbox "Remember this decision" (líneas 99-113). En la práctica **no hace nada útil**.

## Por qué no funciona

Aunque hay cableado servidor completo:

- Cliente: envía `{ persist }` → `attentionStore.resolveApproval(id, { action, payload: { persist } })` (`lib/attention/attention-store.ts:110-133`) → `POST /api/approvals/:id` (`lib/api/attention.service.ts:18-25`).
- Servidor: `before-tool-call-hook.ts:108-121` guarda la decisión en `userPermissionStore.saveDecision` SOLO si `payload.persist` es truthy (`routes/approvals.ts:47-53` → `approval-manager.ts:76-100`).

Pero:
1. Las decisiones persistidas se consumen **solo** en `buildSubagentRules` (`sandbox/subagent-permissions.ts:181-182`). `PermissionEngine.evaluate()` (sesiones normales, `permission-engine.ts:155-220`) jamás lee `userPermissionStore`, así que para el caso común "no volver a preguntar" es un no-op.
2. El `pattern` guardado es el subject exacto del tool call (`extractSubject`, p.ej. el comando `bash` completo). `wildcardToRegex` (`subagent-permissions.ts:60-64`) ancla con `^...$`, así que casi nunca vuelve a coincidir.

## Plan de fix

1. Quitar de `GlobalApprovalOverlay.tsx`:
   - El estado `persist` (línea 42).
   - El checkbox + label (líneas 99-113).
   - El paso de `persist` en `handleResolve` (líneas 13-14, 120, 128) y la prop `persist` de `onResolve` (39).
2. Opcional: eliminar el código muerto de `before-tool-call-hook.ts:108-121` (solo aplica a subagentes por wiring actual) y revisar `approval-manager.ts`/`ResolveAttentionSchema` si no queda otro consumidor de `payload.persist`.

## Verificación

- Typecheck client y server.
- Aprobar/denegar una petición desde la modal → se resuelve sin cambio visible en la UI (checkbox ya no existe).

## Archivos implicados

- `apps/client/src/components/approvals/GlobalApprovalOverlay.tsx`
- `apps/server/src/core/session/before-tool-call-hook.ts` (opcional)
- `apps/server/src/core/approvals/approval-manager.ts` (revisar consumidores de payload)