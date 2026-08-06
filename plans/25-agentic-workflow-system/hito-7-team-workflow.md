# Hito 25.7 — Team Workflow Declarativo

**Estado:** 📋 Planificado  
**Dependencias:** Hito 25.3 (WorkflowEngine), Hito 25.4 (AgentDirectory)  
**Desbloquea:** Gallery de equipos que resuelven problemas concretos

---

## Objetivo

Asociar un `WorkflowDefinition` a un `Team` para que el equipo tenga un flujo de trabajo predefinido que sus miembros ejecutan de forma coordinada. Esto materializa el concepto de "equipo" de ser un grupo estático a ser un **sistema de agentes con proceso definido**.

---

## Diagnóstico — Estado actual

### Lo que SÍ existe

| Aspecto             | Estado | Detalle                                                         |
| ------------------- | ------ | --------------------------------------------------------------- |
| Team CRUD           | OK     | `agentId` (líder) + `memberIds` + `teamType: "Orchestration"`   |
| `TeamDirectoryPort` | OK     | `getTeamDef(teamId)` → `{ name, leaderId, memberIds }`          |
| Workspace de equipo | OK     | `getTeamWorkspaceDir(username, teamId)` — directorio compartido |
| Delegación a equipo | OK     | `manage_delegations` con `targetType: "team"` — delega al líder |
| `TeamDetailPage`    | OK     | UI con settings, miembros y sesiones del equipo                 |

### Lo que NO existe

| Gap                                                        | Impacto                                                             | Ubicación                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------- |
| `Team.workflowId`                                          | Un team no puede tener un workflow asociado                         | `packages/shared/src/schemas.ts`             |
| `TeamWorkflowRunner`                                       | No hay forma de ejecutar el workflow de un equipo con sus miembros  | (no existe)                                  |
| Tipos de equipo declarativos                               | `teamType: "Orchestration"` es el único tipo con semántica especial | `packages/shared`                            |
| UI `TeamWorkflowTab`                                       | No hay pestaña de workflow en `TeamDetailPage`                      | `apps/client`                                |
| Tool `run_team_workflow`                                   | El agente global no puede ejecutar el workflow de un equipo         | (no existe)                                  |
| Scope `{ type: "team", entityId }` en `WorkflowDefinition` | Los workflows de equipo no están diferenciados de los globales      | (Hito 25.3 lo define pero no lo usa el Team) |

---

## Diseño

### 1. Tipos de equipo con semántica de workflow

```typescript
// packages/shared/src/schemas.ts

export const TeamTypeSchema = z.enum([
  "Orchestration", // Líder coordina ad-hoc (existente)
  "Pipeline", // Steps secuenciales A → B → C (nuevo)
  "HubAndSpoke", // Líder distribuye tareas a miembros en paralelo (nuevo)
  "RoundRobin", // Distribución rotatoria equitativa (nuevo)
  "Custom", // Workflow declarativo personalizado (nuevo — usa WorkflowDefinition)
]);

export const TeamSchema = z.object({
  // ... campos existentes ...
  teamType: TeamTypeSchema.default("Orchestration"),
  /** ID del workflow asociado (solo cuando teamType === "Custom") */
  workflowId: z.string().optional(),
  /**
   * Configuración integrada para tipos built-in (Pipeline, HubAndSpoke, RoundRobin)
   * Describe el orden/distribución de los miembros
   */
  workflowConfig: z
    .object({
      /** Para Pipeline: orden de ejecución de los miembros */
      memberOrder: z.array(z.string()).optional(),
      /** Para HubAndSpoke: si true, el líder agrega los resultados */
      aggregateResults: z.boolean().optional().default(true),
      /** Para RoundRobin: estrategia de distribución */
      distributionStrategy: z.enum(["round-robin", "load-based"]).optional().default("round-robin"),
    })
    .optional(),
});
```

### 2. `TeamWorkflowRunner` — genera y ejecuta el workflow del equipo

