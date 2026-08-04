# Plan 23 — Migrar Lógica del Server a Paquetes

> El server tiene ~25K líneas de TypeScript. ~15K (60%) pertenecen a los paquetes `@spaces/*`. Este plan las mueve, fase por fase, sin romper nada.

---

## Contexto

La auditoría post-Plan 22 encontró que `apps/server/src/` retiene implementaciones que deberían estar en los paquetes. `packages/engine/` es casi vacío (el `PromptBuilder` tiene 24 líneas) mientras la lógica real de prompts (1,200+ líneas) está en el server. `packages/providers/` tiene 3 archivos mientras el model registry real (455 líneas) y 12 archivos de registro de providers viven en el server. `ai/tools/` duplica directamente `packages/tools/` con patrones legacy.

**Rol**: consolidación arquitectónica definitiva. Después de este plan, `apps/server/` es una capa Hono thin (~9K líneas de rutas, DI, auth) y toda la lógica de negocio vive en paquetes tipados, testeables y publicables.

---

## Principios

1. **Una fase = un paquete**. Cada fase mueve archivos a un solo paquete. Sin cross-package moves en una misma fase.
2. **Cero regresiones**. `pnpm typecheck` y `pnpm build` pasan al final de cada fase.
3. **Mover, no reescribir**. Adaptar imports, no reescribir lógica. Las refactorizaciones profundas van en planes separados.
4. **Eliminar duplicación inmediatamente**. Si dos archivos hacen lo mismo, se unifican en el paquete. El server importa del paquete.

---

## Fases

### Fase 1: Core Ports — Interfaces al lugar correcto

> Mover las 4 interfaces sueltas de `core/ports/` a `packages/core/src/ports/`. El paquete core ya tiene `ports/` con 10 archivos. Completarlo.

| Archivo origen | Archivo destino |
|---|---|
| `core/ports/spaces-host.port.ts` | `packages/core/src/ports/spaces-host.port.ts` |
| `core/ports/workspace-config.port.ts` | `packages/core/src/ports/workspace-config.port.ts` |
| `core/ports/core-services.port.ts` | `packages/core/src/ports/core-services.port.ts` |
| `core/ports/model-resolver.ts` | `packages/core/src/ports/model-resolver.port.ts` |

**Migrar imports en server**: reemplazar `from "../../core/ports/*"` por `from "@spaces/core"`.

**Si la interfaz ya existe en core** (ej: `IMemoryProvider` en `memory.port.ts` vs `core/memory/types.ts`), consolidar en el archivo de core y eliminar la copia del server.

**Criterios de aceptación**:
```bash
# AC1: Los 4 archivos existen en packages/core/src/ports/
ls packages/core/src/ports/spaces-host.port.ts packages/core/src/ports/workspace-config.port.ts packages/core/src/ports/core-services.port.ts packages/core/src/ports/model-resolver.port.ts

# AC2: Los 4 archivos NO existen en apps/server/src/core/ports/
ls apps/server/src/core/ports/spaces-host.port.ts 2>&1 | rg "No such file"
# (x4)

# AC3: Cero imports del server a core/ports/ (usan @spaces/core)
rg "from ['\"].*core/ports/" apps/server/src/ --type ts --glob '!**/__tests__/**'

# AC4: Re-exportados en barrel de core
rg "spaces-host\|workspace-config\|core-services\|model-resolver" packages/core/src/index.ts

# AC5: typecheck + build
pnpm typecheck && pnpm build
```

---

### Fase 2: Tools — Eliminar duplicación y mover herramientas

> El objetivo es que TODAS las tools vivan en `packages/tools/`. Hoy hay 3 ubicaciones: `ai/tools/` (legacy), `core/tools/` (activo), `packages/tools/` (nuevo ITool). El server solo importa tools del paquete.

#### 2A: Unificar `ai/tools/` → `packages/tools/`

`ai/tools/` tiene 8 archivos que duplican `packages/tools/`. Cada tool del server usa un patrón legacy (`createXToolDefinition()`) sin Zod schema. Las tools del paquete implementan `ITool` con Zod.

