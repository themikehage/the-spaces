# Plan 19 — Unificar Funcionalidades Duplicadas

> Elimina 14 pares de implementaciones duplicadas detectadas en la auditoría post-migración. Cada tarea tiene criterios de aceptación inamovibles según `skills/criterios-de-aceptacion-verificables.md`. Si un criterio falla, la tarea **no está completa**.

---

## Contexto

La auditoría encontró **14 pares de implementaciones duplicadas**. Esto es residuo directo de haber mantenido dos arquitecturas en paralelo. Con los singletons ya eliminados (Plan 18), las duplicaciones se vuelven visibles y eliminables.

**Rol en el plan general**: este plan es puramente de higiene. Elimina el "doble mantenimiento" y asegura que hay una sola implementación canónica por cada concepto. Sin este plan, cualquier cambio futuro requeriría tocar dos lugares.

---

## Motivación

- Mantener dos implementaciones del mismo concepto es fuente de bugs (divergencia)
- Las duplicaciones violan DRY
- Los contratos en conflicto (`shared` vs `@spaces/core`) causan confusión sobre cuál es la fuente de verdad

---

## Tareas

### Tarea 19.1 — Dos event buses

**Acción**: Eliminar `core/event-bus.ts` (`TypedEventEmitter`). Migrar consumidores a `@spaces/engine` `EventBus`.

**Archivos**: `core/event-bus.ts` (borrar), consumidores

**Criterios de aceptación**:

```bash
# AC1: El archivo viejo no existe
ls apps/server/src/core/event-bus.ts 2>&1
# Resultado esperado: "No such file or directory"

# AC2: Nadie importa del viejo event bus (excluyendo tests)
rg "from ['\"].*core/event-bus['\"]" apps/server/src/ --type ts --glob '!**/__tests__/**'
# Resultado esperado: 0 matches

# AC3: Ningún archivo de producción referencia TypedEventEmitter
rg -l "TypedEventEmitter" apps/server/src/ --type ts --glob '!**/__tests__/**'
# Resultado esperado: 0 matches

# AC4: Solo existe UNA clase que implementa IEventBus
rg -l "implements IEventBus" packages/ --type ts
# Resultado esperado: 1 archivo (packages/engine/src/event-bus.ts)

# AC5: TypeScript compila sin errores
pnpm typecheck
# Resultado esperado: exit code 0
```

---

### Tarea 19.2 — Dos ISessionStore interfaces

**Acción**: `@spaces/core/ports/session.port.ts` es el canónico. `shared/stores/session-store.ts` se marca como deprecated. Cero imports del shared ISessionStore en código nuevo.

**Archivos**: `shared/stores/session-store.ts` (marcar deprecated), `core/ports/session.port.ts` (canónico)

**Criterios de aceptación**:

```bash
# AC1: El ISessionStore de shared tiene @deprecated en su JSDoc
rg -B3 "export interface ISessionStore" packages/shared/src/stores/session-store.ts | rg "@deprecated"
# Resultado esperado: al menos 1 match

# AC2: El ISessionStore canónico está en @spaces/core sin @deprecated
rg "export interface ISessionStore" packages/core/src/ports/session.port.ts
# Resultado esperado: 1 match

# AC3: @spaces/core NO importa de shared (core no depende de nadie)
rg "from ['\"].*shared" packages/core/src/ --type ts
# Resultado esperado: 0 matches

# AC4: Las implementaciones de @spaces/storage usan el ISessionStore canónico
rg "ISessionStore" packages/storage/src/ --type ts
# Resultado esperado: al menos 2 matches (importado, no definido localmente)

# AC5: TypeScript compila sin errores
pnpm typecheck
# Resultado esperado: exit code 0
```

---

### Tarea 19.3 — Cuatro session store impls

**Acción**: Eliminar `core/stores/file-session-store.ts` y `core/stores/memory-session-store.ts`. `@spaces/storage` es canónico. `JsonlSessionStore` se elimina con `ai/session-persistence.ts`. Migrar `ServerSpacesHost:18`.

**Archivos**: Borrar `core/stores/file-session-store.ts`, `core/stores/memory-session-store.ts`, `ai/session-persistence.ts`. Migrar `core/spaces-host.ts`.

**Criterios de aceptación**:

```bash
# AC1: La carpeta core/stores/ no existe
ls apps/server/src/core/stores/ 2>&1
# Resultado esperado: "No such file or directory"

# AC2: ai/session-persistence.ts no existe
ls apps/server/src/ai/session-persistence.ts 2>&1
# Resultado esperado: "No such file or directory"

# AC3: Nadie importa de core/stores/ (excluyendo tests)
rg "from ['\"].*core/stores/" apps/server/src/ --type ts --glob '!**/__tests__/**'
# Resultado esperado: 0 matches

# AC4: Nadie importa de ai/session-persistence (excluyendo tests)
rg "from ['\"].*ai/session-persistence['\"]" apps/server/src/ --type ts --glob '!**/__tests__/**'
# Resultado esperado: 0 matches

# AC5: Solo existen 2 implementaciones de ISessionStore (@spaces/storage)
rg -c "implements ISessionStore" packages/storage/src/ --type ts
# Resultado esperado: 2

# AC6: TypeScript compila sin errores
pnpm typecheck
# Resultado esperado: exit code 0
```

---

### Tarea 19.4 — Cinco tool registries

**Acción**: `@spaces/tools` `DefaultToolRegistry` es canónico. Eliminar `@spaces/engine` `ToolRegistry` (en `tool-executor.ts`), `core/tool-registry.ts`, `shared/tools/tool-registry.ts`. El engine recibe `IToolRegistry` del `AppContext`.

**Archivos**: `engine/tool-executor.ts`, `engine/factories/default.agent.ts`, `core/tool-registry.ts` (borrar), `shared/tools/tool-registry.ts` (deprecated)

**Criterios de aceptación**:

```bash
# AC1: core/tool-registry.ts no existe
ls apps/server/src/core/tool-registry.ts 2>&1
# Resultado esperado: "No such file or directory"

# AC2: @spaces/engine NO define su propia clase ToolRegistry
rg "export class ToolRegistry" packages/engine/src/tool-executor.ts
# Resultado esperado: 0 matches

# AC3: @spaces/engine importa IToolRegistry de @spaces/core (no define el suyo)
rg "import.*IToolRegistry" packages/engine/src/ --type ts
# Resultado esperado: al menos 1 match

# AC4: Solo existe UNA clase que implementa IToolRegistry en @spaces/*
rg -l "implements IToolRegistry" packages/ --type ts
# Resultado esperado: 1 archivo (packages/tools/src/tool-registry.ts)

# AC5: La factory default.agent.ts recibe IToolRegistry, no instancia el suyo
rg "new ToolRegistry" packages/engine/src/factories/default.agent.ts
# Resultado esperado: 0 matches

# AC6: Nadie importa del viejo tool-registry de core (excluyendo tests)
rg "from ['\"].*core/tool-registry['\"]" apps/server/src/ --type ts --glob '!**/__tests__/**'
# Resultado esperado: 0 matches

# AC7: TypeScript compila sin errores
pnpm typecheck
# Resultado esperado: exit code 0
```

---

### Tarea 19.5 — Tres prompt builders

**Acción**: `@spaces/engine` `PromptBuilder` es canónico. Eliminar `ai/prompt-builder.ts`. `SessionPromptBuilder` (546 líneas en `core/session/prompt-builder.ts`) se descompone en `PromptSection[]` registradas en el engine.

**Archivos**: `ai/prompt-builder.ts` (borrar), `core/session/prompt-builder.ts` (descomponer en secciones), crear archivos de secciones

**Criterios de aceptación**:

```bash
# AC1: ai/prompt-builder.ts no existe
ls apps/server/src/ai/prompt-builder.ts 2>&1
# Resultado esperado: "No such file or directory"

# AC2: core/session/prompt-builder.ts NO exporta un singleton sessionPromptBuilder
rg "export const sessionPromptBuilder" apps/server/src/core/session/prompt-builder.ts
# Resultado esperado: 0 matches

# AC3: Solo existe UNA clase que implementa IPromptBuilder en @spaces/*
rg -l "implements IPromptBuilder" packages/ --type ts
# Resultado esperado: 1 archivo (packages/engine/src/prompt-builder.ts)

# AC4: Las secciones extraídas del viejo SessionPromptBuilder existen como PromptSection
rg "implements PromptSection" apps/server/src/core/prompts/ --type ts
# Resultado esperado: al menos 1 match

# AC5: Nadie importa del viejo prompt-builder de ai/ (excluyendo tests)
rg "from ['\"].*ai/prompt-builder['\"]" apps/server/src/ --type ts --glob '!**/__tests__/**'
# Resultado esperado: 0 matches

# AC6: TypeScript compila sin errores
pnpm typecheck
# Resultado esperado: exit code 0
```

