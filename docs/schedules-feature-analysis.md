# Análisis de la Feature de Schedules en OpenCode Manager

> Reporte generado el 2026-07-27 tras investigación del código fuente en `/workspace/repos/opencode-manager`.

---

## 1. Resumen General

La feature de **schedules** permite ejecutar tareas automatizadas de OpenCode (asistentes AI) en repositorios de forma periódica. Soporta dos modos de ejecución —**intervalo fijo** (cada N minutos) y **expresiones cron** (con timezone)— y gestiona todo el ciclo de vida: creación, ejecución, monitoreo, cancelación y recuperación ante caídas.

---

## 2. Arquitectura General

```
Frontend (React + Vite + Tailwind)
  ↕ API REST (Hono, puerto 5003)
Backend (Bun + Hono)
  ├─ ScheduleService   → lógica de negocio + DB (bun:sqlite)
  ├─ ScheduleRunner    → scheduler in-process (croner + setTimeout)
  └─ OpenCodeClient    → proxy HTTP al servidor OpenCode (puerto 5551)
       ↕
Servidor OpenCode (puerto 5551)
  ├─ POST /session              → crea sesión
  ├─ POST /session/{id}/message → envía prompt
  ├─ GET /session/{id}/message  → obtiene respuesta
  └─ POST /session/{id}/abort   → cancela ejecución
```

**No usa colas externas ni Redis.** Todo el scheduling es in-process usando la librería `croner` y `setTimeout`.

---

## 3. Base de Datos

### Tabla `schedule_jobs`

Creada por migración v7 (`007-schedules.ts`), alterada por v8 (`008-schedule-cron-support.ts`).

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | INTEGER | PK AUTOINCREMENT | Identificador único |
| `repo_id` | INTEGER | NOT NULL FK → repos(id) ON DELETE CASCADE | Repositorio objetivo |
| `name` | TEXT | NOT NULL | Nombre del schedule |
| `description` | TEXT | nullable | Descripción |
| `enabled` | BOOLEAN | NOT NULL DEFAULT TRUE (0/1) | Si está activo |
| `schedule_mode` | TEXT | NOT NULL DEFAULT 'interval' | `'interval'` o `'cron'` |
| `interval_minutes` | INTEGER | nullable (5–10080) | Intervalo en minutos |
| `cron_expression` | TEXT | nullable | Expresión cron |
| `timezone` | TEXT | nullable | IANA timezone (ej. `America/New_York`) |
| `agent_slug` | TEXT | nullable | Slug del agente OpenCode |
| `prompt` | TEXT | NOT NULL (max 20k chars) | Prompt a ejecutar |
| `model` | TEXT | nullable | `provider/model` |
| `skill_metadata` | TEXT | nullable | JSON: `{ skillSlugs: string[], notes?: string }` |
| `created_at` | INTEGER | NOT NULL | Epoch ms |
| `updated_at` | INTEGER | NOT NULL | Epoch ms |
| `last_run_at` | INTEGER | nullable | Epoch ms |
| `next_run_at` | INTEGER | nullable | Epoch ms |

**Índices:**
- `idx_schedule_jobs_repo` ON `schedule_jobs(repo_id)`
- `idx_schedule_jobs_next_run` ON `schedule_jobs(enabled, next_run_at)`

### Tabla `schedule_runs`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | INTEGER | PK AUTOINCREMENT | Identificador único |
| `job_id` | INTEGER | NOT NULL FK → schedule_jobs(id) ON DELETE CASCADE | Job padre |
| `repo_id` | INTEGER | NOT NULL FK → repos(id) ON DELETE CASCADE | Repositorio |
| `trigger_source` | TEXT | NOT NULL | `'manual'` o `'schedule'` |
| `status` | TEXT | NOT NULL | `'running'`, `'completed'`, `'failed'`, `'cancelled'` |
| `started_at` | INTEGER | NOT NULL | Epoch ms |
| `finished_at` | INTEGER | nullable | Epoch ms |
| `created_at` | INTEGER | NOT NULL | Epoch ms |
| `session_id` | TEXT | nullable | ID de sesión en OpenCode |
| `session_title` | TEXT | nullable | Título de la sesión |
| `log_text` | TEXT | nullable | Log de ejecución |
| `response_text` | TEXT | nullable | Output del asistente (markdown) |
| `error_text` | TEXT | nullable | Mensaje de error si falló |

**Índices:**
- `idx_schedule_runs_job` ON `schedule_runs(job_id, started_at DESC)`
- `idx_schedule_runs_repo` ON `schedule_runs(repo_id, started_at DESC)`