| Server (`ai/tools/`) | Paquete (`packages/tools/`) | Acción |
|---|---|---|
| `read-tool.ts` (96L) | `read.tool.ts` (75L) | Eliminar server, usar paquete |
| `write-tool.ts` (53L) | `write.tool.ts` | Eliminar server, usar paquete |
| `edit-tool.ts` (99L) | `edit.tool.ts` | Eliminar server, usar paquete |
| `edit-diff.ts` (506L) | `edit-diff.ts` | Consolidar en paquete (server versión más completa) |
| `grep-tool.ts` (275L) | `grep.tool.ts` | Eliminar server, usar paquete |
| `find-tool.ts` (220L) | `glob.tool.ts` | Eliminar server, adaptar a glob.tool |
| `ls-tool.ts` (93L) | (no existe) | Mover a `packages/tools/src/ls.tool.ts` |
| `path-safety.ts` (38L) | `path-safety.ts` | Consolidar en paquete |

**Migrar `SessionToolFactory`** (`core/session/tool-factory.ts`, 198L): hoy importa de `ai/tools/` y wrappea con `legacyToolToBaseTool()`. Debe importar `ITool` directamente del paquete.

**Migrar `ai/bash-tool.ts`** (386L): el server tiene una implementación mucho más completa que `packages/tools/src/bash.tool.ts` (28L). Consolidar features del server en el paquete (spawn hooks, audit, filters, output limits).

#### 2B: Mover `core/tools/` → `packages/tools/`

| Archivo | Líneas | Nota |
|---|---|---|
| `factory-tool.ts` | 909 | Crear `packages/tools/src/factory.tool.ts` |
| `manage-delegations-tool.ts` | 755 | Crear `packages/tools/src/manage-delegations.tool.ts` |
| `decompose-tool.ts` | 217 | Mover |
| `ui-tools.ts` | 345 | Mover |
| `update-task-tool.ts` | 205 | Mover |
| `preview-tools.ts` | 5 | Mover |
| `task-state-manager.ts` | 120 | Mover |
| `factory-contracts.ts` | 375 | Mover como types/schemas |
| `web-fetch/` (6 files) | ~606 | Consolidar con `webfetch.tool.ts` existente |

#### 2C: Mover `core/custom-tools/` → `packages/tools/`

| Archivo | Líneas |
|---|---|
| `manage-custom-tools-tool.ts` | 235 |
| `runtime.ts` | 170 |
| `schemas.ts` | 90 |
| `storage.ts` | 145 |
| `types.ts` | ~50 |
| `index.ts` | ~20 |

**Criterios de aceptación**:
```bash
# AC1: ai/tools/ no existe
ls apps/server/src/ai/tools/ 2>&1 | rg "No such file"

# AC2: core/tools/ no existe
ls apps/server/src/core/tools/ 2>&1 | rg "No such file"

# AC3: core/custom-tools/ no existe
ls apps/server/src/core/custom-tools/ 2>&1 | rg "No such file"

# AC4: ai/bash-tool.ts no existe
ls apps/server/src/ai/bash-tool.ts 2>&1 | rg "No such file"

# AC5: Cero imports del server a archivos movidos
for path in "ai/tools/" "core/tools/" "core/custom-tools/" "ai/bash-tool"; do
  count=$(rg -c "from ['\"].*$path" apps/server/src/ --type ts --glob '!**/__tests__/**' 2>/dev/null || echo 0)
  echo "$path: $count"
done
# Esperado: 0 para todos

# AC6: tools del paquete cubren todas las tools que el server necesita
# (session-tool-factory importa solo de @spaces/tools)
rg "from ['\"].*ai/tools\|from ['\"].*core/tools" apps/server/src/core/session/tool-factory.ts
# Esperado: 0 matches

# AC7: typecheck + build
pnpm typecheck && pnpm build
```

---

### Fase 3: Providers — Model Registry y Catálogos

> Mover toda la data de proveedores y modelos a `packages/providers/`.

