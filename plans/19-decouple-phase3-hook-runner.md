# Plan 19 — Fase 3: `IHookRunner`

> Rama: `feat/decouple-agent-runtime`
> Riesgo: 🟡 Medio — refactor interno de `AgentSession`, pero sin cambiar el contrato externo
> Depende de: Plan 17 y Plan 18 completados

## Objetivo

Reemplazar los callbacks sueltos `beforeToolCall` y `afterToolCall` de `AgentSession` por un `IHookRunner` componible. Los consumidores actuales (approval hooks, delegation hooks) se encapsulan como `Hook` concretos.

## Contexto

### Estado actual

`AgentSession` tiene:

```ts
beforeToolCall?: (context: BeforeToolCallContext, signal?: AbortSignal) => Promise<BeforeToolCallResult | undefined>;
afterToolCall?: (context: any) => Promise<void> | void;
```

Estos llegan desde `CreateAgentSessionOptions` y se pasan directamente al vendor `AgentLoopConfig`. Cualquier nuevo interceptor requiere modificar `AgentSession` o componer callbacks ad-hoc.

### Hallazgo del vendor

El vendor `AgentLoopConfig` ya acepta `beforeToolCall` y `afterToolCall`. El `IHookRunner` NO reemplaza el vendor — lo envuelve: al ejecutar el loop, el hook runner actúa como el callback que el vendor espera.

## Archivos a crear

### `apps/server/src/core/ports/hook.port.ts` [NEW]

```ts
import type {
  AfterToolCallContext,
  AfterToolCallResult,
  BeforeToolCallContext,
  BeforeToolCallResult,
} from "../ai/vendor/agent/src/types";

export interface Hook {
  id: string;
  priority: number;
  beforeToolCall?(
    ctx: BeforeToolCallContext,
    signal?: AbortSignal,
  ): Promise<BeforeToolCallResult | undefined>;
  afterToolCall?(
    ctx: AfterToolCallContext,
    signal?: AbortSignal,
  ): Promise<AfterToolCallResult | undefined>;
  onError?(error: Error): Promise<void>;
}

export interface IHookRunner {
  register(hook: Hook): void;
  unregister(hookId: string): void;
  runBeforeToolCall(
    ctx: BeforeToolCallContext,
    signal?: AbortSignal,
  ): Promise<BeforeToolCallResult | undefined>;
  runAfterToolCall(
    ctx: AfterToolCallContext,
    signal?: AbortSignal,
  ): Promise<AfterToolCallResult | undefined>;
}
```

### `apps/server/src/core/hook-runner.ts` [NEW]

Implementación de `IHookRunner`. Ejecuta hooks en orden de prioridad. Si algún `beforeToolCall` devuelve `{ block: true }`, detiene la cadena.

```ts
export class HookRunner implements IHookRunner {
  private hooks: Hook[] = [];

  register(hook: Hook): void {
    this.hooks.push(hook);
    this.hooks.sort((a, b) => a.priority - b.priority);
  }

  unregister(hookId: string): void {
    this.hooks = this.hooks.filter((h) => h.id !== hookId);
  }

  async runBeforeToolCall(ctx, signal) {
    for (const hook of this.hooks) {
      if (!hook.beforeToolCall) continue;
      const result = await hook.beforeToolCall(ctx, signal);
      if (result?.block) return result; // short-circuit
    }
    return undefined;
  }

  async runAfterToolCall(ctx, signal) {
    let result: AfterToolCallResult | undefined;
    for (const hook of this.hooks) {
      if (!hook.afterToolCall) continue;
      result = (await hook.afterToolCall(ctx, signal)) ?? result;
    }
    return result;
  }
}
```

## Archivos a modificar

### `apps/server/src/ai/agent-session.ts` [MODIFY]

1. Reemplazar los campos `beforeToolCall` y `afterToolCall` por `private hookRunner: IHookRunner`
2. En `initializeAgent()`, pasar al vendor:
   ```ts
   beforeToolCall: (ctx, signal) => this.hookRunner.runBeforeToolCall(ctx, signal),
   afterToolCall: (ctx, signal) => this.hookRunner.runAfterToolCall(ctx, signal),
   ```
3. Exponer método `registerHook(hook: Hook): void` para que los consumidores externos registren sus hooks

### `apps/server/src/core/session-manager.ts` [MODIFY]

- Los sitios que pasaban `beforeToolCall` callback ahora crean un `Hook` concreto y llaman a `session.registerHook(hook)`

### Hooks concretos a crear

Para cada callback existente que se pasa desde fuera, crear un `Hook` inline o en archivo separado:

- `ApprovalHook` — encapsula la lógica de `ui-approval-registry`
- `DelegationHook` — encapsula los checks de delegación

## Checklist

- [x] Crear `hook.port.ts`
- [x] Crear `hook-runner.ts` con `HookRunner implements IHookRunner`
- [x] `AgentSession` usa `IHookRunner` internamente
- [x] `AgentSession.registerHook(hook)` expuesto públicamente
- [x] `session-manager.ts` actualizado para usar hooks en lugar de callbacks
- [x] `pnpm --filter server run typecheck` sin errores

## Verificación

```bash
pnpm --filter server run typecheck
```

Smoke test manual: crear sesión, enviar prompt, verificar que approvals y delegation siguen funcionando.
