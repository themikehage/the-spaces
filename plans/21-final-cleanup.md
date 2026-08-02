# Plan 21 — Limpieza Final

> Barrido final: shared package, SDK, rutas legacy, features del gap analysis, documentación. 7 tareas, 40 criterios de aceptación inamovibles.

---

## Contexto

Después de los Planes 16-20, el sistema ya funciona con arquitectura hexagonal y sin código duplicado. Este plan aborda lo que queda: rutas legacy no migradas, el paquete `shared` en conflicto con `@spaces/core`, el SDK sin build, y features del gap analysis.

**Rol en el plan general**: cierre. Decide el destino final de cada pieza y documenta el estado de la arquitectura.

---

## Tareas

### Tarea 21.1 — Migrar `packages/shared` a `@spaces/core`

**Acción**: Migrar schemas y tipos relevantes de `shared` a `@spaces/core` (fuente única de verdad). Marcar `shared` como deprecated. Eliminar imports de `shared` desde `apps/server/src/`.

**Archivos**: `packages/shared/` (marcar deprecated), `packages/core/src/schemas/` (recibir schemas migrados), `apps/server/src/` (reemplazar imports)

**Criterios de aceptación**:

```bash
# AC1: shared/package.json tiene "deprecated" o una nota clara
rg -i "deprecated" packages/shared/package.json
# Resultado esperado: al menos 1 match

# AC2: Los schemas migrados existen en @spaces/core/src/schemas/
for schema in "agent" "team" "project" "schedule"; do
  ls "packages/core/src/schemas/$schema.schema.ts" 2>&1 | rg -q "No such file" && echo "MISSING: $schema" || echo "OK: $schema"
done
# Resultado esperado: 4 "OK" (solo si estas features se mantienen activas)

# AC3: Cero imports de shared en apps/server (excluyendo tests)
rg "from ['\"].*shared" apps/server/src/ --type ts --glob '!**/__tests__/**'
# Resultado esperado: 0 matches

# AC4: @spaces/core NO importa de shared (el core no depende de nadie)
rg "from ['\"].*shared" packages/core/src/ --type ts
# Resultado esperado: 0 matches

# AC5: TypeScript compila sin errores
pnpm typecheck
# Resultado esperado: exit code 0
```

---

### Tarea 21.2 — Arreglar `packages/spaces-sdk`

**Acción**: Agregar `tsconfig.json`, `devDependencies`, scripts de build. Re-exportar desde `@spaces/core` + `@spaces/engine` en lugar de `shared`. Eliminar re-exports de shared.

**Archivos**: `packages/spaces-sdk/package.json`, `tsconfig.json` (nuevo), `src/index.ts`

**Criterios de aceptación**:

```bash
# AC1: spaces-sdk tiene tsconfig.json
ls packages/spaces-sdk/tsconfig.json 2>&1 | rg -v "No such file"
# Resultado esperado: (existe)

# AC2: spaces-sdk tiene build script en package.json
rg '"build"' packages/spaces-sdk/package.json
# Resultado esperado: al menos 1 match

# AC3: spaces-sdk NO re-exporta de shared
rg "from ['\"].*shared" packages/spaces-sdk/src/index.ts
# Resultado esperado: 0 matches

# AC4: spaces-sdk re-exporta de @spaces/core y @spaces/engine
rg "@spaces/(core|engine)" packages/spaces-sdk/src/index.ts
# Resultado esperado: al menos 2 matches

# AC5: Build de spaces-sdk exitoso
pnpm --filter spaces-sdk build
# Resultado esperado: exit code 0
```

---

### Tarea 21.3 — Eliminar rutas postergables

**Acción**: Eliminar rutas y código server-side de features marcadas como "Postergar" o "Eliminar" en el gap analysis.

**Features a eliminar**: preview server, gallery, backup, image/video generation tools, exa search, pipelines, navigation controller.

**Archivos a borrar**: `routes/preview.ts`, `routes/gallery.ts`, `routes/backup.ts`, `core/tools/image-gen-tool.ts`, `core/tools/video-gen-tool.ts`, `core/tools/vision-tool.ts`, `core/tools/exa-search-tool.ts`, `core/tools/manage-pipelines-tool.ts`, `core/preview-builder.ts`, `core/preview-watcher.ts`, `core/preview-config.ts`, `core/navigation-controller.ts`, `core/custom-tools/pipeline-engine.ts`