| Origen | Destino |
|---|---|
| `ai/model-registry.ts` (455L) | `packages/providers/src/model-registry.ts` |
| `ai/auth-storage.ts` (120L) | `packages/providers/src/auth-storage.ts` |
| `config/image-models.ts` (550L) | `packages/providers/src/image-models.ts` |
| `core/providers/` (12 files, ~476L) | `packages/providers/src/adapters/` |
| `core/providers/model-enrichment-service.ts` | `packages/providers/src/model-enrichment.ts` |
| `core/providers/provider-persistence.ts` | `packages/providers/src/persistence.ts` |
| `core/circuit-breaker.ts` (99L) | `packages/providers/src/circuit-breaker.ts` |

**Criterios de aceptación**:
```bash
# AC1: Archivos movidos no existen en server
for f in "ai/model-registry.ts" "ai/auth-storage.ts" "config/image-models.ts" "core/circuit-breaker.ts"; do
  ls "apps/server/src/$f" 2>&1 | rg "No such file"
done

# AC2: core/providers/ no existe
ls apps/server/src/core/providers/ 2>&1 | rg "No such file"

# AC3: context.ts importa model-registry de @spaces/providers
rg "@spaces/providers" apps/server/src/context.ts

# AC4: typecheck + build
pnpm typecheck && pnpm build
```

---

### Fase 4: Engine — Prompt, Aprobaciones, Multi-Agente

> Expandir `packages/engine/` con la lógica real que hoy está en el server.

#### 4A: Prompt Subsystem

| Origen | Destino |
|---|---|
| `core/session/prompt-builder.ts` (546L) | `packages/engine/src/prompt/session-prompt-builder.ts` |
| `core/prompts/composer.ts` (162L) | `packages/engine/src/prompt/composer.ts` |
| `core/prompts/registry.ts` (76L) | `packages/engine/src/prompt/fragment-registry.ts` |
| `core/prompts/project-context.ts` | `packages/engine/src/prompt/project-context.ts` |
| `core/prompts/prompt-assembly.ts` | `packages/engine/src/prompt/assembly.ts` |
| `core/prompts/system-instructions.ts` | `packages/engine/src/prompt/system-instructions.ts` |
| `core/prompts/fragments/` (8 files) | `packages/engine/src/prompt/fragments/` |
| `core/prompts/sections/` (1 file) | `packages/engine/src/prompt/sections/` |

#### 4B: Approvals

| Origen | Destino |
|---|---|
| `core/approvals/approval-manager.ts` | `packages/engine/src/approvals/approval-manager.ts` |
| `core/ui-approval-registry.ts` | `packages/engine/src/approvals/ui-approval-registry.ts` |

#### 4C: Utilities

| Origen | Destino |
|---|---|
| `core/agent-utils.ts` | `packages/engine/src/agent-utils.ts` |
| `ai/compaction-manager.ts` | `packages/engine/src/compaction-manager.ts` |
| `ai/context-estimator.ts` | `packages/engine/src/context-estimator.ts` |
| `ai/messages.ts` | `packages/engine/src/messages.ts` |
| `ai/resource-loader.ts` | `packages/engine/src/resource-loader.ts` |
| `ai/skill-loader.ts` | `packages/engine/src/skill-loader.ts` |
| `ai/load-skills.ts` | `packages/engine/src/load-skills.ts` |
| `core/multi-agent/` (4 files) | `packages/engine/src/multi-agent/` |
| `core/observability/observability-service.ts` | `packages/engine/src/observability.ts` |
| `core/session/tool-activation-engine.ts` | `packages/engine/src/tool-activation.ts` |
| `core/session/tool-groups.ts` | `packages/engine/src/tool-groups.ts` |
| `core/session/session-depth.ts` | `packages/engine/src/session-depth.ts` |

