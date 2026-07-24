# Spaces — 07 · Calidad de código

> Este documento define el plan de mejora de calidad de código de Spaces basado en un análisis competitivo contra Google ADK.
> Cubre 5 áreas críticas identificadas como brechas estructurales entre el estado actual de Spaces y los estándares de un producto maduro.
> El plan es independiente de otras iniciativas: se puede ejecutar en paralelo o intercalado con el roadmap funcional.

---

## Contexto: estado actual

| Indicador | Spaces actual | Google ADK |
|---|---|---|
| Tests unitarios | 15 tests en `apps/server/src/__tests__/` | 20+ subdirectorios con suites paralelas |
| Tests de integración | Cero | Fixtures JSON/YAML + mock LLM responses |
| Tests E2E | Cero | Contra modelos Gemini reales |
| Test runner | No instalado (sin `vitest`, sin scripts) | Vitest con 6 suites paralelas |
| Coverage | Sin tooling, sin thresholds | 86%+ enforceado en CI |
| Linter | Sin config (ni ESLint, ni Biome, ni Prettier) | ESLint v9 flat config + tseslint recommended |
| Formateador | Sin config | Prettier con organize-imports plugin |
| Git hooks | Sin hooks (sin Husky, sin lefthook) | Husky + lint-staged pre-commit |
| `any` en código | 100+ usos (AGENTS.md lo prohíbe) | Prácticamente cero en código propio |
| Error handling | `c.json({ error: String(err) }, 500)` inline en cada ruta | Structured error types + plugin hooks |
| Request IDs | No existen | — |
| API docs | Sin OpenAPI, sin TypeDoc, sin CHANGELOG | TypeDoc + typedoc-theme-fresh + release-please |
| EditorConfig | No existe | Configuración canónica |

---

## Área 1 — Infraestructura de testing

### Diagnóstico

Los 15 tests que existen son exclusivamente unitarios, cubren lógica interna del server (memoria, permisos, delegación, factory contracts) pero no tocan ni una sola ruta HTTP, ni una operación de archivos, ni un flujo WebSocket end-to-end. No hay test runner instalado: ningún `package.json` del monorepo tiene script `"test"`. Los workspaces `apps/client`, `apps/landing` y `packages/shared` tienen cobertura cero. No existe `vitest.config.ts` en ningún nivel.

### Lo que falta

- Instalar `vitest` como devDependency en la raíz del monorepo.
- Crear `vitest.config.ts` raíz con configuración por workspace y aliases `@/`.
- Agregar script `"test"` a todos los `package.json` (`root`, `apps/server`, `apps/client`, `apps/landing`, `packages/shared`).
- Agregar script `"test:coverage"` con thresholds iniciales realistas (60% líneas, 50% branches).
- **Tests de integración — `apps/server`**:
  - Suite `routes/auth.test.ts`: login, registro, refresh de token, sesión inválida.
  - Suite `routes/sessions.test.ts`: CRUD de sesiones con assertions sobre estado, tools asignadas, canal activo.
  - Suite `routes/files.test.ts`: read, write, list, delete en workspace; validación de paths; límites de tamaño.
  - Suite `routes/agents.test.ts`: registro, actualización, scope global vs. proyecto, validación de definición.
  - Suite `routes/teams.test.ts`: creación, orquestación básica, permisos compartidos.
  - Suite `routes/factory.test.ts`: registro de skills, tools, modelos; validación de contratos.
  - Suite `ws/streaming.test.ts`: conexión WebSocket, streaming de sesión, mensajes tipados, reconexión.
- **Contract tests — `packages/shared`**:
  - Suite de validación de schemas Zod: cada schema exportado debe ser testeado con inputs válidos e inválidos.
  - Suite de tipos: verificar que las interfaces exportadas son compatibles con los schemas runtime.
- **Mocks y fixtures**:
  - Mock de `Bun.sql` (SQLite) con datos seed para cada suite.
  - Mock de LLM provider que devuelva respuestas deterministas.
  - Fixtures JSON: definiciones de agentes, sesiones, archivos de workspace.
- **CI step**: `pnpm test` en todos los workspaces, con coverage report.

### Herramientas a instalar

| Paquete | Propósito |
|---|---|
| `vitest` | Test runner |
| `@vitest/coverage-v8` | Coverage (nativo, sin dependencia Istanbul) |
| `@vitest/ui` | UI opcional para debugging local |
| `vite-tsconfig-paths` | Resolver aliases `@/` en tests |