```typescript
// core/workflows/team-workflow-runner.ts

export class TeamWorkflowRunner {
  constructor(
    private workflowEngine: IWorkflowEngine,
    private teamDirectory: TeamDirectoryPort,
    private agentDirectory: AgentDirectoryPort,
  ) {}

  /**
   * Para equipos con workflow built-in (Pipeline, HubAndSpoke, RoundRobin):
   * genera dinámicamente un WorkflowDefinition basado en la config del equipo.
   * Para equipos Custom: usa el workflowId definido en el equipo.
   */
  async runTeamWorkflow(
    username: string,
    teamId: string,
    task: string,
    opts?: { inputs?: Record<string, unknown>; parentSessionId?: string },
  ): Promise<WorkflowRun> {
    const team = await this.teamDirectory.getTeamDef(teamId);
    if (!team) throw new Error(`Team ${teamId} not found`);

    const teamRecord = teamStore.getTeam(username, teamId);

    let workflowId: string;

    if (teamRecord.teamType === "Custom" && teamRecord.workflowId) {
      workflowId = teamRecord.workflowId;
    } else {
      // Generar workflow dinámico para tipos built-in
      const generatedDef = await this.generateWorkflowForTeam(username, teamRecord, task);
      const saved = await this.workflowEngine.save(username, generatedDef);
      workflowId = saved.id;
    }

    return this.workflowEngine.run(username, workflowId, {
      inputs: { task, ...opts?.inputs },
      parentSessionId: opts?.parentSessionId,
    });
  }

  private async generateWorkflowForTeam(
    username: string,
    team: Team,
    task: string,
  ): Promise<WorkflowDefinition> {
    const memberOrder = team.workflowConfig?.memberOrder ?? team.members.map((m) => m.agentId);

    switch (team.teamType) {
      case "Pipeline":
        return this.generatePipelineWorkflow(username, team, memberOrder, task);
      case "HubAndSpoke":
        return this.generateHubAndSpokeWorkflow(username, team, task);
      case "RoundRobin":
        return this.generateRoundRobinWorkflow(username, team, task);
      default:
        throw new Error(`Unsupported team type for workflow generation: ${team.teamType}`);
    }
  }

  private generatePipelineWorkflow(
    username: string,
    team: Team,
    memberOrder: string[],
    task: string,
  ): WorkflowDefinition {
    const steps: WorkflowStep[] = memberOrder.map((agentId, index) => ({
      id: `step-${agentId}`,
      type: "agent",
      label: `Step ${index + 1}: ${agentId}`,
      agentId,
      dependsOn: index > 0 ? [`step-${memberOrder[index - 1]}`] : [],
      taskTemplate:
        index === 0
          ? task
          : `Continua donde lo dejó el agente anterior. Tarea original: ${task}\nResultado previo: {{step-${memberOrder[index - 1]}.summary}}`,
      captureOutputs: ["summary", "artifacts"],
    }));

    return {
      id: `team-pipeline-${team.id}-${Date.now()}`,
      name: `${team.name} — Pipeline`,
      scope: { type: "team", entityId: team.id },
      steps,
      onError: "stop",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private generateHubAndSpokeWorkflow(
    username: string,
    team: Team,
    task: string,
  ): WorkflowDefinition {
    const members = team.members.filter((m) => m.role !== "lead");
    const leadId = team.members.find((m) => m.role === "lead")?.agentId;

    const parallelSteps: WorkflowStep[] = members.map((m) => ({
      id: `spoke-${m.agentId}`,
      type: "agent",
      label: m.agentId,
      agentId: m.agentId,
      taskTemplate: task,
      captureOutputs: ["summary"],
    }));

    const aggregateStep: WorkflowStep | null = leadId
      ? {
          id: "aggregate",
          type: "agent",
          label: "Líder — Agregación",
          agentId: leadId,
          dependsOn: parallelSteps.map((s) => s.id),
          taskTemplate: `Agrega y sintetiza los resultados de tu equipo. Tarea original: ${task}\n${members.map((m) => `${m.agentId}: {{spoke-${m.agentId}.summary}}`).join("\n")}`,
        }
      : null;

    return {
      id: `team-hub-spoke-${team.id}-${Date.now()}`,
      name: `${team.name} — Hub & Spoke`,
      scope: { type: "team", entityId: team.id },
      steps: [...parallelSteps, ...(aggregateStep ? [aggregateStep] : [])],
      onError: "continue",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
```

