# Plan 17 — Fase 1: `IAgentRuntime` + `IEventBus`

> Rama: `feat/decouple-agent-runtime`
> Riesgo: 🟢 Mínimo — solo agregar interfaces, cero cambios de comportamiento

## Objetivo

Hacer que `AgentSession` exponga una interfaz tipada (`IAgentRuntime`) en lugar de ser el tipo concreto que circula por todo el server. Reemplazar el `TypedEventEmitter` ad-hoc por un `IEventBus` tipado con discriminated union de eventos.

## Contexto

Actualmente el server pasa `AgentSession` (clase concreta de 863 líneas) como dependencia directa en session-manager, routes y ws handlers. No hay contrato en código — solo la implementación.

El `TypedEventEmitter` actual no tiene discriminated union de eventos: emite `AgentSessionEvent` pero sin tipado estricto por evento.

## Archivos a crear

### `apps/server/src/core/ports/agent-runtime.port.ts` [NEW]

Interfaz pública del runtime de agente. Todo consumidor del server pasa a depender de esta interfaz, no de `AgentSession`.

```ts
import type { AgentSessionEvent } from "../../ai/agent-session";

export interface IAgentRuntime {
  readonly sessionId: string;
  readonly cwd: string;
  readonly isStreaming: boolean;

  prompt(message: string, opts?: { signal?: AbortSignal }): Promise<void>;
  abort(): Promise<void>;
  getMessages(): unknown[];
  getContextUsage(): { used: number; total: number };

  on(handler: (event: AgentSessionEvent) => void): () => void;
}
```

### `apps/server/src/core/ports/event-bus.port.ts` [NEW]

`IEventBus` tipado con discriminated union. Compatible con el auto-browser, adaptado a los eventos actuales del server.

```ts
import type { AgentSessionEvent } from "../../ai/agent-session";

export type AgentEventTypeKey = AgentSessionEvent["type"];

export type AgentEventByType<K extends AgentEventTypeKey> = Extract<AgentSessionEvent, { type: K }>;

export interface IEventBus {
  emit(event: AgentSessionEvent): void;
  on<K extends AgentEventTypeKey>(
    type: K,
    handler: (event: AgentEventByType<K>) => void,
  ): () => void;
  onAny(handler: (event: AgentSessionEvent) => void): () => void;
  clear(): void;
}
```

## Archivos a modificar

### `apps/server/src/ai/agent-session.ts` [MODIFY]

- Agregar `implements IAgentRuntime` a la clase (verificar que ya satisface la interfaz)
- Cambiar el tipo de `eventBus` de `TypedEventEmitter` a `IEventBus` (sin cambiar la implementación)
- Agregar método `on(handler)` que delega a `eventBus.onAny(handler)` si no existe

### `apps/server/src/core/event-bus.ts` [MODIFY]

- Hacer que `TypedEventEmitter` implemente `IEventBus`
- Agregar `on<K>(type, handler)` con filtrado por `event.type`

## Checklist

- [x] Crear `agent-runtime.port.ts`
- [x] Crear `event-bus.port.ts`
- [x] `AgentSession implements IAgentRuntime` — typecheck pasa
- [x] `TypedEventEmitter implements IEventBus` — typecheck pasa
- [x] `pnpm --filter server run typecheck` sin errores

## Verificación

```bash
pnpm --filter server run typecheck
```

Sin cambios de comportamiento en runtime — solo tipos.