### Tabla `prompt_templates` (auxiliar)

Creada por migración v9.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `title` | TEXT NOT NULL | Título |
| `category` | TEXT NOT NULL | Categoría |
| `cadence_hint` | TEXT NOT NULL | Hint de cadencia |
| `suggested_name` | TEXT NOT NULL | Nombre sugerido |
| `suggested_description` | TEXT NOT NULL DEFAULT '' | Descripción sugerida |
| `description` | TEXT NOT NULL DEFAULT '' | Descripción |
| `prompt` | TEXT NOT NULL | Prompt template |
| `created_at` | INTEGER NOT NULL | Epoch ms |
| `updated_at` | INTEGER NOT NULL | Epoch ms |

---

## 4. API Endpoints

Montados en:
- **Pública**: `/api/repos/:id/schedules` (autenticación requerida)
- **Pública global**: `/api/schedules` (todos los repos)
- **Interna**: `/api/internal/repos/:id/schedules` (token interno)
- **Interna global**: `/api/internal/schedules`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/schedules` | Lista jobs de un repo |
| `GET` | `/schedules/all` | Lista todos los jobs (con repo info) |
| `POST` | `/schedules` | Crea un schedule job (201) |
| `GET` | `/schedules/:jobId` | Obtiene un job (o 404) |
| `PATCH` | `/schedules/:jobId` | Actualiza un job |
| `DELETE` | `/schedules/:jobId` | Elimina job + sus runs |
| `POST` | `/schedules/:jobId/run` | Ejecución manual |
| `GET` | `/schedules/:jobId/runs` | Lista runs de un job |
| `GET` | `/schedules/:jobId/runs/:runId` | Obtiene un run |
| `POST` | `/schedules/:jobId/runs/:runId/cancel` | Cancela un run |
| `GET` | `/schedules/all/runs` | Lista todos los runs (filtrado/paginado) |

Query params en `GET /schedules/all/runs`: `limit`, `offset`, `status`, `repoId`, `jobId`, `triggerSource`.

---

## 5. Flujo de Ejecución Detallado

### 5.1 Inicio del Servidor

1. Se instancia `ScheduleService` con la DB y `OpenCodeClient`.
2. Se instancia `ScheduleRunner` envolviendo `ScheduleService`.
3. `start()` ejecuta en orden:
   - **`cleanupOrphanedSchedules()`**: elimina schedules cuyos repos ya no existen.
   - **`recoverRunningRuns()`**: recupera runs en estado `'running'` tras un crash — verifica contra OpenCode si la sesión ya completó.
   - **`registerAllEnabledJobs()`**: registra todos los jobs habilitados en el runner (cron o interval handlers).

### 5.2 Registro de un Job

`ScheduleRunner.registerJob()`:
- **Modo cron**: usa `croner` con `protect: true` (evita solapamiento de ejecuciones).
- **Modo intervalo**: si los minutos se mapean limpiamente a cron (ej. `*/15 * * * *` para 15 min), usa `croner`. Si no, usa `setTimeout`/`setInterval` con banderas `isRunning`/`isStopped`.
- Se mantiene sincronizado con cambios en DB via `jobChangeHandler`.

### 5.3 Ejecución de un Job

`ScheduleService.runJob(repoId, jobId, triggerSource)`:

1. **Valida** que el repo y el job existan.
2. **Previene concurrencia**: usa un `Set<number>` estático `activeRuns` — si el job ya está corriendo, responde 409 Conflict.
3. **Crea registro** en `schedule_runs` con status `'running'`.
4. **Resuelve modelo** vía `resolveOpenCodeModel()` consultando al servidor OpenCode.
5. **Crea sesión** en OpenCode: `POST /session` con título `"Scheduled: {job.name}"` y agent slug.
6. **Crea monitor SSE** vía `sse-aggregator` para escuchar eventos de error/idle.
7. **Fire-and-forget**: llama `submitPromptAndMonitor()` sin await — el endpoint responde inmediatamente al cliente.

### 5.4 Envío y Monitoreo del Prompt

`submitPromptAndMonitor()`:
1. Si el job tiene `skill_metadata`, **enriquece el prompt**: obtiene skills de OpenCode (`GET /skill`) e inyecta contenido como bloques XML `<skill_content>`.
2. Envía el prompt: `POST /session/{sessionId}/message` con texto y modelo.
3. Si la respuesta es **síncrona** (incluye parts con texto), extrae el resultado y marca el run como `'completed'`.
4. Si es **asíncrona**, entra en `monitorRunCompletion()`:
   - **Polleo** cada 2 segundos (máx 5 min) a `GET /session/{sessionId}/message`.
   - Busca mensaje del assistant con `time.completed` o `error`.
   - También monitorea señales SSE (error, idle).
5. Al completar: actualiza `schedule_runs` (status, response, log, finished_at) y `schedule_jobs` (last_run_at, next_run_at calculado).
6. En fallo/timeout: marca como `'failed'`.
7. **Siempre limpia**: dispose del monitor y remueve del `activeRuns`.

### 5.5 Cancelación

`POST /schedules/:jobId/runs/:runId/cancel`:
1. Verifica que el run esté en `'running'`.
2. Si tiene sesión: consulta estado actual en OpenCode. Si ya completó/error, finaliza (recuperación). Si no, envía `POST /session/{sessionId}/abort`.
3. Marca run como `'cancelled'`.

### 5.6 Recuperación ante Caídas

`recoverRunningRuns()` al iniciar el servidor:
- Busca runs con status `'running'` que no estén en `activeRuns`.
- **Sin session ID**: marca como `'failed'`.
- **Con session ID**: consulta mensajes en OpenCode. Si completó/error, finaliza. Si está busy, re-adjunta monitor. Si idle sin completion, marca `'failed'`.

---

## 6. Schedule Runner (Cron / Worker)

Usa **scheduler in-process** (no external job queue):

| Aspecto | Detalle |
|---|---|
| **Librería** | `croner` |
| **Modo cron** | Directo con `Cron(cronExpression, { protect: true, timezone })` |
| **Modo intervalo** | `*/N * * * *` si mapea limpio; `setTimeout`/`setInterval` en caso contrario |
| **Guards** | `protect: true` de croner + `activeRuns` Set + `isRunning`/`isStopped` flags |
| **Lifecycle** | `start()` → registra todos → `registerJob()` / `unregisterJob()` → `stop()` limpia todo |

---

## 7. Frontend

### Jerarquía de Componentes

```
GlobalSchedules (/schedules)
├── ScheduleJobDialog (crear/editar)
│   ├── GeneralTab (nombre, descripción, agente, modelo, enabled)
│   ├── TimingTab (presets / cron builder / intervalo)
│   ├── PromptTab (editor + template picker)
│   └── SkillsTab (MultiSelect + notes)
├── RunHistoryCards
│   └── RunDetailPanel (Log / Output / Error tabs)
│       └── ScheduleRunMarkdown (react-markdown)
├── PromptsTab + PromptTemplateDialog (gestión de plantillas)
└── Tabs (Jobs / Run History / Prompts)