---

## Área 2 — Tooling de calidad de código

### Diagnóstico

No existe configuración de ESLint, Prettier, ni Biome en ninguna parte del monorepo. No hay git hooks de ningún tipo. El comando `pnpm typecheck` no existe a nivel raíz ni en ningún workspace individual. No hay `.editorconfig`. Esto significa que el formateo, el linting y el typecheck dependen exclusivamente de la disciplina manual del desarrollador — lo cual no escala con múltiples colaboradores ni con CI.

### Lo que falta

- Instalar y configurar **ESLint v9** con `eslint.config.mjs` (flat config) en la raíz.
  - Extender `typescript-eslint` (`tseslint.configs.recommended`).
  - Extender `eslint-plugin-react-hooks` para los workspaces de frontend.
  - Regla `@typescript-eslint/no-explicit-any`: `"error"`.
  - Regla `@typescript-eslint/strict-boolean-expressions`: `"warn"`.
  - Regla `no-console`: `"warn"` (excepto `console.error`).
- Instalar y configurar **Prettier** con `.prettierrc` raíz:
  ```json
  {
    "semi": true,
    "singleQuote": false,
    "tabWidth": 2,
    "trailingComma": "all",
    "printWidth": 100,
    "bracketSpacing": true,
    "arrowParens": "always"
  }
  ```
- Instalar `prettier-plugin-organize-imports` para ordenamiento automático de imports.
- Configurar **lefthook** (preferible sobre Husky por velocidad y compatibilidad multiplataforma):
  - Pre-commit hook: `prettier --check`, `eslint`, `tsc --noEmit`.
  - Commit-msg hook: validación de conventional commits.
- Crear `.editorconfig` raíz con charset, indent, y newline settings unificados.
- Agregar scripts raíz en `package.json`:
  - `"typecheck": "tsc --noEmit"` (con project references o `--build` si se usa mode).
  - `"lint": "eslint ."`, `"lint:fix": "eslint . --fix"`
  - `"format": "prettier --write ."`, `"format:check": "prettier --check ."`
- Agregar plantilla de **CI** (GitHub Actions) con steps:
  1. `pnpm install`
  2. `pnpm typecheck`
  3. `pnpm lint`
  4. `pnpm format:check`
  5. `pnpm test` (con coverage)
  6. `pnpm build` (para detectar errores de build en prod)

### Herramientas a instalar

| Paquete | Propósito |
|---|---|
| `eslint` ^9 | Linter con flat config |
| `typescript-eslint` | Reglas de TS para ESLint |
| `eslint-plugin-react-hooks` | Reglas de hooks para frontend |
| `prettier` | Formateador |
| `prettier-plugin-organize-imports` | Orden automático de imports |
| `lefthook` | Git hooks multiplataforma |
| `@commitlint/cli` + `@commitlint/config-conventional` | Validación de commits |

---

## Área 3 — TypeScript estricto (eliminar `any`)

### Diagnóstico

El archivo `AGENTS.md` establece como convención: *"TypeScript strict mode, no `any` types"*. La realidad es que hay más de 100 usos de `any` en el código del server. Los focos más críticos:

| Archivo | Usos de `any` | Contexto |
|---|---|---|
| `agent-session.ts` | ~15 | `(this.agent.state as any)` repetido para acceder a estado interno |
| `bash-tool.ts` | En firma de `execute` | El parámetro `params` y el `output` no están tipados |
| `agent-registry.ts` | Registry tipado como `customTools: any[]` | El registro de tools no tiene tipo genérico |
| `ws/handler.ts` | 12+ | `(ctx as any).id`, handlers de eventos sin tipos |
| `ws/factory.ts` | 10+ | `(agentEvent as any)`, `data.images as any[]`, iteración de tools |
| `core/agent-utils.ts` | 10+ | Callbacks, bridge del handler WebSocket, `getLastAssistantText` |
| `core/approvals/approval-manager.ts` | 5 | `reason: any`, `timeoutId: any`, `payload: Record<string, any>` |
| `routes/files.ts` | 15+ | `catch (err: any)` en cada handler, parámetros `c: any` |

### Lo que falta

