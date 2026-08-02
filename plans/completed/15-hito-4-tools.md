# Hito 4: Tools — Implementaciones ITool — ✅ [COMPLETADO]

**Objetivo**: tools migradas al contrato `ITool` con Zod schema obligatorio. Cada tool < 100 líneas (o modularizada con helpers).

---

## Archivos Creados en `@spaces/tools`

| Tarea / Tool          | Archivo                               | Descripción                                                                      |
| --------------------- | ------------------------------------- | -------------------------------------------------------------------------------- |
| Helper de Seguridad   | `packages/tools/src/path-safety.ts`   | Prevención de traversal attacks fuera del workspace                              |
| Bash Executor         | `packages/tools/src/bash-executor.ts` | Spawn de comandos shell (child_process), timeout, abort y truncado a 50KB        |
| Bash Tool             | `packages/tools/src/bash.tool.ts`     | Implementación `ITool` con Zod parameters y approval requerido                   |
| Read Tool             | `packages/tools/src/read.tool.ts`     | Lectura paginada (offset/limit), detección de archivos binarios                  |
| Write Tool            | `packages/tools/src/write.tool.ts`    | Escritura de archivos con creación recursiva de directorios padre                |
| Edit Diff Helper      | `packages/tools/src/edit-diff.ts`     | Lógica de parches unified diff y reemplazo de bloques de texto                   |
| Edit Tool             | `packages/tools/src/edit.tool.ts`     | Edición quirúrgica de archivos mediante reemplazo de bloques `oldText`/`newText` |
| Glob Tool             | `packages/tools/src/glob.tool.ts`     | Búsqueda de archivos por patrón glob respetando `.gitignore`                     |
| Grep Tool             | `packages/tools/src/grep.tool.ts`     | Búsqueda de contenido con soporte para expresiones regulares o cadenas literales |
| WebFetch Tool         | `packages/tools/src/webfetch.tool.ts` | HTTP Fetch client con soporte GET/POST                                           |
| Default Tool Registry | `packages/tools/src/tool-registry.ts` | Implementación de `IToolRegistry` para registro y exportación a formato LLM      |
| Barrel Export         | `packages/tools/src/index.ts`         | Factory `createDefaultToolRegistry()` y exports públicos de las tools            |

---

## Verificación Realizada

- `pnpm --filter @spaces/tools run typecheck` → **0 errores**
- `pnpm typecheck` (workspace completo) → **0 errores**
