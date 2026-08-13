# Plan 38 — Análisis del Reporte de Estrés de Delegaciones (acciones priorizadas)

**Estado:** 🔜 Pendiente de implementar — análisis aprobado

## Contexto

Revisión del *Reporte de Estrés — Sistema de Delegaciones* (2026-08-13, 15 delegaciones) con dos decisiones de diseño confirmadas por el equipo:
1. **Workspace compartido** delegado↔delegador es **por diseño** (trabajo conjunto).
2. **Anidación de delegaciones** no soportada **por diseño**; existe config `subagentMaxDepth` (default 1).

## Hallazgos reclasificados tras las decisiones de diseño

### Por diseño (no son bugs)
- **F5 — Workspace compartido:** el delegado lee/escribe el workspace del padre a propósito. Falta **documentarlo** en la doc del agente para no inducir a error. Si algún día se quieren agentes no confiables, sería un opt-in de aislamiento, no el default.
- **F4 — Anidación imposible:** correcto que no se soporta, PERO el `maxDepth` actual es **inefectivo** (matiz crítico):
  - `maxDepth` solo es un gate defensivo en `manage-delegations.tool.ts:128-141` (y legacy `spawn-subagent.ts:50-60`).
  - En paralelo, `manage_delegations` tiene deny **hardcodeado** para subagentes: `subagent-permissions.ts:28` + `excludedTools:53`, y el bootstrap **filtra** esos tools del set activo (`agent-runtime.ts:336-347`).
  - Consecuencia: subir `subagentMaxDepth` (Settings/`SPACES_SUBAGENT_MAX_DEPTH`, `config/app-config.ts`) **nunca habilita anidación**, porque el tool se excluye del toolset del subagente por defecto.
  - **Decisión requerida:** (a) hacer la exclusión condicional al depth (permitir `manage_delegations` cuando `depth < maxDepth`), o (b) eliminar la config engañosa y documentar "no anidación: usar teams/workflows".

### Bugs confirmados (a corregir)

**F1 (P0) — Target inexistente: false success + error asíncrono tardío**
- La validación de `targetId` ocurre dentro de `runPromise` NO awaitado (`manage-delegations.tool.ts:459-472` → lanzado en `:469`, disparado en `:759`), por lo que `execute()` responde "Delegation started" antes de conocer el fallo.
- Fix: validar síncronamente en `execute()` antes de despachar — agente vía `activeAgentRegistry.get`, team vía `teamStore.getTeam`, project/equipo — y unificar formato de error (envelope `{status, executive_summary,...}`, no `[Delegation blocked]` en texto plano).

**F2 (P1) — Tarea vacía sin validar**
- `task` con solo espacios no se rechaza a nivel plataforma; se crea sesión y se gastan tokens.
- Fix: validar `task.trim().length` con mínimo en `execute()` antes de crear la sesión.

**F3 (P0) — `write` en modo `standard`: ~160s y reintentos (no deadlock, pero inviable)**
- Causa raíz: permiso `write` en `standard`/`builder` = `"ask"` → `approvalManager.request` espera a un humano (`approval-manager.ts:35`, timeout 60s → deny) → reintento (2 errores, 4 toolcalls) → ~160s. Un delegado es **headless**: no puede esperar aprobación humana.
- Opciones de fix:
  - (a) Default `autonomous` para delegates sin modo explícito (probado: escribe limpio y rápido).
  - (b) Auto-resolver el `"ask"` de subagentes según permisos del padre (conecta con **plan 34** — herencia de permisos).
  - (c) Documentar el workaround `autonomyMode: "autonomous"` mientras tanto.
- Con workspace compartido (por diseño), `write` es operación core → `ask` por default es contraintuitivo para delegados.

## Brechas de observabilidad/usabilidad

- **O1/O2/O3 — Sin recuperación síncrona ni señal de progreso:** cubierto por **plan 37** (`manage_delegations action:"status"` → estado + último texto + tokens + duración, sin bootstrappear). Añadir `timeoutMs` opcional por delegación para notificar tareas colgadas.
- **O4 — Contrato `agents` limitado:** no expone `model` ni `executionMode` (hoy todo "default"). Prioridad baja.
- **O5 — Validación de parámetros:** derivada de F1/F2.

## Comportamiento a documentar (no bugs)

- Sin locking por agente (delegaciones = sesiones independientes; alto throughput, sin memoria compartida).
- Latencia ∝ tamaño de system prompt/skills.
- Envelope no forzado: si se quiere encadenamiento programático, parámetro opcional para exigir el `result envelope`.

## Acciones priorizadas

| # | Acción | Prioridad | Plan |
|---|---|---|---|
| A1 | Validación síncrona de `targetId` + formato de error envelope | P0 | nuevo |
| A2 | Validación `task` no vacía (trim + mínimo) | P1 | nuevo |
| A3 | Default de aprobación headless para delegados (autonomous o auto-resolver "ask" vía permisos del padre) | P0 | plan 34 |
| A4 | Decidir anidación: exclusión condicional al depth o eliminar config engañosa + documentar | P1 | nuevo |
| A5 | Acción `status` con estado, progreso, tokens y duración (+ `timeoutMs`) | P1 | plan 37 |
| A6 | Exponer `model`/`executionMode` en contrato `agents` | P2 | nuevo |
| A7 | Documentar workspace compartido (F5) y comportamiento esperado | P3 | docs |

## Archivos implicados

- `apps/server/src/core/tools/extensions/manage-delegations.tool.ts`
- `apps/server/src/core/delegation/delegation-registry.ts`
- `apps/server/src/core/session/spawn-subagent.ts`
- `apps/server/src/core/sandbox/subagent-permissions.ts`
- `apps/server/src/core/session/agent-runtime.ts`
- `apps/server/src/config/app-config.ts`
- `apps/server/src/core/approvals/approval-manager.ts`
- `apps/server/src/routes/agents.ts` (contrato)
- `packages/shared/src/agent-capabilities.ts` (contrato)