# Auditoría — Plan 19 vs Criterios de Aceptación Verificables

> Aplica la metodología de `skills/criterios-de-aceptacion-verificables.md` al Plan 19 de `plans/16-legacy-removal-plans.md`.

---

## Puntaje General: 3/12 tareas con criterios verificables

---

## Análisis por Tarea

### 19.1 — Dos event buses

**Sección de verificación actual:**

```bash
ls apps/server/src/core/event-bus.ts  # Debe fallar
```

**Problemas:**

| Issue                 | Detalle                                                                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ls` sin `2>&1`       | Si el archivo existe, `ls` imprime su nombre y retorna 0. Si no existe, imprime error en stderr y retorna ≠ 0. Pero sin capturar stderr, el comportamiento no es obvio en todos los shells |
| No verifica migración | Prueba que el archivo viejo no existe, pero **no prueba que los consumidores migraron**. El archivo pudo ser borrado dejando imports rotos                                                 |
| Un solo criterio      | Una tarea de esta complejidad (migrar consumidores + borrar) merece 3-4 criterios                                                                                                          |

**Criterios que debería tener:**

```bash
# AC1: El archivo viejo no existe
ls apps/server/src/core/event-bus.ts 2>&1
# Resultado esperado: "No such file or directory"

# AC2: Nadie importa del viejo event bus (salvo tests)
rg "from.*['\"].*core/event-bus['\"]" apps/server/src/ --type ts --glob '!**/__tests__/**'
# Resultado esperado: 0 matches

# AC3: Todos los ex-consumidores importan IEventBus de @spaces/core o EventBus de @spaces/engine
rg -l "TypedEventEmitter" apps/server/src/ --type ts --glob '!**/__tests__/**'
# Resultado esperado: 0 matches
```

---

### 19.2 — Dos ISessionStore interfaces

**Sección de verificación actual:**

```bash
rg "@deprecated" packages/shared/src/stores/
```

**Problemas:**

| Issue                            | Detalle                                                                                                                                                                            |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Demasiado genérico               | Busca `@deprecated` en cualquier archivo de `stores/`. Si `artifact-store.ts` tiene un `@deprecated` en un método random, el criterio pasa — pero `ISessionStore` puede no tenerlo |
| No verifica el contrato canónico | No prueba que `@spaces/core` sea la fuente de verdad. Solo prueba que algo en `shared` está deprecated                                                                             |
| Un solo criterio                 | Es una tarea de definición de arquitectura — merece verificación de que hay una sola fuente de verdad                                                                              |

**Criterios que debería tener:**

```bash
# AC1: El ISessionStore de shared tiene @deprecated en su JSDoc
rg -B2 "export interface ISessionStore" packages/shared/src/stores/session-store.ts | rg "@deprecated"
# Resultado esperado: al menos 1 match

# AC2: El ISessionStore canónico está en @spaces/core sin @deprecated
rg "export interface ISessionStore" packages/core/src/ports/session.port.ts
# Resultado esperado: 1 match

# AC3: shared ISessionStore NO se importa en @spaces/core (core no depende de shared)
rg "from ['\"].*shared.*session-store" packages/core/src/ --type ts
# Resultado esperado: 0 matches
```

---

### 19.3 — Cuatro session store impls

**Sección de verificación actual:**

```bash
ls apps/server/src/core/stores/  # Debe estar vacío o no existir
```

**Problemas:**

| Issue                                          | Detalle                                                                                                               |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| "Vacío o no existir" es ambiguo                | Son dos estados distintos. Si la carpeta existe con `.gitkeep`, `ls` retorna 0 y el criterio "pasa" aunque no debería |
| No verifica `ai/session-persistence.ts`        | La tarea dice "JsonlSessionStore se elimina con ai/session-persistence.ts" pero ningún criterio lo verifica           |
| No verifica migración de `ServerSpacesHost:18` | La tarea menciona migrar este consumidor pero no hay criterio                                                         |

**Criterios que debería tener:**

```bash
# AC1: La carpeta core/stores/ no existe
ls apps/server/src/core/stores/ 2>&1
# Resultado esperado: "No such file or directory"

# AC2: ai/session-persistence.ts no existe
ls apps/server/src/ai/session-persistence.ts 2>&1
# Resultado esperado: "No such file or directory"

# AC3: Nadie importa de core/stores/
rg "from ['\"].*core/stores/" apps/server/src/ --type ts --glob '!**/__tests__/**'
# Resultado esperado: 0 matches

# AC4: ServerSpacesHost importa de @spaces/storage
rg "from ['\"]@spaces/storage" apps/server/src/core/spaces-host.ts
# Resultado esperado: al menos 1 match