- Habilitar `"strict": true` en todos los `tsconfig.json` del monorepo (`apps/server`, `apps/client`, `apps/landing`, `packages/shared`).
- Si activar `strict` de una vez rompe demasiado, plan B: activar las flags individuales progresivamente (`strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, etc.) y trackearlas.
- Crear tipos e interfaces que reemplacen cada `any`:
  - **Tool registry tipado**: `ToolDefinition<TParams extends ZodTypeAny>` con `execute(params: z.infer<TParams>)`.
  - **WebSocket tipado**: `WsMessage<T = unknown>` con discriminador `type` y payload genérico.
  - **Agent state tipado**: interfaz `AgentState` con propiedades accesibles sin casteo.
  - **Approval manager tipado**: `ApprovalRequest<T = unknown>` con payload genérico.
  - **Bridge del handler tipado**: `registerChannelInterceptor` y `broadcastToSession` con firmas explícitas.
- Agregar step en CI: `pnpm typecheck` que falle si hay errores.
- Regla ESLint `@typescript-eslint/no-explicit-any: "error"` (mencionada en el Área 2).
- Estrategia de migración por archivo: priorizar los archivos con más usos y los que están en la ruta crítica (session, tools, WebSocket).

### Orden de ataque recomendado

1. `apps/server/src/ai/bash-tool.ts` — bajo riesgo, alto impacto en DX.
2. `apps/server/src/core/approvals/approval-manager.ts` — interfaz pública del sistema de aprobaciones.
3. `apps/server/src/core/agent-utils.ts` — usado por todo el flujo de sesión.
4. `apps/server/src/agents/agent-registry.ts` — tipado del registro de tools.
5. `apps/server/src/ai/agent-session.ts` — núcleo del runtime, requiere refactor cuidadoso.
6. `apps/server/src/ws/handler.ts` + `apps/server/src/ws/factory.ts` — capa WebSocket.
7. `apps/server/src/routes/*.ts` — handlers HTTP (los `catch (err: any)` se resuelven en el Área 4).

---

## Área 4 — Manejo centralizado de errores

### Diagnóstico

Cada ruta maneja errores de forma ad-hoc con el patrón:

```typescript
try {
  // lógica
} catch (err) {
  return c.json({ error: String(err) }, 500);
}
```

Problemas de este enfoque:
- `String(err)` expone mensajes internos al cliente (paths del filesystem, detalles de SQLite, stack traces).
- No hay códigos de error estandarizados — el cliente no puede reaccionar programáticamente.
- No hay request IDs — imposible correlacionar un error en el frontend con el log del server.
- No hay middleware `onError` de Hono — cada ruta duplica la misma lógica de try/catch.
- Los errores en WebSocket usan try/catch ad-hoc sin serialización consistente.
- Si una ruta olvida el try/catch, el error crashea el request sin respuesta HTTP.

### Lo que falta

- Crear jerarquía de errores tipados en `apps/server/src/core/errors.ts`:
  ```typescript
  class AppError extends Error {
    constructor(
      public statusCode: number,
      public code: string,
      message: string,
      public details?: unknown,
    ) {
      super(message);
      this.name = "AppError";
    }
  }

  class HttpError extends AppError { /* statusCode derivado de HTTP status */ }
  class BadRequestError extends HttpError { constructor(code, msg, details?) { super(400, code, msg, details); } }
  class UnauthorizedError extends HttpError { constructor(code, msg, details?) { super(401, code, msg, details); } }
  class NotFoundError extends HttpError { constructor(code, msg, details?) { super(404, code, msg, details); } }
  class ConflictError extends HttpError { constructor(code, msg, details?) { super(409, code, msg, details); } }
  class InternalError extends AppError { constructor(code, msg, details?) { super(500, code, msg, details); } }
  ```
- Implementar **middleware de request ID** en Hono:
  - Generar `X-Request-Id` vía `crypto.randomUUID()` al inicio de cada request.
  - Adjuntarlo al header de respuesta para que el cliente lo pueda referenciar.
- Implementar **middleware `onError`** de Hono:
  - Si el error es `AppError`: serializar con `{ code, message, requestId }`. No exponer `details` en producción.
  - Si el error es desconocido (no `AppError`): loguear completo internamente, devolver `{ code: "INTERNAL_ERROR", message: "An unexpected error occurred", requestId }`.
  - En desarrollo (`NODE_ENV !== "production"`): incluir `details` y `stack` en la respuesta.
- Reemplazar **todos** los `catch (err) { c.json({ error: String(err) }, 500) }` por `throw new InternalError(...)` o la subclase apropiada.
- Serialización de errores WebSocket:
  - Cada mensaje de error en WS debe incluir `{ type: "error", code, message, requestId? }`.

### Archivos a modificar (todos los catch inline)

| Archivo | Handlers afectados |
|---|---|
| `routes/auth.ts` | login, register, refresh, logout, session |
| `routes/sessions.ts` | create, list, get, update, delete, stop |
| `routes/files.ts` | ~15 handlers con `catch (err: any)` |
| `routes/agents.ts` | register, list, get, update, delete |
| `routes/teams.ts` | create, list, get, update, delete, orchestrate |
| `routes/factory.ts` | CRUD de skills, tools, modelos |
| `routes/backup.ts` | create, restore |
| `routes/approvals.ts` | list, approve, reject |
| `routes/providers.ts` | CRUD de providers |
| `routes/settings.ts` | get, update |
| `routes/mcp.ts` | CRUD de servidores MCP |
| `routes/models.ts` | list, get, set-default |
| `routes/gallery.ts` | list, install |
| `routes/env.ts` | get, set |
| `routes/logs.ts` | list, get |
| `routes/preview.ts` | start, stop, status |
| `routes/skills.ts` | list, get, create, update, delete |

---

## Área 5 — Documentación de API

### Diagnóstico

Spaces tiene 17 archivos de rutas con endpoints REST + WebSocket sin documentación formal. No existe spec OpenAPI/Swagger. No existe TypeDoc para los packages. No existe CHANGELOG. Esto hace que sea imposible para un consumidor externo (o un desarrollador nuevo del equipo) entender el contrato de la API sin leer el código fuente ruta por ruta.

### Lo que falta

- Generar spec **OpenAPI 3.1** a partir de las rutas Hono usando `@hono/zod-openapi`.
  - Migrar las definiciones de ruta actuales a `createRoute()` de `@hono/zod-openapi` (provee tipos para request/response + genera spec automáticamente).
  - Agregar descripciones, tags, y examples a cada endpoint.
  - Exponer endpoint `GET /openapi.json` que sirva la spec generada.
- Servir **Swagger UI** o **Scalar** en `GET /docs` (solo en desarrollo por defecto, configurable).
- Configurar **TypeDoc**:
  - Enfocado en `packages/shared` (schemas y tipos públicos) y en el core del server.
  - Generar docs en `docs/api/` como parte del build de CI.
  - Usar `typedoc-plugin-markdown` si se prefiere output en markdown para el repo.
- Crear **CHANGELOG** manual basado en el historial de git:
  - `CHANGELOG.md` raíz con secciones por versión.
  - Documentar breaking changes, nuevas features, y fixes.
  - Evaluar automatización futura con `changesets` o `release-please`.
- Documentar cada grupo de rutas con:
  - Propósito del grupo.
  - Lista de endpoints con método, path, descripción.
  - Ejemplo de request/response (curl + JSON).

### Endpoints a documentar (17 grupos)

| # | Grupo | Archivo | Endpoints estimados |
|---|---|---|---|
| 1 | Auth | `routes/auth.ts` | ~5 (login, register, refresh, logout, session) |
| 2 | Sessions | `routes/sessions.ts` | ~6 (CRUD + stop) |
| 3 | Agents | `routes/agents.ts` | ~5 (CRUD) |
| 4 | Teams | `routes/teams.ts` | ~6 (CRUD + orchestrate) |
| 5 | Factory | `routes/factory.ts` | ~9 (skills, tools, models CRUD) |
| 6 | Files | `routes/files.ts` | ~8 (workspace CRUD + file ops) |
| 7 | Approvals | `routes/approvals.ts` | ~3 (list, approve, reject) |
| 8 | Providers | `routes/providers.ts` | ~5 (CRUD) |
| 9 | Settings | `routes/settings.ts` | ~2 (get, update) |
| 10 | MCP | `routes/mcp.ts` | ~5 (CRUD) |
| 11 | Models | `routes/models.ts` | ~3 (list, get, set-default) |
| 12 | Gallery | `routes/gallery.ts` | ~2 (list, install) |
| 13 | Env | `routes/env.ts` | ~2 (get, set) |
| 14 | Logs | `routes/logs.ts` | ~2 (list, get) |
| 15 | Preview | `routes/preview.ts` | ~3 (start, stop, status) |
| 16 | Backup | `routes/backup.ts` | ~2 (create, restore) |
| 17 | Skills | `routes/skills.ts` | ~5 (CRUD) |

---

## Resumen: las 5 áreas

```
Calidad de código — 07:
│
├── Área 1 · Testing infra
│   ├── vitest en todos los workspaces
│   ├── scripts "test" y "test:coverage" unificados
│   ├── Tests de integración: auth, sessions, files, agents, teams, factory, WebSocket
│   ├── Contract tests para schemas de packages/shared
│   └── CI: pnpm test con coverage thresholds
│
├── Área 2 · Code quality tooling
│   ├── ESLint v9 flat config + tseslint + react-hooks
│   ├── Prettier + organize-imports
│   ├── lefthook con pre-commit (format + lint + typecheck)
│   ├── .editorconfig
│   └── CI: typecheck + lint + format:check + test + build
│
├── Área 3 · TypeScript estricto (no any)
│   ├── strict: true en todos los tsconfig
│   ├── Regla ESLint no-explicit-any: error
│   ├── Tipado de tool registry, WebSocket, agent state, approvals
│   └── Migración archivo por archivo (7 priorizados)
│
├── Área 4 · Centralized error handling
│   ├── AppError / HttpError class hierarchy
│   ├── Middleware request ID (X-Request-Id)
│   ├── Middleware onError de Hono (structured envelope)
│   ├── Reemplazo de 100+ catch-inline por throw
│   └── Serialización segura en prod (sin internal details)
│
└── Área 5 · API documentation
    ├── OpenAPI 3.1 via @hono/zod-openapi
    ├── Swagger UI / Scalar en /docs
    ├── TypeDoc para packages/shared y core
    ├── CHANGELOG desde git history
    └── Documentación de 17 grupos de rutas con ejemplos
