# Plan 22 — Cierre de Pendientes Finales

> Resuelve los 12 issues detectados en `plans/16-21-final-audit.md`. 7 tareas, 38 criterios de aceptación inamovibles.

---

## Contexto

La auditoría final post-Plan 21 encontró tres lastres concentrados en `apps/server/src/`: 15 singletons que sobrevivieron, 73 imports del paquete `shared` sin migrar a `@spaces/core`, y un `SessionManager` de 337 líneas que envuelve singletons en vez de delegar al engine. Hay 4 issues menores adicionales (docs, route stubs, código deprecated).

**Rol**: cierre definitivo. Después de este plan, la arquitectura hexagonal está completa de punta a punta.

---

## Tareas

### Tarea 22.1 — Eliminar `SessionManager` (337 líneas)

**Acción**: Reemplazar `core/session-manager.ts` por engine-driven session CRUD. Todo acceso a sesiones debe pasar por `appContext.sessionStore` y `appContext.createSessionAgent()`. Eliminar el archivo.

**Archivos**: `core/session-manager.ts` (borrar), `context.ts`, `routes/agents.ts`, `routes/files.ts`, `routes/teams.ts`, `core/schedules/schedule-service.ts`, `core/session/create-user-session.ts`, `core/tools/manage-delegations-tool.ts`, `teams/orchestration/orchestration-runner.ts`

**Criterios de aceptación**:

```bash
# AC1: session-manager.ts no existe
ls apps/server/src/core/session-manager.ts 2>&1
# Resultado esperado: "No such file or directory"

# AC2: Nadie importa de core/session-manager (excluyendo tests)
rg "from ['\"].*core/session-manager['\"]" apps/server/src/ --type ts --glob '!**/__tests__/**'
# Resultado esperado: 0 matches

# AC3: context.ts NO importa SessionManager
rg "SessionManager" apps/server/src/context.ts
# Resultado esperado: 0 matches

# AC4: context.ts expone sessionStore y createSessionAgent (sin SessionManager)
rg "sessionStore|createSessionAgent" apps/server/src/context.ts
# Resultado esperado: al menos 2 matches

# AC5: TypeScript compila sin errores
pnpm typecheck
# Resultado esperado: exit code 0
```

---

### Tarea 22.2 — Migrar 73 imports de `shared` → `@spaces/core`

**Acción**: Migrar paths, tipos, schemas y catálogos de `shared` a `@spaces/core`. Una vez que `apps/server` no importa de `shared`, eliminar `packages/shared/`.

**Archivos**: `packages/core/src/` (recibir paths, tipos y catálogos), `apps/server/src/` (73 archivos a migrar), `packages/shared/` (borrar al final)

**Criterios de aceptación**:

```bash
# AC1: Cero imports de shared en apps/server (excluyendo tests)
rg "from ['\"].*shared" apps/server/src/ --type ts --glob '!**/__tests__/**'
# Resultado esperado: 0 matches

# AC2: Cero imports de shared en apps/client (excluyendo tests)
rg "from ['\"].*shared" apps/client/src/ --type ts --glob '!**/__tests__/**'
# Resultado esperado: 0 matches

# AC3: packages/shared/ no existe (o está vacío)
ls packages/shared/package.json 2>&1
# Resultado esperado: "No such file or directory"

# AC4: Los paths migrados existen en @spaces/core
rg "SPACES_DATA_PATH\|getUserDir\|getSessionDir" packages/core/src/ --type ts
# Resultado esperado: al menos 3 matches

# AC5: Los tipos migrados existen en @spaces/core
rg "AgentDefinition\|Team\b\|TeamMember\|BaseTool" packages/core/src/ --type ts
# Resultado esperado: al menos 3 matches

# AC6: TypeScript compila sin errores
pnpm typecheck
# Resultado esperado: exit code 0
```

---

### Tarea 22.3 — Eliminar 15 singletons restantes

**Acción**: Migrar cada singleton a `AppContext`. Agrupar por cantidad de consumidores: primero los de 1-3, luego los masivos como `userConfigManager` (17).