---

### Tarea 19.6 — Dos permission engines

**Acción**: `@spaces/engine` `PermissionEngine` es canónico. Migrar reglas DENY/ASK del legacy (`core/sandbox/permission-engine.ts`, 238 líneas) como `Rule[]` inyectables en `@spaces/engine`. Eliminar el singleton `permissionEngine`.

**Archivos**: `core/sandbox/permission-engine.ts` (borrar), `packages/engine/src/permission-engine.ts` (extender con reglas legacy), `core/sandbox/subagent-permissions.ts` (migrar reglas)

**Criterios de aceptación**:

```bash
# AC1: El permission engine legacy no existe
ls apps/server/src/core/sandbox/permission-engine.ts 2>&1
# Resultado esperado: "No such file or directory"

# AC2: Nadie importa del viejo permission engine (excluyendo tests)
rg "from ['\"].*sandbox/permission-engine['\"]" apps/server/src/ --type ts --glob '!**/__tests__/**'
# Resultado esperado: 0 matches

# AC3: El singleton permissionEngine no existe en ningún export
rg "export const permissionEngine" apps/server/src/ --type ts
# Resultado esperado: 0 matches

# AC4: Las reglas DENY/ASK existen como Rule[] o constantes en @spaces/engine
rg -c "DENY_RULES\|ASK_RULES\|restrictedPaths\|restrictedCommands" packages/engine/src/ --type ts
# Resultado esperado: al menos 1

# AC5: Solo existe UNA clase que implementa IPermissionEngine
rg -l "implements IPermissionEngine" packages/ --type ts
# Resultado esperado: 1 archivo (packages/engine/src/permission-engine.ts)

# AC6: TypeScript compila sin errores
pnpm typecheck
# Resultado esperado: exit code 0
```

---

### Tarea 19.7 — Dos pipelines de sesiones

**Acción**: Unificar en `createSessionAgent()` de `context.ts`. Eliminar `bootstrapAgentSession()` y `createAgentSession()`.

**Archivos**: `context.ts` (unificar), `core/session/agent-runtime.ts` (quitar alias), factories legacy

**Criterios de aceptación**:

```bash
# AC1: bootstrapAgentSession no se exporta como función ni alias
rg "export.*bootstrapAgentSession" apps/server/src/ --type ts
# Resultado esperado: 0 matches

# AC2: createAgentSession no existe (era la factory de AgentSession)
rg "export.*createAgentSession" apps/server/src/ --type ts
# Resultado esperado: 0 matches

# AC3: Solo existe UNA factory de creación de sesiones exportada
rg "export.*createSessionAgent" apps/server/src/ --type ts
# Resultado esperado: al menos 1 match

# AC4: La factory usa createAgent de @spaces/engine
rg "createAgent" apps/server/src/context.ts
# Resultado esperado: al menos 1 match

# AC5: Ningún archivo llama a bootstrapAgentSession (excluyendo tests)
rg "bootstrapAgentSession\(" apps/server/src/ --type ts --glob '!**/__tests__/**'
# Resultado esperado: 0 matches

# AC6: TypeScript compila sin errores
pnpm typecheck
# Resultado esperado: exit code 0
```

---

### Tarea 19.8 — Dos WebSocket endpoints

**Acción**: Verificar que `/ws/v2` fue eliminado y solo existe `/ws` con el engine. Ya ejecutado en Plan 16. Confirmar.

**Archivos**: `index.ts`

**Criterios de aceptación**:

```bash
# AC1: No existe ruta /ws/v2 en index.ts
rg "/ws/v2" apps/server/src/index.ts
# Resultado esperado: 0 matches

# AC2: Solo existe una ruta WebSocket en index.ts
rg -c "upgradeWebSocket" apps/server/src/index.ts
# Resultado esperado: 1

# AC3: La ruta /ws usa registerEngineWsRoute (el handler del engine)
rg "registerEngineWsRoute" apps/server/src/index.ts
# Resultado esperado: al menos 1 match

# AC4: La carpeta ws/ legacy no existe (eliminada en Plan 18.5 Fase B1)
ls apps/server/src/ws/ 2>&1
# Resultado esperado: "No such file or directory"
```

---

### Tarea 19.9 — Engine ToolRegistry duplicado con Tools DefaultToolRegistry

**Acción**: Eliminar la clase `ToolRegistry` de `engine/src/tool-executor.ts:14-57`. El engine recibe `IToolRegistry` del `AppContext`, no crea el suyo.