### 3. Tool `run_team_workflow`

```typescript
// core/tools/extensions/workflow.tool.ts — agregar:

{
  name: "run_team_workflow",
  description: `Ejecuta el workflow de un equipo. El tipo del equipo determina cómo se coordinan los agentes:
- Pipeline: los agentes ejecutan en secuencia, cada uno recibe el output del anterior
- HubAndSpoke: los agentes ejecutan en paralelo, el líder agrega los resultados
- RoundRobin: las subtareas se distribuyen entre los miembros de forma rotatoria
- Custom: ejecuta el workflow declarativo asociado al equipo`,
  parameters: {
    type: "object",
    properties: {
      teamId: { type: "string", description: "ID del equipo" },
      task: { type: "string", description: "Tarea o contexto para el equipo" },
      inputs: { type: "object", description: "Inputs adicionales opcionales" },
    },
    required: ["teamId", "task"],
  },
  execute: async (_id, args) => {
    const run = await teamWorkflowRunner.runTeamWorkflow(
      opts.username,
      args.teamId,
      args.task,
      { inputs: args.inputs, parentSessionId: opts.sessionId }
    );
    return {
      content: [{ type: "text", text: `Workflow del equipo iniciado. Run ID: ${run.id}` }],
      details: { run },
    };
  },
},
```

### 4. UI — `TeamWorkflowTab` en `TeamDetailPage`

```
TeamDetailPage
├── MembersTab (existente)
├── SessionsTab (existente)
├── SettingsTab (existente)
└── WorkflowTab (nuevo)
    ├── TeamTypeSelector        ← Orchestration / Pipeline / HubAndSpoke / RoundRobin / Custom
    ├── MemberOrderEditor       ← drag-and-drop para Pipeline
    ├── WorkflowSelector        ← si teamType === "Custom", selecciona WorkflowDefinition
    ├── RunWorkflowButton       ← ejecuta el workflow con una tarea
    └── WorkflowRunHistory      ← historial de ejecuciones del equipo
```

---

## Archivos afectados

| Archivo                                                 | Operación | Descripción                                                                |
| ------------------------------------------------------- | --------- | -------------------------------------------------------------------------- |
| `packages/shared/src/schemas.ts`                        | MODIFY    | Extender `TeamSchema` con `workflowId`, `workflowConfig`, `TeamTypeSchema` |
| `core/workflows/team-workflow-runner.ts`                | NEW       | `TeamWorkflowRunner` — generador de workflows para equipos built-in        |
| `core/tools/extensions/workflow.tool.ts`                | MODIFY    | Agregar `run_team_workflow`                                                |
| `apps/server/src/routes/teams/`                         | MODIFY    | `POST /api/teams/:id/workflow/run`                                         |
| `apps/client/src/pages/TeamDetailPage.tsx`              | MODIFY    | Agregar `WorkflowTab`                                                      |
| `apps/client/src/components/teams/TeamWorkflowTab.tsx`  | NEW       | UI de configuración y ejecución del workflow de equipo                     |
| `apps/client/src/components/teams/TeamTypeSelector.tsx` | NEW       | Selector de tipo de equipo con descripción visual                          |

---

## Criterio de aceptación

- [ ] Un equipo de tipo `"Pipeline"` con 3 miembros ejecuta los agentes en orden correcto
- [ ] Un equipo de tipo `"HubAndSpoke"` con 3 miembros ejecuta los 3 en paralelo y el líder agrega
- [ ] Un equipo de tipo `"Custom"` usa el `WorkflowDefinition` asociado
- [ ] `run_team_workflow` tool funciona desde el agente global
- [ ] `TeamWorkflowTab` permite seleccionar el tipo y configurar el workflow
- [ ] `WorkflowRunHistory` en el tab muestra el historial de ejecuciones del equipo
- [ ] `pnpm --filter server run typecheck` → 0 errores

---

## Estimación

**2-3 días.** El `TeamWorkflowRunner` es la pieza más compleja. La UI del `TeamWorkflowTab` puede entregarse en una versión básica (sin drag-and-drop) en el primer corte.