**Criterios de aceptación**:

```bash
# AC1: Archivos de features postergadas no existen
for f in \
  "routes/preview.ts" \
  "routes/gallery.ts" \
  "routes/backup.ts" \
  "core/tools/image-gen-tool.ts" \
  "core/tools/video-gen-tool.ts" \
  "core/tools/vision-tool.ts" \
  "core/tools/exa-search-tool.ts" \
  "core/tools/manage-pipelines-tool.ts" \
  "core/preview-builder.ts" \
  "core/preview-watcher.ts" \
  "core/preview-config.ts" \
  "core/navigation-controller.ts" \
  "core/custom-tools/pipeline-engine.ts"; do
  ls "apps/server/src/$f" 2>&1 | rg -q "No such file" && echo "DELETED: $f" || echo "STILL EXISTS: $f"
done
# Resultado esperado: 13 "DELETED"

# AC2: Las rutas eliminadas no están montadas en index.ts
for route in "preview" "gallery" "backup"; do
  rg "routes/$route" apps/server/src/index.ts -q && echo "STILL MOUNTED: $route" || echo "CLEAN: $route"
done
# Resultado esperado: 3 "CLEAN"

# AC3: Nadie importa de los archivos eliminados (excluyendo tests)
for path in "image-gen-tool" "video-gen-tool" "vision-tool" "exa-search-tool" "manage-pipelines-tool" "navigation-controller"; do
  count=$(rg -c "from ['\"].*$path" apps/server/src/ --type ts --glob '!**/__tests__/**' 2>/dev/null || echo 0)
  echo "$path: $count"
done
# Resultado esperado: 0 para todos

# AC4: TypeScript compila sin errores
pnpm typecheck
# Resultado esperado: exit code 0
```

---

### Tarea 21.4 — Eliminar archivos legacy residuales del servidor

**Acción**: Barrer archivos legacy que debieron eliminarse en planes anteriores. Eliminar `core/session-manager.ts` si ya no se usa.

**Archivos a verificar/borrar**: `ai/` (todo lo que quede), `core/session-manager.ts`, `core/delegation-registry.ts`, `core/mcp-registry.ts`, `core/memory/registry.ts`, `core/ui-approval-registry.ts`

**Criterios de aceptación**:

```bash
# AC1: La carpeta ai/ no existe o está vacía (excepto tools migradas a @spaces/tools)
ls apps/server/src/ai/ 2>&1
# Resultado esperado: "No such file or directory" O solo contiene archivos de tools ya migradas

# AC2: core/session-manager.ts no existe
ls apps/server/src/core/session-manager.ts 2>&1
# Resultado esperado: "No such file or directory"

# AC3: Cero singletons en core/ (excluyendo middleware factories y configuración)
rg "export const [a-z][a-zA-Z]+ =" apps/server/src/core/ --type ts --glob '!**/__tests__/**' --glob '!**/middleware/**' --glob '!**/config/**'
# Resultado esperado: 0 matches

# AC4: TypeScript compila sin errores
pnpm typecheck
# Resultado esperado: exit code 0
```

---

### Tarea 21.5 — Eliminar páginas cliente de features postergadas

**Acción**: Eliminar páginas y componentes del cliente para features marcadas como "Postergar" o "Eliminar". Quitar sus rutas del router.

**Archivos a borrar**: `pages/PreviewPanel.tsx` (o su ruta), `pages/GalleryPage.tsx` (o su ruta), `components/preview/PreviewPanel.tsx`

**Criterios de aceptación**:

```bash
# AC1: Componentes de preview no existen
ls apps/client/src/components/preview/PreviewPanel.tsx 2>&1
# Resultado esperado: "No such file or directory"

# AC2: Las rutas eliminadas no están en el router del cliente
for route in "preview" "gallery"; do
  rg -i "$route" apps/client/src/router/routes.tsx -q && echo "STILL ROUTED: $route" || echo "CLEAN: $route"
done
# Resultado esperado: 2 "CLEAN"

# AC3: Nadie importa de los componentes eliminados
rg "PreviewPanel" apps/client/src/ --type ts
# Resultado esperado: 0 matches

# AC4: TypeScript compila sin errores
pnpm --filter @spaces/client typecheck
# Resultado esperado: exit code 0
```