**Archivos**: `engine/tool-executor.ts` (borrar clase `ToolRegistry`), `engine/factories/default.agent.ts` (usar `IToolRegistry` inyectado)

**Criterios de aceptación**:

```bash
# AC1: engine/tool-executor.ts NO define "class ToolRegistry"
rg "class ToolRegistry" packages/engine/src/tool-executor.ts
# Resultado esperado: 0 matches

# AC2: engine/tool-executor.ts importa IToolRegistry de @spaces/core
rg "import.*IToolRegistry" packages/engine/src/tool-executor.ts
# Resultado esperado: al menos 1 match

# AC3: La factory default.agent.ts recibe IToolRegistry, no hace "new ToolRegistry"
rg "new ToolRegistry\|new DefaultToolRegistry" packages/engine/src/factories/default.agent.ts
# Resultado esperado: 0 matches

# AC4: El barrel de engine NO re-exporta ToolRegistry
rg "ToolRegistry" packages/engine/src/index.ts
# Resultado esperado: 0 matches

# AC5: TypeScript compila sin errores
pnpm --filter @spaces/engine typecheck
# Resultado esperado: exit code 0
```

---

### Tarea 19.10 — `z.unknown()` en `message.schema.ts`

**Acción**: `message.schema.ts:8`: reemplazar `z.array(z.unknown())` por `z.array(ContentBlockSchema)` definiendo `ContentBlockSchema` correctamente basado en el tipo `ContentBlock` de `types.ts`.

**Archivos**: `core/schemas/message.schema.ts`, `core/src/types.ts`

**Criterios de aceptación**:

```bash
# AC1: No existe z.unknown() en message.schema.ts
rg "z\.unknown\(\)" packages/core/src/schemas/message.schema.ts
# Resultado esperado: 0 matches

# AC2: Existe ContentBlockSchema definido y exportado
rg "export const ContentBlockSchema" packages/core/src/schemas/
# Resultado esperado: al menos 1 match

# AC3: El array de content usa ContentBlockSchema
rg "ContentBlockSchema" packages/core/src/schemas/message.schema.ts
# Resultado esperado: al menos 1 match

# AC4: Cero "any" types en message.schema.ts
rg ": any\b\|as any" packages/core/src/schemas/message.schema.ts
# Resultado esperado: 0 matches

# AC5: TypeScript compila sin errores
pnpm --filter @spaces/core typecheck
# Resultado esperado: exit code 0
```

---

### Tarea 19.11 — Eliminar `as any` en engine/tools/sandbox

**Acción**: Extraer `zodToJsonSchema()` como utility en `@spaces/core`. Reemplazar hacks de `as any` en `engine/tool-executor.ts` (líneas 33, 40, 42), `tools/tool-registry.ts` (líneas 22, 29, 31). Reemplazar `as any` de Bun glob en `sandbox/local.sandbox.ts` (líneas 120-121) por type guard.

**Archivos**: `core/src/utils/zod-to-json-schema.ts` (nuevo), `engine/tool-executor.ts`, `tools/tool-registry.ts`, `sandbox/local.sandbox.ts`

**Criterios de aceptación**:

```bash
# AC1: Cero "as any" en engine/tool-executor.ts
rg "as any" packages/engine/src/tool-executor.ts
# Resultado esperado: 0 matches

# AC2: Cero "as any" en tools/tool-registry.ts
rg "as any" packages/tools/src/tool-registry.ts
# Resultado esperado: 0 matches

# AC3: Cero "as any" en sandbox/local.sandbox.ts
rg "as any" packages/sandbox/src/local.sandbox.ts
# Resultado esperado: 0 matches

# AC4: Existe zodToJsonSchema como utility exportada en @spaces/core
rg "export.*zodToJsonSchema" packages/core/src/ --type ts
# Resultado esperado: al menos 1 match

# AC5: engine y tools usan la nueva utility en lugar de as any
rg "zodToJsonSchema" packages/engine/src/ packages/tools/src/ --type ts
# Resultado esperado: al menos 2 matches

# AC6: TypeScript compila sin errores en los 3 paquetes
pnpm --filter @spaces/core typecheck && pnpm --filter @spaces/engine typecheck && pnpm --filter @spaces/tools typecheck && pnpm --filter @spaces/sandbox typecheck
# Resultado esperado: exit code 0
```

---

### Tarea 19.12 — Agregar `IProviderRegistry` a core