# AC5: Solo existen 2 implementaciones de ISessionStore (@spaces/storage)
rg -c "implements ISessionStore" packages/storage/src/ --type ts
# Resultado esperado: 2 (memory + filesystem)
```

---

### 19.4 — Cinco tool registries

**Sección de verificación actual:**

```bash
ls apps/server/src/core/tool-registry.ts  # Debe fallar
```

**Problemas:**

| Issue                                                           | Detalle                                                                                                                 |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Solo verifica 1 de 5                                            | La tarea habla de eliminar 3 tool registries legacy + 1 del engine + 1 de shared. Solo verifica `core/tool-registry.ts` |
| No verifica `@spaces/engine` ToolRegistry                       | La clase ToolRegistry dentro de `tool-executor.ts` debe ser eliminada — ningún criterio lo verifica                     |
| No verifica `shared/tools/tool-registry.ts`                     | Sin criterio                                                                                                            |
| No verifica que el engine recibe `IToolRegistry` del AppContext | Sin criterio                                                                                                            |

**Criterios que debería tener:**

```bash
# AC1: core/tool-registry.ts no existe
ls apps/server/src/core/tool-registry.ts 2>&1
# Resultado esperado: "No such file or directory"

# AC2: @spaces/engine no define su propia clase ToolRegistry
rg "export class ToolRegistry" packages/engine/src/tool-executor.ts
# Resultado esperado: 0 matches

# AC3: @spaces/engine importa IToolRegistry de @spaces/core (no define el suyo)
rg "IToolRegistry" packages/engine/src/ --type ts
# Resultado esperado: al menos 1 match (importado, no definido)

# AC4: Solo existe UNA clase que implementa IToolRegistry en @spaces/*
rg -l "implements IToolRegistry" packages/ --type ts
# Resultado esperado: exactamente 1 archivo (@spaces/tools/src/tool-registry.ts)

# AC5: Nadie importa del viejo tool-registry de core
rg "from ['\"].*core/tool-registry['\"]" apps/server/src/ --type ts --glob '!**/__tests__/**'
# Resultado esperado: 0 matches

# AC6: Nadie importa de shared/tools/tool-registry en el server
rg "from ['\"].*shared.*tool-registry" apps/server/src/ --type ts --glob '!**/__tests__/**'
# Resultado esperado: 0 matches
```

---

### 19.5 — Tres prompt builders

**Sección de verificación actual:**

```bash
ls apps/server/src/ai/prompt-builder.ts  # Debe fallar
```

**Problemas:**

| Issue                                         | Detalle                                                                                   |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Solo verifica 1 de 2 eliminaciones            | `SessionPromptBuilder` (546 líneas) también debe eliminarse — sin criterio                |
| No verifica que se crearon las PromptSections | La tarea dice "se descompone en PromptSection[]" — sin criterio que verifique que existen |
| No verifica que el canónico es el del engine  | Sin criterio                                                                              |

**Criterios que debería tener:**

```bash
# AC1: ai/prompt-builder.ts no existe
ls apps/server/src/ai/prompt-builder.ts 2>&1
# Resultado esperado: "No such file or directory"

# AC2: core/session/prompt-builder.ts no exporta un singleton sessionPromptBuilder
rg "export const sessionPromptBuilder" apps/server/src/core/session/prompt-builder.ts
# Resultado esperado: 0 matches

# AC3: Solo existe UNA clase que implementa IPromptBuilder en @spaces/*
rg -l "implements IPromptBuilder" packages/ --type ts
# Resultado esperado: exactamente 1 archivo (@spaces/engine)

# AC4: Nadie importa del viejo prompt-builder de ai/
rg "from ['\"].*ai/prompt-builder['\"]" apps/server/src/ --type ts --glob '!**/__tests__/**'
# Resultado esperado: 0 matches

# AC5: Las secciones extraídas de SessionPromptBuilder existen como PromptSection
rg "implements PromptSection" apps/server/src/core/prompts/ --type ts
# Resultado esperado: al menos 1 match (o en @spaces/engine si se movieron ahí)
```

---

### 19.6 — Dos permission engines

**Sección de verificación actual:** (ninguna — sin criterios)

**Problema**: Es una de las duplicaciones más críticas. El legacy `core/sandbox/permission-engine.ts` (238 líneas) es un singleton con reglas DENY/ASK que no implementa `IPermissionEngine`. Sin criterios, es imposible saber si se migró o no.

**Criterios que debería tener:**

```bash
# AC1: El permission engine legacy no existe
ls apps/server/src/core/sandbox/permission-engine.ts 2>&1
# Resultado esperado: "No such file or directory"