**Criterios de aceptación**:
```bash
# AC1: Directorios origen vacíos o eliminados
for dir in "core/prompts/" "core/approvals/" "core/multi-agent/" "core/observability/"; do
  ls "apps/server/src/$dir" 2>&1 | rg "No such file"
done

# AC2: Archivos individuales movidos no existen
for f in "core/ui-approval-registry.ts" "core/agent-utils.ts" "ai/compaction-manager.ts" "ai/context-estimator.ts" "ai/messages.ts" "ai/resource-loader.ts" "ai/skill-loader.ts" "ai/load-skills.ts"; do
  ls "apps/server/src/$f" 2>&1 | rg "No such file"
done

# AC3: ai/ está vacío o solo tiene utils.ts + restricted-paths.ts
ls apps/server/src/ai/ 2>&1

# AC4: engine barrel exporta los nuevos módulos
rg "prompt\|approvals\|multi-agent\|compaction\|observability" packages/engine/src/index.ts

# AC5: typecheck + build
pnpm typecheck && pnpm build
```

---

### Fase 5: Memory + Storage

> Mover implementaciones de memoria y artifact stores a `packages/storage/`.

#### 5A: Memory Providers

| Origen | Destino |
|---|---|
| `core/memory/local-provider.ts` | `packages/storage/src/memory-local.provider.ts` |
| `core/memory/null-provider.ts` | `packages/storage/src/memory-null.provider.ts` |
| `core/memory/registry.ts` | `packages/storage/src/memory-registry.ts` |
| `core/memory/memory-tools.ts` | `packages/storage/src/memory-tools.ts` |
| `memory/engram-memory-provider.ts` | `packages/storage/src/memory-engram.provider.ts` |

**Consolidar `core/memory/types.ts`** con `packages/core/src/ports/memory.port.ts`. El `IMemoryProvider` canónico debe estar en core. Eliminar la copia del server.

#### 5B: Artifact Stores

| Origen | Destino |
|---|---|
| `core/stores/file-artifact-store.ts` | `packages/storage/src/file-artifact.store.ts` |
| `core/stores/memory-artifact-store.ts` | `packages/storage/src/memory-artifact.store.ts` |

**Criterios de aceptación**:
```bash
# AC1: Directorios movidos no existen en server
for dir in "core/memory/" "core/stores/" "memory/"; do
  ls "apps/server/src/$dir" 2>&1 | rg "No such file"
done

# AC2: Solo existe UN IMemoryProvider (en @spaces/core)
rg "export interface.*Memory" packages/core/src/ports/memory.port.ts

# AC3: implementaciones en @spaces/storage referencian la interfaz de core
rg "IMemoryProvider" packages/storage/src/ --type ts

# AC4: typecheck + build
pnpm typecheck && pnpm build
```

---

### Fase 6: Sandbox — Permisos

> Mover reglas de permiso a `packages/sandbox/`.

| Origen | Destino |
|---|---|
| `core/sandbox/subagent-permissions.ts` | `packages/sandbox/src/subagent-permissions.ts` |
| `core/sandbox/user-permission-store.ts` | `packages/sandbox/src/user-permission-store.ts` |
| `ai/restricted-paths.ts` | Consolidar con `packages/sandbox/src/restricted-paths.ts` |

**Delete `core/sandbox/` directory** si queda vacío.

**Criterios de aceptación**:
```bash
# AC1: core/sandbox/ no existe
ls apps/server/src/core/sandbox/ 2>&1 | rg "No such file"

# AC2: Nadie importa restricted-paths de ai/
rg "from ['\"].*ai/restricted-paths" apps/server/src/ --type ts --glob '!**/__tests__/**'

# AC3: typecheck + build
pnpm typecheck && pnpm build
```

---

### Fase 7: Paquetes Nuevos — Teams y Schedules

#### 7A: `packages/teams/`

Crear el paquete `@spaces/teams` con:

| Origen | Destino |
|---|---|
| `teams/team-store.ts` | `packages/teams/src/team-store.ts` |
| `teams/team-orchestrator.ts` | `packages/teams/src/team-orchestrator.ts` |
| `teams/team-agent.factory.ts` | `packages/teams/src/team-agent.factory.ts` |
| `teams/team-context.ts` | `packages/teams/src/team-context.ts` |
| `teams/team-prompt-runner.ts` | `packages/teams/src/team-prompt-runner.ts` |
| `teams/orchestration/orchestration-runner.ts` | `packages/teams/src/orchestration-runner.ts` |

