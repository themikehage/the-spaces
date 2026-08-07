# Plan 28 — Workflow Node: `webhook` (Trigger de Entrada)

**Estado:** 🔜 Pendiente — referenciado desde Plan 27-A

## Contexto

Habilitar que sistemas externos disparen workflows vía HTTP. Complementa el nodo `http` (salida) con un trigger de entrada.

## Decisiones pendientes de confirmar

- Persistencia de registros de webhook: in-memory o disco
- Seguridad: path como shared secret vs HMAC signature validation
- Rate limiting por IP

## Dependencias

- Plan 27-A (`http` node) debe estar en producción primero
- Requiere nuevo dominio `routes/webhooks/`

## Referencia de análisis previo

Ver `plans/27-workflow-nodes-n8n-value-ranking.md` para el ranking estratégico.
