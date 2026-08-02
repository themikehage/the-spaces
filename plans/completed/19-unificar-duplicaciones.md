# Plan 19 — Unificar Funcionalidades Duplicadas (COMPLETADO)

> **Fecha de finalización:** 2026-08-02  
> **Estado:** COMPLETADO  
> **Repositorio:** `the-spaces`

---

## Resumen de Logros

1. **Eliminación del Event Bus Legacy:**
   - Se removió `apps/server/src/core/event-bus.ts` (`TypedEventEmitter`).
   - Se consolidó `IEventBus` (`@spaces/core`) implementado por `EventBus` (`@spaces/engine`).

2. **Canonización de Interfaces y Stores:**
   - `@spaces/core/ports/session.port.ts` es el contrato único de almacenamiento de sesiones. Se marcó `@deprecated` en `shared/stores/session-store.ts`.
   - Se eliminaron `file-session-store.ts`, `memory-session-store.ts` y `session-persistence.ts`.
   - `ServerSpacesHost` utiliza `FilesystemSessionStore` de `@spaces/storage`.

3. **Consolidación de Registros de Herramientas y Prompts:**
   - Se eliminó la clase duplicada `ToolRegistry` de `@spaces/engine` y `core/tool-registry.ts`.
   - `DefaultToolRegistry` (`@spaces/tools`) es el único registro concreto que implementa `IToolRegistry`.
   - Se descompuso `SessionPromptBuilder` en clases `PromptSection` (`apps/server/src/core/prompts/sections/`).

4. **Reglas de Permisos e Infección de Tipos:**
   - Se eliminó `apps/server/src/core/sandbox/permission-engine.ts` y el singleton `permissionEngine`.
   - Se inyectaron las reglas `DENY_RULES` y `ASK_RULES` en `@spaces/engine`.
   - Se reemplazó `z.unknown()` por `ContentBlockSchema` en `packages/core/src/schemas/message.schema.ts`.
   - Se extrajo la utilidad `zodToJsonSchema` en `@spaces/core`, eliminando cast `as any` en `engine`, `tools` y `sandbox`.
   - Se creó el puerto `IProviderRegistry` en `@spaces/core/ports/provider.port.ts` implementado por `@spaces/providers`.

5. **Verificación Estricta:**
   - `pnpm typecheck` ejecutado en los 11 paquetes del monorepo con 0 errores.
   - `pnpm build` completado exitosamente en todo el workspace.

---

## Verificación

```bash
# Verificación de compilación TypeScript en todo el monorepo
pnpm typecheck

# Verificación de compilación y empaquetado global
pnpm build
```