#### 7B: `packages/schedules/`

Crear el paquete `@spaces/schedules` con:

| Origen | Destino |
|---|---|
| `core/schedules/schedule-service.ts` | `packages/schedules/src/schedule-service.ts` |
| `core/schedules/schedule-runner.ts` | `packages/schedules/src/schedule-runner.ts` |
| `core/schedules/db.ts` | `packages/schedules/src/db.ts` |
| `schedules/schedule.service.ts` (duplicado) | Eliminar, consolidar |

#### 7C: `packages/auth/` (opcional)

Si `auth/` es sustancial, podría ser su propio paquete. Para este plan, se queda en server porque es integración con BetterAuth y Hono middleware.

**Criterios de aceptación**:
```bash
# AC1: packages/teams/package.json existe con name: @spaces/teams
rg '"name":\s*"@spaces/teams"' packages/teams/package.json

# AC2: packages/schedules/package.json existe con name: @spaces/schedules
rg '"name":\s*"@spaces/schedules"' packages/schedules/package.json

# AC3: teams/ y schedules/ no existen en server
ls apps/server/src/teams/ 2>&1 | rg "No such file"
ls apps/server/src/core/schedules/ 2>&1 | rg "No such file"
ls apps/server/src/schedules/ 2>&1 | rg "No such file"

# AC4: context.ts importa de @spaces/teams y @spaces/schedules
rg "@spaces/teams\|@spaces/schedules" apps/server/src/context.ts

# AC5: typecheck + build
pnpm typecheck && pnpm build
```

---

### Fase 8: SDK — Consolidar en `packages/spaces-sdk/`

> El server tiene `sdk/` con `SpacesAgent`, `SpacesRunner`, etc. `packages/spaces-sdk/` ya existe pero es thin. Consolidar.

| Origen | Destino |
|---|---|
| `sdk/spaces-agent.ts` | `packages/spaces-sdk/src/spaces-agent.ts` |
| `sdk/spaces-runner.ts` | `packages/spaces-sdk/src/spaces-runner.ts` |
| `sdk/types.ts` | `packages/spaces-sdk/src/types.ts` |
| `sdk/tools/index.ts` | Consolidar con `packages/spaces-sdk/src/index.ts` |

**Criterios de aceptación**:
```bash
# AC1: sdk/ no existe en server
ls apps/server/src/sdk/ 2>&1 | rg "No such file"

# AC2: spaces-sdk build funciona
pnpm --filter spaces-sdk build

# AC3: typecheck + build global
pnpm typecheck && pnpm build
```

---

### Fase 9: Thin Server Cleanup

> Después de mover todo, el server debería ser solo: rutas Hono, DI container, auth, middleware HTTP, y config. Limpiar lo que quede.

#### 9A: Eliminar archivos residuales

```bash
# Lo que DEBE QUEDAR en apps/server/src/:
#   index.ts              — entry point
#   context.ts            — DI container (mucho más chico ahora, importa de paquetes)
#   config/               — app config, engine config
#   auth/                 — BetterAuth
#   routes/               — Hono route handlers
#   middleware/auth.ts     — Hono auth middleware wrapper
#   core/middleware/       — Hono middleware (error-handler, rate-limiter, etc.)
#   core/security/cors.ts  — CORS
#   core/cache-headers.ts  — HTTP cache
#   core/spaces-host.ts    — ServerSpacesHost (usa paquetes, no implementa)
#   core/config/           — cascade-config-loader, entity-config (puede moverse después)
#   core/session/          — session orchestration (create-user-session, mcp-attach, hooks, etc.)
#   core/scope/            — scope-config-manager
#   lib/                   — event-broker, auth-helpers, env-crypto
#   approvals/             — ws-approval-channel
#   agents/                — agent-registry, create-agent-server
```

#### 9B: Reducir context.ts

`context.ts` hoy instancia ~30 servicios. Después de las fases 1-8, muchos serán imports de paquetes. El archivo debería bajar de 199 a ~100 líneas.

#### 9C: Verificar que `ai/` esté vacío o eliminado

