# Plan 31 — Diagnóstico: UI desincronizada tras loops/interacciones largas

**Estado:** ✅ Completado — resuelto e implementado en cliente y servidor

## Síntoma

En sesiones largas (muchos loops de tools, reconexiones, navegación entre sub-sesiones) la UI se desincroniza: el agente **ya terminó en el servidor**, pero el chat sigue mostrando "streaming" y/o falta el mensaje final. Solo se "entera" tras el siguiente `agent_start`/`agent_end` o recargando.

## Arquitectura de eventos (contexto)

- **Un solo WS por usuario** (`ws-client.ts`, sin conexión por sesión).
- El cliente navega con `session_subscribe`/`session_unsubscribe` (`useWebSocket.ts`) sobre el mismo socket.
- El servidor reenvía los eventos del `EventBus` de la sesión tal cual al socket (`ws/factory.ts:75` → `session.subscribe(...)` → `safeSend`).
- `TypedEventEmitter.emit` `await` **secuencialmente** cada listener (`core/infra/event-bus.ts:57-65`). El engine `processEvents` (`vendor/agent/src/agent.ts:596-598`) también `await` los listeners en orden.
- El `streaming` del chat se pone a `false` SOLO con `agent_end` o `agent_error` (`useChatAreaState.ts:283-286,398-403`). `message_end` no toca el flag.

## Causas raíz

### A. Leak de listeners WS en el bus de la sesión (servidor)

En `apps/server/src/ws/factory.ts` (`subscribeWsToSession`):
- `session_unsubscribe` (línea 397-411) SOLO quita el socket del `wsRegistry`; **no llama al `unsub`** devuelto por `session.subscribe` → el listener que hace `safeSend` queda pegado al `EventBus` de la sesión.
- Al re-suscribir (línea 176) `wsRegistry.setUnsub(wsId, unsub)` **sobrescribe la referencia sin invocar la anterior**.
- Factor multiplicador: en el cliente, `useConnectionAwareEffect` (`useConnectionAware.ts:32-43`) re-ejecuta la acción **en cada reconexión sin correr el cleanup** → cada reconexión envía OTRO `session_subscribe` sin `session_unsubscribe`. El ping-watchdog de `ws-client.ts` (25-31) fuerza reconexiones regulares (45s sin pong) en sesiones largas.

Consecuencias sobre el bus (que `emit` serializa):
1. **Duplicación**: N listeners → cada evento (delta, `message_end`, `agent_end`) viaja N veces por el socket (los handlers del cliente son mayormente idempotentes vía `findMsgIndex`).
2. **Latencia/propagación**: `agent_end` queda al final de una cadena de N `await`; si el socket se corta en esa ventana (watchdog red), `agent_end`/`message_end` finales se pierden.

### B. `streaming` queda pegado en el cliente

- `streaming` solo baja con `agent_end` o `agent_error` (`useChatAreaState.ts`).
- `loadMessages()` (reload tras reconexión, línea 449-457) **no resetea `streaming`**.
- Si el `agent_end` se pierde (causa A, o corte de red justo al terminar), el spinner queda activo para siempre aunque los mensajes ya estén cargados tras el reload.

### C. Contribuyentes

- `SESSION_SCOPED_TYPES` (`packages/shared/src/ws-messages.ts:10-24`) filtra bien por `sessionId` en el cliente, pero los `global_log`/`session_status` no son scoped y van a todos los sockets.
- El mensaje final lo entrega SOLO `message_end` directo (`subscribeWsToSession`), no el `eventBroker`; el publisher solo emite deltas.

## Plan de fix

1. **Servidor — limpiar suscripciones de verdad:**
   - En `session_unsubscribe` y al re-suscribir en `subscribeWsToSession`, **invocar el `unsub` previo** (y el que esté en `wsRegistry`) antes de registrar el nuevo. Guardar el unsub activo por `wsId` y llamarlo siempre.
   - Asegurar `getOrCreateSession` no acumule listeners en el `EventBus` de la sesión.
   - Considerar que `TypedEventEmitter.emit` no bloquee: emitir sin `await` secuencial (o `Promise.all` con aislamiento de errores) para no encolar el `agent_end`.
2. **Cliente — resetear streaming de forma robusta:**
   - En `loadMessages()` (y tras reconexión) descartar el estado `streaming` si el run del servidor ya terminó; p.ej. encuestar `session_status`/`context_usage`, o en `agent_end` ack, o timeout de seguridad.
   - Reducir reconexiones espurias del ping-watchdog (ver umbral de 45s) y que `useConnectionAwareEffect` envíe `session_unsubscribe` antes de re-subscribir.
3. **Idempotencia del mensaje final:** enviar también `message_end` con el mensaje completo vía el flujo seguro y que el cliente finalice por `message_end` y no solo por deltas; añadir ack de `agent_end` (`{ type: "agent_end_ack" }`) para que el servidor no considere entregado hasta confirmación.

## Verificación

- Test servidor: suscribirse a una sesión, re-suscribirse N veces, confirmar que `listenerCount` del bus de la sesión NO crece y que cada evento se envía una sola vez por socket.
- Test cliente/hook: simular pérdida de `agent_end` y verificar que `streaming` baja tras el reload/`context_usage`.

## Archivos implicados

- `apps/server/src/ws/factory.ts` (`subscribeWsToSession`, `session_unsubscribe`)
- `apps/server/src/core/infra/event-bus.ts`
- `apps/server/src/vendor/agent/src/agent.ts` (`processEvents`)
- `apps/server/src/core/session/session-event-publisher.ts`
- `apps/client/src/hooks/useWebSocket.ts` / `useConnectionAware.ts`
- `apps/client/src/hooks/useChatAreaState.ts` (flag `streaming`, `loadMessages`)
- `packages/shared/src/ws-messages.ts` (tipos scoped)