```

---

## Prioridad

1. **Área 2 — Code quality tooling.** Es el habilitador de todo lo demás. Sin ESLint, Prettier y CI no hay enforcement automático de ninguna regla. El `no-explicit-any` que el Área 3 necesita depende de ESLint. El CI que las Áreas 1, 3 y 5 necesitan depende de los scripts unificados que esta área crea. Es el fundamento.

2. **Área 4 — Centralized error handling.** Es la deuda más peligrosa para producción. `String(err)` expone información interna a cualquier cliente. Cada endpoint nuevo que se agrega sin el middleware copia el patrón incorrecto. Cuanto más se posterga, más catch-inline hay que migrar. Además, el middleware de request ID resuelve un problema de debugging que se siente inmediatamente en desarrollo.

3. **Área 3 — TypeScript strictness.** Los `any` son bugs esperando ocurrir. Pero migrar 100+ usos requiere que las herramientas del Área 2 estén activas (para que ESLint bloquee nuevos `any` mientras se migran los viejos) y que el CI del Área 2 esté corriendo (para que `tsc --noEmit` falle en PRs).

4. **Área 1 — Testing infrastructure.** Es la inversión más grande en tiempo pero la que más valor da a largo plazo. Sin tests, cada refactor de las Áreas 3 y 4 es un riesgo. La suite de integración debería crecer al mismo ritmo que se migran los `any` y los errores: cada archivo refactoreado debería tener al menos un test de integración que verifique el comportamiento.

5. **Área 5 — API documentation.** La documentación de API es importante para adopción externa, pero es la menos bloqueante para la estabilidad interna del código. Se puede empezar en paralelo con las otras áreas una vez que el tooling base esté funcionando, ya que `@hono/zod-openapi` no depende de que los errores estén centralizados ni de que no haya `any`.

### Cronograma estimado

| Área | Esfuerzo | Dependencias | Se puede paralelizar con |
|---|---|---|---|
| 2 · Tooling | 2-3 días | Ninguna | — |
| 4 · Errors | 3-4 días | Área 2 (ESLint + CI) | Área 3 (archivos distintos) |
| 3 · No any | 5-7 días | Área 2 (ESLint + CI) | Área 4 (archivos distintos) |
| 1 · Testing | 8-12 días | Área 2 (vitest + CI) | Áreas 3 y 4 parcialmente |
| 5 · API docs | 5-7 días | Área 2 (CI para build de docs) | Áreas 1, 3, 4 |

**Total estimado**: ~4-6 semanas con una persona full-time, o ~2-3 semanas con dos personas trabajando en áreas paralelizables.