# AC2: Nadie importa del viejo permission engine
rg "from ['\"].*sandbox/permission-engine['\"]" apps/server/src/ --type ts --glob '!**/__tests__/**'
# Resultado esperado: 0 matches

# AC3: Las reglas DENY/ASK existen como Rule[] en @spaces/engine
rg "DENY_RULES\|ASK_RULES" packages/engine/src/ --type ts
# Resultado esperado: al menos 1 match

# AC4: Solo existe UNA clase que implementa IPermissionEngine
rg -l "implements IPermissionEngine" packages/ --type ts
# Resultado esperado: exactamente 1 archivo (@spaces/engine)

# AC5: El singleton permissionEngine no existe en ningún export
rg "export const permissionEngine" apps/server/src/ --type ts
# Resultado esperado: 0 matches
```

---

### 19.7 — Dos pipelines de sesiones

**Sección de verificación actual:** (ninguna — sin criterios)

**Problema**: La tarea dice eliminar `bootstrapAgentSession()` y `createAgentSession()`, y unificar en `createSessionAgent()`. Sin criterios, cualquiera de las funciones viejas puede sobrevivir.

**Criterios que debería tener:**

```bash
# AC1: bootstrapAgentSession no se exporta como función
rg "export.*bootstrapAgentSession" apps/server/src/ --type ts
# Resultado esperado: 0 matches

# AC2: createAgentSession no existe (era la factory de AgentSession)
rg "export.*createAgentSession" apps/server/src/ --type ts
# Resultado esperado: 0 matches

# AC3: Solo existe UNA factory de creación de sesiones
rg "export.*createSessionAgent" apps/server/src/ --type ts
# Resultado esperado: exactamente 1 match (en context.ts)

# AC4: La factory usa createAgent de @spaces/engine
rg "createAgent" apps/server/src/context.ts
# Resultado esperado: al menos 1 match
```

---

### 19.8 — Dos WebSocket endpoints

**Sección de verificación actual:** (ninguna — dice "Ya hecho en Plan 16.3. Verificar")

**Problema**: "Verificar" no es un criterio. Es una instrucción narrativa. Si el plan 16.3 ya lo hizo, el criterio debería ser un comando que confirma que `/ws/v2` no existe y que solo hay un WS endpoint.

**Criterios que debería tener:**

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
```

---

### 19.9 — Engine ToolRegistry duplicado con Tools DefaultToolRegistry

**Sección de verificación actual:** (ninguna — sin criterios)

**Problema**: La tarea es quirúrgica — eliminar la clase `ToolRegistry` de `engine/tool-executor.ts:14-57` y hacer que el engine reciba `IToolRegistry` del AppContext. Sin criterios, la clase duplicada puede sobrevivir.

**Criterios que debería tener:**

```bash
# AC1: engine/tool-executor.ts NO define "class ToolRegistry"
rg "class ToolRegistry" packages/engine/src/tool-executor.ts
# Resultado esperado: 0 matches

# AC2: engine/tool-executor.ts importa IToolRegistry de @spaces/core
rg "IToolRegistry" packages/engine/src/tool-executor.ts
# Resultado esperado: al menos 1 match

# AC3: La factory default.agent.ts recibe IToolRegistry, no crea el suyo
rg "new ToolRegistry" packages/engine/src/factories/default.agent.ts
# Resultado esperado: 0 matches

# AC4: El engine no exporta "ToolRegistry" en su barrel
rg "ToolRegistry" packages/engine/src/index.ts
# Resultado esperado: 0 matches
```

---

### 19.10 — `z.unknown()` en core schemas

**Sección de verificación actual:** (ninguna — sin criterios)

**Problema**: `message.schema.ts:8` tiene `z.array(z.unknown())` que es semánticamente `any[]`. La tarea pide reemplazarlo por `ContentBlockSchema`. Sin criterios, el `z.unknown()` sobrevive.

**Criterios que debería tener:**

```bash
# AC1: No existe z.unknown() en message.schema.ts
rg "z\.unknown\(\)" packages/core/src/schemas/message.schema.ts
# Resultado esperado: 0 matches

# AC2: Existe ContentBlockSchema definido
rg "ContentBlockSchema" packages/core/src/schemas/
# Resultado esperado: al menos 1 match

# AC3: El array de content usa ContentBlockSchema
rg "z\.array\(ContentBlockSchema\)" packages/core/src/schemas/message.schema.ts
# Resultado esperado: al menos 1 match
```

---

### 19.11 — Eliminar `as any` en engine/tools/sandbox

**Sección de verificación actual:** (ninguna — sin criterios)