| Grupo                | Singletons                                                                                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A (≤3 consumidores)  | `memoryRegistry` (3), `workspaceConfigLoader` (3), `promptComposer` (3), `scheduleService` (3), `sessionPromptBuilder` (2), `sessionToolFactory` (2), `customToolStorage` (2) |
| B (4-8 consumidores) | `uiApprovalRegistry` (5), `userPermissionStore` (5), `approvalManager` (4)                                                                                                    |
| C (≥8 consumidores)  | `delegationRegistry` (8), `mcpRegistry` (8), `scopeConfigManager` (10), `sessionMetadataStore` (13), `userConfigManager` (17)                                                 |

**Archivos**: 15 archivos de singleton, `context.ts` (agregar propiedades), ~60 consumidores

**Criterios de aceptación**:

```bash
# AC1: Cero "export const [a-z]" de servicios en core/ (excluyendo middleware, config, tests)
rg "export const [a-z][a-zA-Z]+ =" apps/server/src/core/ --type ts --glob '!**/__tests__/**' --glob '!**/middleware/**' --glob '!**/config/**'
# Resultado esperado: 0 matches

# AC2: Cero imports de los 15 nombres de singleton en apps/server (excluyendo tests y definiciones)
for name in "memoryRegistry" "workspaceConfigLoader" "promptComposer" "scheduleService" "sessionPromptBuilder" "sessionToolFactory" "customToolStorage" "uiApprovalRegistry" "userPermissionStore" "approvalManager" "delegationRegistry" "mcpRegistry" "scopeConfigManager" "sessionMetadataStore" "userConfigManager"; do
  count=$(rg -c "\\bimport.*\\b$name\\b" apps/server/src/ --type ts --glob '!**/__tests__/**' 2>/dev/null | wc -l)
  echo "$name: $count"
done
# Resultado esperado: 0 para todos

# AC3: AppContext expone todos los servicios migrados
rg "memoryProvider\|workspaceConfig\|promptComposer\|scheduleService\|sessionPromptBuilder\|sessionToolFactory\|customToolStorage\|approvalChannel\|userPermissionStore\|approvalManager\|delegationService\|mcpRegistry\|scopeConfig\|sessionMetadataStore\|userConfigManager" apps/server/src/context.ts
# Resultado esperado: al menos 10 matches

# AC4: TypeScript compila sin errores
pnpm typecheck
# Resultado esperado: exit code 0
```

---

### Tarea 22.4 — Eliminar código deprecated de `shared`

**Acción**: Si `shared` no se eliminó en 22.2, borrar las clases/interfaces duplicadas que ya están marcadas `@deprecated`: `ToolRegistry` en `shared/tools/tool-registry.ts` y `ISessionStore` en `shared/stores/session-store.ts`.

**Archivos**: `shared/tools/tool-registry.ts` (borrar o vaciar), `shared/stores/session-store.ts` (borrar o vaciar)

**Criterios de aceptación**:

```bash
# AC1: ToolRegistry de shared no existe como export
rg "export class ToolRegistry" packages/shared/src/tools/tool-registry.ts
# Resultado esperado: 0 matches

# AC2: ISessionStore de shared no existe como export
rg "export interface ISessionStore" packages/shared/src/stores/session-store.ts
# Resultado esperado: 0 matches

# AC3: Nadie importa ToolRegistry de shared
rg "from ['\"].*shared.*tool-registry" apps/ --type ts
# Resultado esperado: 0 matches

# AC4: Nadie importa ISessionStore de shared/stores
rg "from ['\"].*shared.*stores/session-store" apps/ --type ts
# Resultado esperado: 0 matches

# AC5: TypeScript compila sin errores
pnpm typecheck
# Resultado esperado: exit code 0
```

---

### Tarea 22.5 — Corregir `about.md` con referencias obsoletas

**Acción**: Eliminar menciones a preview, gallery, backup, image/video generation. Reflejar la arquitectura final.

**Archivos**: `about.md`

**Criterios de aceptación**:

```bash
# AC1: No menciona preview como feature activo
rg -i "preview\|previsualización" about.md
# Resultado esperado: 0 matches (salvo que se mencione como postergado)

# AC2: No menciona gallery como ruta activa
rg -i "gallery\|galería" about.md
# Resultado esperado: 0 matches

# AC3: No menciona backup como ruta activa
rg -i "backup\|respaldo" about.md
# Resultado esperado: 0 matches

# AC4: No menciona generación de imágenes/video como activo
rg -i "image_gen\|generate_video\|generación de imágenes\|generacion de videos" about.md
# Resultado esperado: 0 matches

# AC5: Menciona @spaces/core como fuente de contratos
rg "@spaces/core" about.md
# Resultado esperado: al menos 1 match
```

---

### Tarea 22.6 — Eliminar `PreviewRoute` stubs del cliente

**Acción**: Borrar los 2 route stubs que renderizan `null` en `router/routes/ContextLeaves.tsx` y sus montajes en `router/routes.tsx`.

**Archivos**: `router/routes/ContextLeaves.tsx`, `router/routes.tsx`

**Criterios de aceptación**:

```bash
# AC1: PreviewRoute no se exporta
rg "export.*PreviewRoute" apps/client/src/router/
# Resultado esperado: 0 matches

# AC2: No existe ruta "preview" en el router
rg "path.*preview" apps/client/src/router/routes.tsx
# Resultado esperado: 0 matches

# AC3: TypeScript compila sin errores
pnpm --filter @spaces/client typecheck
# Resultado esperado: exit code 0
```

---

### Tarea 22.7 — Verificación global final

**Criterios de aceptación**:

```bash
# VG1: TypeScript compila sin errores en TODO el workspace
pnpm typecheck
# Resultado esperado: exit code 0

# VG2: Build exitoso en todos los paquetes y apps
pnpm build
# Resultado esperado: exit code 0

# VG3: Lint sin errores
pnpm lint
# Resultado esperado: exit code 0

# VG4: Cero singletons de servicio en apps/server/core
rg "export const [a-z][a-zA-Z]+ =" apps/server/src/core/ --type ts --glob '!**/__tests__/**' --glob '!**/middleware/**' --glob '!**/config/**'
# Resultado esperado: 0 matches

# VG5: Cero imports de shared en apps/
rg "from ['\"].*shared" apps/ --type ts --glob '!**/__tests__/**'
# Resultado esperado: 0 matches

# VG6: Cero referencias a AgentSession, ai/vendor, sessionManager (el tipo), createServerContext en apps/server
for pattern in "AgentSession" "ai/vendor" "sessionManager" "createServerContext"; do
  count=$(rg -c "\\b$pattern\\b" apps/server/src/ --type ts --glob '!**/__tests__/**' 2>/dev/null || echo 0)
  echo "$pattern: $count"
done
# Resultado esperado: 0 para todos

# VG7: Paquetes @spaces/* sin as any (excluyendo event bus genérico)
for pkg in "core" "engine" "tools" "providers" "storage" "sandbox"; do
  count=$(rg -c "as any" "packages/$pkg/src/" --type ts 2>/dev/null || echo 0)
  echo "@spaces/$pkg as any: $count"
done
# Resultado esperado: 0 para todos

# VG8: about.md sin referencias obsoletas
rg -i "preview\|gallery\|backup\|image_gen\|generate_video\|galería\|respaldo\|previsualización" about.md
# Resultado esperado: 0 matches (salvo mención como "postergado")
```

---

## Estimación

| Tarea                                       | Criterios        | Esfuerzo |
| ------------------------------------------- | ---------------- | -------- |
| 22.1 — Eliminar SessionManager              | 5                | 1.5h     |
| 22.2 — Migrar shared → core                 | 6                | 3h       |
| 22.3 — Eliminar 15 singletons               | 4                | 4h       |
| 22.4 — Eliminar código deprecated de shared | 5                | 30 min   |
| 22.5 — Corregir about.md                    | 5                | 15 min   |
| 22.6 — Eliminar PreviewRoute stubs          | 3                | 10 min   |
| 22.7 — Verificación global                  | 8                | 20 min   |
| **Total**                                   | **36 criterios** | **~10h** |

---

## Regla de Cierre

Una tarea **no está completa** hasta que **todos** sus criterios de aceptación devuelven el resultado esperado. Si un criterio falla, la tarea se reabre. Los comandos son la única verdad.

---

_Creado con `skills/create-verificable-plans.md`. Basado en `plans/16-21-final-audit.md`._
