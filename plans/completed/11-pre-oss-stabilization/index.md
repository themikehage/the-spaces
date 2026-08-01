# Plan 11 — Pre-OSS Stabilization

## Objetivo

Antes de publicar Spaces como open source, estabilizar el **Core** (robusto, extensible, mantenible), eliminar regresiones introducidas por los refactors de los planes 07–10, y reducir duplicación y acoplamiento en backend y frontend.

Este plan **no** añade features de producto. Solo corrige verdad de contratos, regresiones, seguridad mínima de self-host, y deuda estructural que impide un Core creíble.

## Origen

Auditoría completa del repositorio (backend, frontend, packages/shared, spaces-sdk, seguridad, CI, hotspots estructurales) tras marcar completados los planes 07–10. Hallazgos priorizados en 20 áreas; este plan las ejecuta en **8 hitos** ordenados por criticidad y dependencias.

## Principios de ejecución

1. **Un hito a la vez.** Cada archivo de hito se escribe, se confirma, y solo entonces se implementa o se redacta el siguiente.
2. **Justificación obligatoria.** Cada ajuste declara _por qué_, _archivos_, _efectos secundarios_ y _criterio de hecho_.
3. **No fingir arquitectura.** Si DI/SDK/contratos no están cableados de verdad, o se cablean o se deja de documentarlos como hechos.
4. **Regresiones primero.** Cualquier bug introducido por un refactor reciente tiene prioridad sobre cleanup cosmético.
5. **Verificación.** Cada hito debe poder validarse con typecheck/build y, donde aplique, tests nuevos o ampliados.
6. **Fuera de alcance de este plan:** features nuevas, rediseño visual, multi-tenant SaaS completo, reescritura del vendor AI.

## Mapa de hitos

| #   | Archivo                                                            | Título                                                                                               | Criticidad            | Depende de                                  |
| --- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------- |
| 01  | [01-session-create-semantics.md](./01-session-create-semantics.md) | Restaurar semántica de `POST /api/sessions` (teams/project) y eliminar handlers duplicados           | P0 regresión          | —                                           |
| 02  | _(pendiente de confirmación del 01)_                               | Congelar contrato WebSocket + bugs de nombres + filtro por sesión en client                          | P0 contrato/regresión | 01 recomendado (menos ruido al probar chat) |
| 03  | _(pendiente)_                                                      | Unificar Attention Hub / approvals en un solo store y resolve path                                   | P0 producto           | 02 (eventos WS tipados)                     |
| 04  | _(pendiente)_                                                      | Hardening seguridad mínima OSS (tokens en bash, zip-slip, CORS fail-closed)                          | P0 seguridad          | — (puede paralelizarse tras 01)             |
| 05  | _(pendiente)_                                                      | Un path de bootstrap de runtime + catálogo único `TOOL_GROUPS`                                       | P0 core               | 01 (create usa runtime)                     |
| 06  | _(pendiente)_                                                      | DI real (`ServerContext`) o dejar de documentarlo; encapsular `AgentSession`; cortar bridges core↔WS | P1 core               | 05                                          |
| 07  | _(pendiente)_                                                      | Terminar split de rutas god + factory-tool vs REST + bajar god components client                     | P1 mantenibilidad     | 01, 06                                      |
| 08  | _(pendiente)_                                                      | Verdad de packaging/docs/CI (SDK, release, self-host, tests que fallen el CI, channel leftovers)     | P1 OSS                | — (docs al final para no reescribir)        |

## Relación con las 20 áreas de la auditoría

| Áreas auditoría                                                                  | Hito |
| -------------------------------------------------------------------------------- | ---- |
| #1 Session create teams roto                                                     | 01   |
| #3 WS contract, #4 Chat multi-session bleed                                      | 02   |
| #5 Approvals triple path                                                         | 03   |
| #7 Bash+JWT, #8 Zip-slip+CORS (+ parte #18 preview/token JSON si cabe)           | 04   |
| #6 Runtime ×4, #10 TOOL_GROUPS dual, #13 tools dual (inicio)                     | 05   |
| #2 DI falso, #12 AgentSession private API, #14 core↔WS                           | 06   |
| #11 God files, #16 dual chat (parcial), #17 factory vs REST                      | 07   |
| #9 SDK/release, #15 FE tests/CI, #18 self-host, #19 errors/any, #20 docs/channel | 08   |

## Estado

- [x] 01 — Session create semantics _(texto aprobado — implementación pendiente de ejecución)_
- [x] 02 — WS contract freeze _(texto aprobado — implementación pendiente de ejecución)_
- [x] 03 — Attention unification _(texto aprobado — implementación pendiente de ejecución)_
- [x] 04 — Security minimum _(texto aprobado — implementación pendiente de ejecución)_
- [x] 05 — Runtime + tool catalog _(texto aprobado — implementación pendiente de ejecución)_
- [x] 06 — DI + encapsulation _(texto aprobado — implementación pendiente de ejecución)_
- [x] 07 — Route/UI decomposition _(texto aprobado — implementación pendiente de ejecución)_
- [x] 08 — OSS packaging & docs truth _(texto aprobado — implementación pendiente de ejecución)_

## Cómo usar esta carpeta

1. Leer y confirmar el hito N.
2. Implementar solo el hito N (o pedir ajustes al texto).
3. Marcar checkboxes del hito y del index.
4. Pedir redacción del hito N+1.

No implementar hitos futuros “de paso” salvo dependencias mínimas explícitas en el hito activo.
