# Hito 3 — Providers + Storage + Sandbox — ✅ [COMPLETADO]

> Implementaciones concretas de las interfaces del core.

---

## Resultados

| Paquete             | Componentes creados                                            | Estado                                                     |
| ------------------- | -------------------------------------------------------------- | ---------------------------------------------------------- |
| `@spaces/providers` | `OpenAICompatibleProvider`, `ProviderRegistry`                 | ✅ `pnpm --filter @spaces/providers typecheck` → 0 errores |
| `@spaces/storage`   | `MemorySessionStore`, `FilesystemSessionStore`                 | ✅ `pnpm --filter @spaces/storage typecheck` → 0 errores   |
| `@spaces/sandbox`   | `LocalSandbox`, `DEFAULT_RESTRICTED_PATHS`, `isRestrictedPath` | ✅ `pnpm --filter @spaces/sandbox typecheck` → 0 errores   |

---

## Archivos Creados

### Providers

- `packages/providers/src/openai-compatible.ts`: Provider OpenAI-compatible con streaming SSE y soporte de tool calls.
- `packages/providers/src/provider-registry.ts`: Registro de providers de modelos.
- `packages/providers/src/index.ts`: Barrel export.

### Storage

- `packages/storage/src/memory.store.ts`: Almacenamiento de sesiones e historial en memoria (para tests/dev).
- `packages/storage/src/filesystem.store.ts`: Almacenamiento de sesiones en archivos JSONL en disco.
- `packages/storage/src/index.ts`: Barrel export.

### Sandbox

- `packages/sandbox/src/restricted-paths.ts`: Lista y evaluador de rutas restringidas de sistema.
- `packages/sandbox/src/local.sandbox.ts`: Ejecutor seguro de comandos con timeout, límite de output (50KB), verificación de seguridad y operaciones de archivos (`readFile`, `writeFile`, `listFiles`).
- `packages/sandbox/src/index.ts`: Barrel export.

---

## Verificación

```bash
pnpm --filter @spaces/providers --filter @spaces/storage --filter @spaces/sandbox typecheck
```

Resultado: **0 errores**.