---

### Tarea 21.6 — Actualizar documentación

**Acción**: Actualizar `AGENTS.md` y `about.md` para reflejar la arquitectura final.

**Archivos**: `AGENTS.md`, `about.md`

**Criterios de aceptación**:

```bash
# AC1: AGENTS.md menciona la arquitectura hexagonal
rg -i "hexagonal\|clean architecture\|ports" AGENTS.md
# Resultado esperado: al menos 1 match

# AC2: AGENTS.md referencia @spaces/core como fuente de contratos
rg "@spaces/core" AGENTS.md
# Resultado esperado: al menos 1 match

# AC3: AGENTS.md NO menciona AgentSession, vendor, ni singletons como práctica aceptable
rg "AgentSession\b|ai/vendor|singleton.*aceptable" AGENTS.md
# Resultado esperado: 0 matches

# AC4: about.md refleja la estructura actual de paquetes
rg "@spaces/(core|engine|tools|providers|storage|sandbox)" about.md
# Resultado esperado: al menos 4 matches

# AC5: about.md NO menciona features postergadas como activas
rg -i "preview server|gallery.*blueprints|backup.*restore|image.*generation|video.*generation|exa.*search|pipelines" about.md
# Resultado esperado: 0 matches (salvo que se mencionen como postergadas)
```

---

### Tarea 21.7 — Verificación final del workspace

**Acción**: Ejecutar todas las verificaciones globales y documentar el resultado.

**Criterios de aceptación**:

```bash
# AC1: TypeScript compila sin errores en TODO el workspace
pnpm typecheck
# Resultado esperado: exit code 0

# AC2: Build exitoso en todos los paquetes y apps
pnpm build
# Resultado esperado: exit code 0

# AC3: Lint sin errores
pnpm lint
# Resultado esperado: exit code 0

# AC4: Cero imports de archivos eliminados en apps/server
for path in "ai/vendor" "ai/agent-session" "ai/session-persistence" "ai/prompt-builder" "core/session-manager" "core/server-context" "core/event-bus" "core/stores/" "core/tool-registry" "sandbox/permission-engine" "ws/handler" "ws/factory"; do
  count=$(rg -c "from ['\"].*$path" apps/server/src/ --type ts --glob '!**/__tests__/**' 2>/dev/null || echo 0)
  echo "$path: $count"
done
# Resultado esperado: 0 para todos

# AC5: Cero "export const" de servicios en apps/server/core (solo factories y config)
count=$(rg -c "export const [a-z][a-zA-Z]+ =" apps/server/src/core/ --type ts --glob '!**/__tests__/**' --glob '!**/middleware/**' --glob '!**/config/**' 2>/dev/null || echo 0)
echo "Singletons remaining: $count"
# Resultado esperado: 0

# AC6: Ningún archivo > 300 líneas en apps/server/src/ (excluyendo tests)
find apps/server/src -name "*.ts" ! -path "*/__tests__/*" -exec wc -l {} \; | sort -rn | awk '$1 > 300 {print $2 ": " $1 " lines"; found=1} END {if (!found) print "ALL FILES <= 300 lines"}'
# Resultado esperado: "ALL FILES <= 300 lines"

# AC7: Ningún archivo > 300 líneas en apps/client/src/ (componentes core)
for f in "chat/ChatArea" "chat/MessageList" "chat/ChatInput" "layout/AppShell" "layout/AppSidebar" "layout/AppHeader" "sidebar/SessionSidebar"; do
  lines=$(wc -l < "apps/client/src/components/$f.tsx" 2>/dev/null || echo "N/A")
  echo "$f: $lines"
done
# Resultado esperado: todos < 300
```

---

## Decisión sobre Features del Gap Analysis

