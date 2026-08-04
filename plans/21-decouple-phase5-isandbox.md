# Plan 21 — Fase 5: `ISandbox`

> Rama: `feat/decouple-agent-runtime`
> Riesgo: 🟢 Bajo — aislado en bash-tool, no afecta el resto del sistema
> Depende de: Plan 20 completado (necesita `ITool` y `ToolContext`)

## Objetivo

Desacoplar `bash-tool.ts` de la ejecución directa de procesos (`Bun.spawn`, `child_process`). Introducir `ISandbox` como interfaz inyectable para que bash use el sandbox por DI en lugar de llamar al OS directamente.

## Contexto

### Estado actual

`apps/server/src/ai/bash-tool.ts` (11.7 KB) llama directamente a `Bun.spawn` / `child_process.exec`. No hay forma de:

- Testear la bash tool en aislamiento (sin ejecutar comandos reales)
- Cambiar el backend de ejecución (ej: Docker, sandbox remoto) sin modificar el archivo
- Agregar restricciones de paths/comandos de forma composable

### `restricted-paths.ts` ya existe

`apps/server/src/ai/restricted-paths.ts` tiene la lógica de paths bloqueados. `ISandbox` puede incorporar esto como validación interna.

## Archivos a crear

### `apps/server/src/core/ports/sandbox.port.ts` [NEW]

```ts
export interface SandboxOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
}

export interface SandboxResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ISandbox {
  execute(cmd: string, opts?: SandboxOptions): Promise<SandboxResult>;
  isAllowed(cmd: string, cwd?: string): boolean;
}
```

### `apps/server/src/core/sandbox/local.sandbox.ts` [NEW]

Implementación local usando `Bun.spawn`. Encapsula la lógica actualmente inline en `bash-tool.ts`:

```ts
import type { ISandbox, SandboxOptions, SandboxResult } from "../ports/sandbox.port";
import { isRestrictedPath } from "../../ai/restricted-paths";

export class LocalSandbox implements ISandbox {
  constructor(private readonly restrictedPaths: string[] = []) {}

  isAllowed(cmd: string, cwd?: string): boolean {
    if (cwd && isRestrictedPath(cwd)) return false;
    return true;
  }

  async execute(cmd: string, opts?: SandboxOptions): Promise<SandboxResult> {
    // Lógica actual de bash-tool.ts extraída aquí
    // Usa Bun.spawn internamente
  }
}
```

## Archivos a modificar

### `apps/server/src/ai/bash-tool.ts` [MODIFY]

- Recibir `ISandbox` por parámetro en la función que crea la tool (o en `ToolContext`)
- Delegar la ejecución a `sandbox.execute(cmd, { cwd, signal, timeout })`
- Delegar la validación de paths a `sandbox.isAllowed(cmd, cwd)`
- La lógica de formateo de output (`bash-output-filter.ts`) permanece en bash-tool

**Estrategia**: no reescribir bash-tool, solo extraer el `Bun.spawn` call a una función que reciba `ISandbox`. El resto de la lógica (parsing, output streaming, timeout handling) permanece in-place.

### `apps/server/src/core/server-context.ts` [MODIFY]

- Agregar `sandbox: ISandbox` al `ServerContext`
- Default: `new LocalSandbox()`
- `ServerContextOptions` acepta `sandbox?: ISandbox` para override en tests

```ts
export interface ServerContext {
  // ... existing ports ...
  sandbox: ISandbox;
}
```

## Checklist

- [x] Crear `sandbox.port.ts`
- [x] Crear `local.sandbox.ts` con `LocalSandbox implements ISandbox`
- [x] `bash-tool.ts` recibe `ISandbox` y delega ejecución
- [x] `ServerContext` incluye `sandbox: ISandbox`
- [x] `createServerContext()` instancia `LocalSandbox` por defecto
- [x] `pnpm --filter server run typecheck` sin errores

## Verificación

```bash
pnpm --filter server run typecheck
```

Smoke test: ejecutar una bash command desde el agente (ej: `ls`, `echo hello`) y verificar output correcto.

## Valor adicional

Una vez que `ISandbox` existe, agregar tests para bash-tool se vuelve trivial:

```ts
// test: bash-tool.test.ts
const mockSandbox: ISandbox = {
  execute: async () => ({ stdout: "hello", stderr: "", exitCode: 0 }),
  isAllowed: () => true,
};

const tool = createBashTool(mockSandbox);
const result = await tool.execute("cmd-id", { command: "echo hello" }, ctx);
// assert result.content[0].text === "hello"
```
