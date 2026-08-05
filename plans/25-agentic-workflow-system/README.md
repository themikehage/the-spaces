# Plan 25 — Agentic Workflow System

> Habilitar la construcción de flujos de trabajo agenticos completos y sistemas de agentes que resuelvan problemas reales, manteniendo el desacoplamiento y la extensibilidad del sistema actual.

---

## Contexto

Spaces tiene una arquitectura sólida para orquestación de agentes: puertos desacoplados (`IAgentRuntime`, `ISessionManager`, `DelegationPort`, `ApprovalPort`), un sistema de delegaciones funcional (`spawn` + `delegate`), custom tools con pipelines y un SDK público (`SpacesAgent` + `SpacesRunner`). Lo que falta es la **capa declarativa** encima de esa infraestructura: poder definir, ejecutar y observar sistemas de agentes sin escribir código.

## Diagnóstico de Gaps

| Gap | Descripción | Criticidad |
|-----|-------------|------------|
| [GAP-1](#) | No hay WorkflowEngine ni DAG de agentes | 🔴 Crítico |
| [GAP-2](#) | Custom tools no pueden spawnar subagentes | 🔴 Crítico |
| [GAP-3](#) | Teams no tienen workflow declarativo | 🟡 Importante |
| [GAP-4](#) | AgentDirectory sin listAgents() ni capacidades | 🟡 Importante |
| [GAP-5](#) | EnvelopeResult sin outputs tipados | 🔴 Crítico |
| [GAP-6](#) | No hay checkpoint de aprobación humana en workflows | 🟡 Importante |
| [GAP-7](#) | Observabilidad no muestra árbol completo | 🟡 Importante |

## Hitos

| Hito | Archivo | Qué resuelve | Esfuerzo | Prioridad |
|------|---------|--------------|----------|-----------|
| [25.1](./hito-1-envelope-outputs.md) | Outputs tipados en `EnvelopeResult` | GAP-5 | 🟢 Bajo | 🔴 P0 |
| [25.2](./hito-2-agent-tool-type.md) | Custom tool type `"agent"` | GAP-2 | 🟡 Medio | 🔴 P0 |
| [25.3](./hito-3-workflow-engine.md) | `WorkflowDefinition` + `WorkflowEngine` | GAP-1 | 🔴 Alto | 🔴 P0 |
| [25.4](./hito-4-agent-directory.md) | `AgentDirectory` con capacidades + tool | GAP-4 | 🟡 Medio | 🟡 P1 |
| [25.5](./hito-5-approval-checkpoint.md) | Approval checkpoint en workflow steps | GAP-6 | 🟡 Medio | 🟡 P1 |
| [25.6](./hito-6-workflow-trace.md) | WorkflowTrace + UI árbol de ejecución | GAP-7 | 🟡 Medio | 🟡 P1 |
| [25.7](./hito-7-team-workflow.md) | Team Workflow declarativo | GAP-3 | 🔴 Alto | 🟢 P2 |

## Principios de Diseño

1. **Desacoplamiento estricto:** todo acceso a workflows via `SpacesHost.workflows` (nuevo puerto `IWorkflowEngine`) — nunca import directo.
2. **Contratos en shared:** `WorkflowDefinition`, `WorkflowStep`, `WorkflowRun` viven en `packages/shared`.
3. **Backwards compatibility:** cada hito deja el sistema funcionando. `manage_delegations` no se elimina.
4. **Runtime === IAgentRuntime:** el `WorkflowEngine` no ejecuta código de agente — delega a `IAgentRuntime` existente.
5. **UI-first en observabilidad:** cada estado de workflow emite eventos WS que el cliente puede consumir.

## Verificación Global

Al completar todos los hitos:
- `pnpm --filter server run typecheck` → 0 errores
- `pnpm build` → 0 errores
- Un workflow de 3 agentes en secuencia ejecuta end-to-end con outputs tipados entre pasos
- El agente global puede listar workflows disponibles y ejecutarlos via tool call