```bash
ls apps/server/src/ai/ 2>&1
# Esperado: "No such file or directory" o solo utils.ts
```

**Criterios de aceptación**:
```bash
# AC1: context.ts < 120 líneas
wc -l apps/server/src/context.ts

# AC2: SOLO una implementación por cada concepto
for concept in "IEventBus" "ISessionStore" "IToolRegistry" "IPromptBuilder" "IPermissionEngine" "IProviderRegistry" "IMemoryProvider" "ISandbox"; do
  count=$(rg -l "implements $concept" packages/ --type ts 2>/dev/null | wc -l)
  echo "$concept: $count implementations"
done
# Esperado: 1 para cada uno

# AC3: Cero duplicación de tools (solo packages/tools/ tiene ITool)
rg -l "implements ITool" apps/server/src/ --type ts
# Esperado: 0 matches

# AC4: Cero "as any" en packages/
for pkg in "core" "engine" "tools" "providers" "storage" "sandbox" "teams" "schedules"; do
  count=$(rg -c "as any" "packages/$pkg/src/" --type ts 2>/dev/null || echo 0)
  echo "@spaces/$pkg as any: $count"
done

# AC5: Ningún archivo en packages/ > 300 líneas (salvo excepciones justificadas)
find packages/ -name "*.ts" ! -path "*/node_modules/*" -exec wc -l {} \; | sort -rn | awk '$1 > 300 {print $2 ": " $1 " lines"}'

# AC6: typecheck + build + lint global
pnpm typecheck && pnpm build && pnpm lint
```

---

## Verificación Global Final

```bash
# VG1: Workspace compila limpio
pnpm typecheck && pnpm build

# VG2: Sin rastros de la arquitectura vieja
for pattern in "AgentSession" "ai/vendor" "ai/tools" "core/tools" "core/providers" "core/memory" "core/prompts" "core/approvals" "core/multi-agent" "core/observability" "core/stores" "core/custom-tools" "core/sandbox"; do
  count=$(rg -c "\\b$pattern\\b" apps/server/src/ --type ts --glob '!**/__tests__/**' 2>/dev/null || echo 0)
  echo "$pattern: $count"
done
# Esperado: 0 para todos

# VG3: Server importa de paquetes, no al revés
rg "from ['\"].*apps/server" packages/ --type ts
# Esperado: 0 matches

# VG4: Paquetes no se importan entre sí (salvo de core)
for pkg in "engine" "tools" "providers" "storage" "sandbox" "teams" "schedules"; do
  for other in "engine" "tools" "providers" "storage" "sandbox" "teams" "schedules"; do
    if [ "$pkg" != "$other" ]; then
      count=$(rg -c "from ['\"]@spaces/$other" "packages/$pkg/src/" --type ts 2>/dev/null || echo 0)
      if [ "$count" != "0" ]; then
        echo "VIOLATION: @spaces/$pkg imports @spaces/$other"
      fi
    fi
  done
done
# Esperado: 0 violations
```

---

## Estimación

| Fase | Contenido | Esfuerzo |
|---|---|---|
| 1 — Core Ports | 4 interfaces | 1h |
| 2 — Tools | ~4,500 líneas, unificar + mover | 6h |
| 3 — Providers | ~1,300 líneas | 3h |
| 4 — Engine | ~2,000 líneas | 5h |
| 5 — Memory + Storage | ~600 líneas | 2h |
| 6 — Sandbox | ~500 líneas | 1.5h |
| 7 — Teams + Schedules | ~1,700 líneas, 2 paquetes nuevos | 4h |
| 8 — SDK | ~310 líneas | 1h |
| 9 — Cleanup | Reducción de context.ts, verificación | 2h |
| **Total** | | **~25.5h** |

---

## Regla de Cierre

Una fase **no está completa** hasta que TODOS sus criterios de aceptación devuelven el resultado esperado. `pnpm typecheck` y `pnpm build` deben pasar al final de CADA fase. Si un criterio falla, la fase se reabre.

---

_Plan creado a partir de la auditoría de `apps/server/src/` post-Plan 22._