**Problema**: La tarea abarca 4 archivos con hacks `as any`. La auditoría post-migración encontró 5 ubicaciones específicas. Sin criterios por archivo, el `as any` sobrevive.

**Criterios que debería tener:**

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

# AC4: Existe zodToJsonSchema() como utility en @spaces/core
rg "zodToJsonSchema\|toJsonSchema" packages/core/src/ --type ts
# Resultado esperado: al menos 1 match

# AC5: Los reemplazos de as any usan la nueva utility
rg "zodToJsonSchema\|toJsonSchema" packages/engine/src/ packages/tools/src/ --type ts
# Resultado esperado: al menos 2 matches
```

---

### 19.12 — Agregar `IProviderRegistry` a core

**Sección de verificación actual:** (ninguna — sin criterios)

**Problema**: La tarea es crear un archivo nuevo. Sin criterios, no se puede verificar que existe, que exporta la interfaz correcta, y que `ProviderRegistry` de `@spaces/providers` la implementa.

**Criterios que debería tener:**

```bash
# AC1: El archivo existe
ls packages/core/src/ports/provider.port.ts 2>&1
# Resultado esperado: (existe, no error)

# AC2: Exporta IProviderRegistry
rg "export interface IProviderRegistry" packages/core/src/ports/provider.port.ts
# Resultado esperado: al menos 1 match

# AC3: ProviderRegistry de @spaces/providers implementa IProviderRegistry
rg "implements IProviderRegistry" packages/providers/src/provider-registry.ts
# Resultado esperado: al menos 1 match

# AC4: IProviderRegistry se re-exporta en el barrel de core
rg "IProviderRegistry" packages/core/src/index.ts
# Resultado esperado: al menos 1 match
```

---

## Resumen

| Tarea                           | Criterios actuales             | ¿Verificables? | Calificación |
| ------------------------------- | ------------------------------ | -------------- | ------------ |
| 19.1 — Event buses              | 1 (`ls`, débil)                | Parcial        | **Rojo**     |
| 19.2 — ISessionStore interfaces | 1 (`rg @deprecated`, genérico) | Parcial        | **Rojo**     |
| 19.3 — Session store impls      | 1 (`ls`, ambiguo)              | Parcial        | **Rojo**     |
| 19.4 — Tool registries          | 1 (`ls`, solo 1 de 5)          | No             | **Rojo**     |
| 19.5 — Prompt builders          | 1 (`ls`, solo 1 de 2)          | No             | **Rojo**     |
| 19.6 — Permission engines       | **0**                          | No             | **Negro**    |
| 19.7 — Pipelines de sesiones    | **0**                          | No             | **Negro**    |
| 19.8 — WS endpoints             | **0** (narrativo)              | No             | **Negro**    |
| 19.9 — Engine ToolRegistry      | **0**                          | No             | **Negro**    |
| 19.10 — `z.unknown()` fix       | **0**                          | No             | **Negro**    |
| 19.11 — `as any` removal        | **0**                          | No             | **Negro**    |
| 19.12 — IProviderRegistry       | **0**                          | No             | **Negro**    |

---

## Veredicto

**Plan 19 no es ejecutable con garantías.** 9 de 12 tareas no tienen criterios de aceptación. Las 3 que tienen criterios usan verificaciones parciales que no cubren todos los aspectos de la tarea.

Si este plan se ejecutara tal cual, el resultado sería idéntico al de los Planes 17-18: tareas marcadas como "completadas" con workarounds invisibles (archivos no borrados, imports no migrados, clases duplicadas sobreviviendo).

**Recomendación**: reescribir Plan 19 con los 44 criterios de aceptación detallados arriba (3-6 por tarea) antes de ejecutarlo.

---

## Anti-Patrones Detectados en el Plan 19

| Anti-patrón de la skill                                          | Dónde aparece en Plan 19                                                                               |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| "Verificar manualmente"                                          | Tarea 19.8: "Verificar" sin comando                                                                    |
| "Debe funcionar correctamente"                                   | Sección de verificación: `pnpm typecheck` + `pnpm build` cubre compilación pero no lógica de migración |
| Criterio genérico que pasa con falsos positivos                  | 19.2: `rg "@deprecated"` en directorio entero, no en la interfaz específica                            |
| "Debe estar vacío o no existir" — dos estados, uno es incorrecto | 19.3: carpeta `core/stores/` podría tener `.gitkeep` y pasar                                           |

---

_Auditoría basada en `skills/criterios-de-aceptacion-verificables.md`. Los 44 criterios propuestos arriba siguen el formato AC1..ACn con comandos exactos y resultados esperados._