Schedules (/repos/:id/schedules)
├── JobsTab (lista de jobs del repo)
├── JobDetailTab (detalle del job)
├── RunHistoryTab (layout 2 paneles: cards + detalle)
├── ScheduleTabMenu (navegación móvil)
└── ScheduleJobDialog (reutilizado)
```

### Hooks Principales

| Hook | Propósito |
|---|---|
| `useSchedules()` | Queries y mutations con React Query (CRUD, run, cancel) |
| `useScheduleUrlState()` | Estado vía URL params (tab, diálogos, jobId, runId) |
| `useScheduleTarget()` | Resuelve target (repo vs assistant) |

### API Layer

`frontend/src/api/schedules.ts` — todas las llamadas fetch hacia los endpoints REST.

---

## 8. Integración con OpenCode Server (puerto 5551)

A través de `OpenCodeClient`:

| OpenCode Endpoint | Uso |
|---|---|
| `POST /session` | Crear sesión por cada schedule run |
| `POST /session/{id}/message` | Enviar prompt al asistente |
| `GET /session/{id}/message` | Polling de respuesta del asistente |
| `GET /session/status` | Obtener status de todas las sesiones (recuperación) |
| `POST /session/{id}/abort` | Abortar sesión (cancelación) |
| `GET /skill` | Obtener skills disponibles (enriquecimiento de prompt) |

Además, el **SSE Aggregator** (`sse-aggregator.ts`) permite escuchar eventos en tiempo real para detectar errores y estado idle sin polling.

---

## 9. Archivos Relevantes

### Backend

| Archivo | Rol |
|---|---|
| `backend/src/services/schedules.ts` | ScheduleService + ScheduleRunner |
| `backend/src/services/schedule-config.ts` | Helpers de configuración (build inputs, next run, normalización) |
| `backend/src/db/schedules.ts` | Queries DB (CRUD de jobs y runs) |
| `backend/src/db/migrations/007-schedules.ts` | Migración v7 (tablas iniciales) |
| `backend/src/db/migrations/008-schedule-cron-support.ts` | Migración v8 (soporte cron) |
| `backend/src/routes/schedules.ts` | Rutas Hono |
| `backend/src/routes/repos.ts` | Monta rutas de schedules |
| `backend/src/index.ts` | Bootstrap de ScheduleService y ScheduleRunner |

### Shared

| Archivo | Rol |
|---|---|
| `shared/src/schemas/schedule.ts` | Todos los tipos Zod y TypeScript |

### Frontend

| Archivo | Rol |
|---|---|
| `frontend/src/api/schedules.ts` | Llamadas fetch |
| `frontend/src/hooks/useSchedules.ts` | React Query hooks |
| `frontend/src/hooks/useScheduleUrlState.ts` | URL state management |
| `frontend/src/hooks/useScheduleTarget.ts` | Resolución de target |
| `frontend/src/pages/Schedules.tsx` | Página por repo |
| `frontend/src/pages/GlobalSchedules.tsx` | Página global |
| `frontend/src/components/schedules/` | ~15 componentes |

### Tests

| Archivo | Líneas | Cobertura |
|---|---|---|
| `backend/test/services/schedules.test.ts` | ~1185 | Service + Runner integración |
| `backend/test/db/schedules.test.ts` | ~547 | Queries DB |
| `backend/test/routes/schedules.test.ts` | — | Rutas (CRUD, run, cancel) |
| `backend/test/routes/internal-schedules.test.ts` | — | API interna + auth |
| `backend/test/services/schedule-config.test.ts` | — | Helpers de configuración |
| `backend/test/db/schedules-assistant.test.ts` | — | Assistant-specific |
| `backend/test/db/schedule-migrations.test.ts` | — | Migraciones |
| `frontend/src/hooks/__tests__/useScheduleUrlState.test.tsx` | ~446 | URL state |
| `frontend/src/components/schedules/ScheduleJobDialog.assistant.test.tsx` | — | Dialog assistant |
| `frontend/src/lib/schedules/schedule-target.test.ts` | — | Target resolution |
| `frontend/src/pages/__tests__/Schedules.test.tsx` | — | Página schedules |
| `frontend/src/hooks/__tests__/useScheduleTarget.test.tsx` | — | Hook target |

---

## 10. Dependencias Clave

| Librería | Ámbito | Uso |
|---|---|---|
| `croner` | Backend | Scheduling con expresiones cron |
| `cronstrue` | Frontend | Descripción legible de cron |
| `date-fns` | Frontend | Formateo de fechas |
| `react-markdown` + `rehype-highlight` + `remark-gfm` | Frontend | Renderizado de output del asistente |
| `@tanstack/react-query` | Frontend | Estado de servidor |
| `zod` | Ambos | Validación de schemas |
| `lucide-react` | Frontend | Iconos |

---

## 11. Puntos Clave de Diseño

- **Sin cola externa**: todo corre in-process. Riesgo en deployments con múltiples réplicas (cada réplica ejecutaría los mismos jobs).
- **Fire-and-forget**: la creación de un run responde inmediatamente; el monitoreo es asíncrono.
- **Prevención de concurrencia**: `activeRuns` Set en memoria evita que un mismo job se ejecute en paralelo.
- **Recuperación ante crashes**: `recoverRunningRuns()` al reiniciar el servidor.
- **Skills injection**: los prompts pueden enriquecerse automáticamente con contenido de skills configurados.
- **Modos de timing**: intervalo (5 min a 7 días) y cron expression con timezone IANA.
- **Prompt templates**: sistema de plantillas reutilizables con categorías y cadencia sugerida.

---

## 12. Posibles Mejoras / Riesgos

| Aspecto | Riesgo / Mejora |
|---|---|
| **Alta disponibilidad** | Scheduler in-process → si hay múltiples réplicas, todas ejecutan los mismos jobs. Migrar a cola externa (Bull, Redis) o usar locks distributivos. |
| **Persistencia de `activeRuns`** | Set en memoria → se pierde en reinicio, aunque `recoverRunningRuns()` lo mitiga parcialmente. |
| **Timeout fijo de 5 min** | Si el asistente tarda más de 5 min en responder, el run se marca como fallido aunque pueda completar después. |
| **Sin retry automático** | Si un run falla, no hay reintento automático — depende del próximo ciclo del schedule. |
| **Monitoreo SSE vs polling** | Mezcla ambos — el polling cada 2s es aceptable pero podría optimizarse con más eventos SSE. |