**Acción**: `@spaces/providers` tiene `ProviderRegistry` concreto sin interfaz. Crear `IProviderRegistry` en `core/ports/provider.port.ts`. Hacer que `ProviderRegistry` la implemente.

**Archivos**: `core/ports/provider.port.ts` (nuevo), `providers/provider-registry.ts` (actualizar), `core/src/index.ts` (agregar export)

**Criterios de aceptación**:

```bash
# AC1: El archivo de port existe
ls packages/core/src/ports/provider.port.ts 2>&1
# Resultado esperado: (existe, sin error)

# AC2: Exporta IProviderRegistry con métodos register, get, list
rg "export interface IProviderRegistry" packages/core/src/ports/provider.port.ts
# Resultado esperado: al menos 1 match

# AC3: ProviderRegistry de @spaces/providers implementa IProviderRegistry
rg "implements IProviderRegistry" packages/providers/src/provider-registry.ts
# Resultado esperado: al menos 1 match

# AC4: IProviderRegistry se re-exporta en el barrel de core
rg "IProviderRegistry" packages/core/src/index.ts
# Resultado esperado: al menos 1 match

# AC5: TypeScript compila sin errores
pnpm typecheck
# Resultado esperado: exit code 0
```

---

## Verificación Global

Ejecutar después de completar las 12 tareas:

```bash
# VG1: Cero imports de archivos eliminados (excluyendo tests)
for path in "core/event-bus" "core/stores/" "ai/session-persistence" "ai/prompt-builder" "core/tool-registry" "sandbox/permission-engine"; do
  count=$(rg -c "from ['\"].*$path" apps/server/src/ --type ts --glob '!**/__tests__/**' 2>/dev/null || echo 0)
  echo "$path: $count"
done
# Resultado esperado: 0 para todos

# VG2: Cero exports de singletons eliminados
for name in "sessionPromptBuilder" "bootstrapAgentSession" "createAgentSession" "permissionEngine" "TypedEventEmitter"; do
  rg "export.*$name" apps/server/src/ --type ts -q && echo "STILL EXPORTED: $name" || echo "CLEAN: $name"
done
# Resultado esperado: 5 "CLEAN"

# VG3: Una sola implementación por cada concepto
for concept in "IEventBus" "ISessionStore" "IToolRegistry" "IPromptBuilder" "IPermissionEngine" "IProviderRegistry"; do
  count=$(rg -l "implements $concept" packages/ apps/server/src/ --type ts 2>/dev/null | wc -l)
  echo "$concept: $count implementations"
done
# Resultado esperado: 1 para cada uno

# VG4: Cero "as any" en paquetes @spaces/*
rg -c "as any" packages/engine/src/ packages/tools/src/ packages/sandbox/src/ --type ts
# Resultado esperado: 0

# VG5: TypeScript compila sin errores en TODO el workspace
pnpm typecheck
# Resultado esperado: exit code 0

# VG6: Build exitoso en TODO el workspace
pnpm build
# Resultado esperado: exit code 0
```

---

## Estimación

| Tarea                           | Criterios        | Esfuerzo |
| ------------------------------- | ---------------- | -------- |
| 19.1 — Event buses              | 5                | 45 min   |
| 19.2 — ISessionStore interfaces | 5                | 30 min   |
| 19.3 — Session store impls      | 6                | 1h       |
| 19.4 — Tool registries          | 7                | 1h       |
| 19.5 — Prompt builders          | 6                | 1h       |
| 19.6 — Permission engines       | 6                | 1h       |
| 19.7 — Pipelines de sesiones    | 6                | 45 min   |
| 19.8 — WS endpoints             | 4                | 15 min   |
| 19.9 — Engine ToolRegistry      | 5                | 30 min   |
| 19.10 — `z.unknown()` fix       | 5                | 30 min   |
| 19.11 — `as any` removal        | 6                | 1h       |
| 19.12 — IProviderRegistry       | 5                | 30 min   |
| Verificación global             | 6                | 15 min   |
| **Total**                       | **72 criterios** | **~9h**  |

---

## Regla de Cierre

Una tarea **no está completa** hasta que **todos** sus criterios de aceptación devuelven el resultado esperado. Si un criterio falla, la tarea se reabre. No se aceptan workarounds. Los comandos de verificación son la única verdad.

---

_Plan reescrito aplicando `skills/criterios-de-aceptacion-verificables.md`. Versión anterior auditada en `plans/19-audit-criteria.md`._
