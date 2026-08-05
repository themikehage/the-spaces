# Plan 18 — Fase 2: `ISessionStore` + `IPromptBuilder`

> Rama: `feat/decouple-agent-runtime`
> Riesgo: 🟢 Bajo — las implementaciones concretas ya existen, solo se agregan interfaces
> Depende de: Plan 17 completado

## Objetivo

Desacoplar `AgentSession` de `JsonlSessionStore` y `PromptBuilder` como implementaciones concretas. Los tipos concretos pasan a ser detalles de implementación — los consumidores dependen de las interfaces.

## Contexto

Actualmente `AgentSession` recibe en su constructor:

- `sessionStore: JsonlSessionStore` — implementación concreta en `ai/session-persistence.ts`
- Construye `new PromptBuilder(resourceLoader)` — implementación concreta en `ai/prompt-builder.ts`

Estos tipos concretos se filtran hacia `session-manager.ts` y otros módulos de `core/`.

## Archivos a crear

### `apps/server/src/core/ports/session-store.port.ts` [NEW]

```ts
import type { AgentMessage } from "../ai/vendor/agent/src/types";

export interface SessionMeta {
  sessionId: string;
  createdAt: number;
  updatedAt: number;
  title?: string;
}

export interface ISessionStore {
  getMessages(sessionId: string): Promise<AgentMessage[]>;
  appendMessage(sessionId: string, msg: AgentMessage): Promise<void>;
  clearMessages(sessionId: string): Promise<void>;
  listSessions(): Promise<SessionMeta[]>;
  deleteSession(sessionId: string): Promise<void>;
}
```

> **Nota**: `JsonlSessionStore` tiene métodos adicionales (navigation, branching). La interfaz captura solo el contrato mínimo. Los métodos extras siguen disponibles en la implementación concreta para quien los necesite.

### `apps/server/src/core/ports/prompt-builder.port.ts` [NEW]

```ts
export interface AgentContext {
  sessionId: string;
  cwd: string;
  messages: unknown[];
}

export interface PromptSection {
  id: string;
  priority: number;
  condition?: (ctx: AgentContext) => boolean;
  render(ctx: AgentContext): Promise<string>;
}

export interface IPromptBuilder {
  addSection(section: PromptSection): void;
  build(ctx: AgentContext): Promise<string>;
}
```

## Archivos a modificar

### `apps/server/src/ai/session-persistence.ts` [MODIFY]

- Agregar `implements ISessionStore` a `JsonlSessionStore`
- Verificar que los 5 métodos del contrato ya existen (probable que sí)

### `apps/server/src/ai/prompt-builder.ts` [MODIFY]

- Agregar `implements IPromptBuilder` a `PromptBuilder`
- Agregar `addSection(section: PromptSection): void` si no existe
- La lógica interna no cambia

### `apps/server/src/ai/agent-session.ts` [MODIFY]

- Cambiar el tipo del campo `sessionStore` de `JsonlSessionStore` a `ISessionStore`
- Cambiar el tipo del campo `promptBuilder` de `PromptBuilder` a `IPromptBuilder`
- En `CreateAgentSessionOptions`, cambiar `sessionStore?: JsonlSessionStore` a `ISessionStore`

## Checklist

- [x] Crear `session-store.port.ts`
- [x] Crear `prompt-builder.port.ts`
- [x] `JsonlSessionStore implements ISessionStore` — typecheck pasa
- [x] `PromptBuilder implements IPromptBuilder` — typecheck pasa
- [x] `AgentSession` usa los tipos de interfaz en lugar de los concretos
- [x] `pnpm --filter server run typecheck` sin errores

## Verificación

```bash
pnpm --filter server run typecheck
```

Sin cambios de comportamiento en runtime.