| Feature                   | Destino                                                | Verificación                                         |
| ------------------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| Auth                      | **Migrar** — `routes/auth.ts` thin, usa `AppContext`   | AC: ruta montada en index.ts, sin imports de shared  |
| Proyectos                 | **Migrar** — `routes/projects.ts` thin                 | AC: ruta montada, usa `appContext.sessionStore`      |
| Workspace archivos        | **Migrar** — `routes/files.ts` thin                    | AC: ruta montada, usa `appContext.sandbox`           |
| Model Registry UI         | **Migrar** — `routes/models.ts`, `routes/providers.ts` | AC: usan `appContext.modelProvider`                  |
| Settings / Env            | **Migrar** — `routes/settings.ts`, `routes/env.ts`     | AC: usan `appContext`                                |
| Entity Config             | **Migrar** — `routes/config.ts`                        | AC: usan `appContext`                                |
| Skills                    | **Migrar** — `routes/skills.ts`                        | AC: usan `appContext`                                |
| Tools Scoping             | **Migrar** — scope endpoints en `routes/agents.ts`     | AC: usan `appContext`                                |
| Compaction                | **Migrar** — hook en `@spaces/engine`                  | AC: registro de hook en `context.ts`                 |
| Task Runner               | **Migrar** — tool en `@spaces/tools`                   | AC: tool registrada en `createDefaultToolRegistry()` |
| Factory                   | **Migrar** — `routes/factory.ts`                       | AC: usa `appContext`                                 |
| SDK                       | **Migrar** — `packages/spaces-sdk`                     | AC: ver Tarea 21.2                                   |
| Landing page              | **Sin cambios**                                        | Sin verificación — app independiente                 |
| Preview Server            | **Postergar** — eliminar ruta y código                 | AC: ver Tarea 21.3                                   |
| Gallery                   | **Postergar** — eliminar ruta                          | AC: ver Tarea 21.3                                   |
| Backup                    | **Postergar** — eliminar ruta                          | AC: ver Tarea 21.3                                   |
| Image/Video Gen           | **Postergar** — eliminar tools                         | AC: ver Tarea 21.3                                   |
| Exa Search                | **Postergar** — eliminar tool                          | AC: ver Tarea 21.3                                   |
| Pipelines                 | **Postergar** — eliminar                               | AC: ver Tarea 21.3                                   |
| Navigation Controller     | **Eliminar**                                           | AC: ver Tarea 21.3                                   |
| Attention Hub             | **Migrar** — componente UI existente                   | AC: se conecta a `IApprovalChannel`                  |
| Breadcrumbs               | **Migrar** — componente UI existente                   | AC: sin cambios, no depende de arquitectura          |
| Dashboard/Kanban/Timeline | **Migrar** — páginas existentes                        | AC: usan misma API, sin cambios estructurales        |
| Analytics                 | **Migrar** — página existente                          | AC: sin cambios estructurales                        |
| Mobile/i18n/Theme         | **Migrar** — sin cambios                               | AC: sin cambios, infraestructura UI                  |

---

## Verificación Global

```bash
# VG1: Workspace compila limpio
pnpm typecheck && pnpm build && pnpm lint
# Resultado esperado: exit code 0

# VG2: Sin rastros de la arquitectura vieja
for pattern in "AgentSession" "ai/vendor" "sessionManager" "mcpRegistry" "memoryRegistry" "uiApprovalRegistry" "delegationRegistry" "createServerContext"; do
  count=$(rg -c "\\b$pattern\\b" apps/server/src/ --type ts --glob '!**/__tests__/**' 2>/dev/null || echo 0)
  echo "$pattern: $count"
done
# Resultado esperado: 0 para todos

# VG3: Paquetes @spaces/* sin violaciones
for pkg in "core" "engine" "tools" "providers" "storage" "sandbox"; do
  any_count=$(rg -c "as any" "packages/$pkg/src/" --type ts 2>/dev/null || echo 0)
  echo "@spaces/$pkg as any: $any_count"
done
# Resultado esperado: 0 para todos
```

---

## Estimación

| Tarea                                       | Criterios        | Esfuerzo  |
| ------------------------------------------- | ---------------- | --------- |
| 21.1 — Migrar shared → core                 | 5                | 2h        |
| 21.2 — Arreglar spaces-sdk                  | 5                | 1h        |
| 21.3 — Eliminar features postergadas        | 4                | 1.5h      |
| 21.4 — Eliminar archivos legacy             | 4                | 1h        |
| 21.5 — Eliminar páginas cliente postergadas | 4                | 30 min    |
| 21.6 — Actualizar docs                      | 5                | 1h        |
| 21.7 — Verificación final                   | 7                | 30 min    |
| **Total**                                   | **34 criterios** | **~7.5h** |

---

_Plan reescrito aplicando `skills/criterios-de-aceptacion-verificables.md`. Original auditado en `plans/20-21-audit-criteria.md`._
