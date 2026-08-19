# Hito 25.4 — AgentDirectory con Capacidades

**Estado:** 📋 Planificado  
**Dependencias:** ninguna (paralelo a 25.1/25.2)  
**Desbloquea:** Routing inteligente en 25.3

---

## Objetivo

Extender `AgentDirectoryPort` para que el agente global pueda conocer los agentes disponibles, sus capacidades (tools activas, modelo, skills), y su estado (activo/libre). Esto habilita el routing inteligente en el `WorkflowEngine` y permite que el agente global seleccione el agente más apropiado para cada tarea.

---

## Diagnóstico — Estado actual

### Lo que SÍ existe

| Aspecto                                   | Estado | Detalle                                             |
| ----------------------------------------- | ------ | --------------------------------------------------- |
| `AgentDirectoryPort`                      | OK     | `getAgentDef(agentId)` → `{ name, systemPrompt }`   |
| `agentRegistry` en server                 | OK     | `apps/server/src/agents/index.ts` — CRUD de agentes |
| `scopeConfigManager.resolveToolsForAgent` | OK     | Resuelve tools activas por agente                   |
| `ISessionManager.getSession`              | OK     | Permite saber si un agente tiene sesión activa      |
| `EntityConfig` por agente                 | OK     | Modelo, skills, tools, rules por entidad            |

### Lo que NO existe

| Gap                                           | Impacto                                                      | Ubicación                        |
| --------------------------------------------- | ------------------------------------------------------------ | -------------------------------- |
| `AgentDirectoryPort.listAgents()`             | El agente global no puede descubrir agentes disponibles      | `core/ports/spaces-host.port.ts` |
| `AgentDirectoryPort.getAgentCapabilities(id)` | No hay info estructurada de tools/modelo por agente          | `core/ports/spaces-host.port.ts` |
| Tool `list_available_agents`                  | El agente global no puede listar agentes via tool call       | (no existe)                      |
| `AgentStatus` (ocupado/libre)                 | No hay forma de saber si un agente está procesando una tarea | (no existe)                      |

---

## Diseño

### 1. Extensión de `AgentDirectoryPort`

```typescript
// core/ports/spaces-host.port.ts

export interface AgentCapabilities {
  model?: { provider: string; modelId: string };
  activeTools: string[];
  skills: string[];
  tags?: string[];
  description?: string;
}

export interface AgentStatus {
  agentId: string;
  name: string;
  isActive: boolean; // Tiene sesión activa en este momento
  activeSessions: number; // Número de sesiones activas
  capabilities: AgentCapabilities;
}

export interface AgentDirectoryPort {
  /** Obtiene la definición básica de un agente */
  getAgentDef(agentId: string): Promise<{ name: string; systemPrompt: string } | null>;

  /** Lista todos los agentes disponibles para el usuario */
  listAgents(
    username: string,
    filter?: {
      tags?: string[];
      hasCapability?: string;
    },
  ): Promise<AgentStatus[]>;

  /** Obtiene las capacidades detalladas de un agente */
  getAgentCapabilities(username: string, agentId: string): Promise<AgentCapabilities | null>;
}
```

### 2. Implementación en `ServerSpacesHost`

```typescript
// core/infra/server-spaces-host.ts (o donde se construye SpacesHost)

agents: {
  async getAgentDef(agentId) {
    const agent = agentRegistry.getAgent(username, agentId);
    if (!agent) return null;
    return { name: agent.name, systemPrompt: agent.systemPrompt ?? "" };
  },

  async listAgents(username, filter) {
    const agents = agentRegistry.listAgents(username);
    return agents.map((agent) => {
      const activeTools = scopeConfigManager.resolveToolsForAgent(username, agent.id);
      const activeSessions = sessionManager.countActiveSessions(username, agent.id);
      return {
        agentId: agent.id,
        name: agent.name,
        isActive: activeSessions > 0,
        activeSessions,
        capabilities: {
          model: agent.model,
          activeTools,
          skills: agent.skills ?? [],
          tags: agent.tags ?? [],
          description: agent.description,
        },
      };
    });
  },

  async getAgentCapabilities(username, agentId) {
    const agent = agentRegistry.getAgent(username, agentId);
    if (!agent) return null;
    const activeTools = scopeConfigManager.resolveToolsForAgent(username, agentId);
    return {
      model: agent.model,
      activeTools,
      skills: agent.skills ?? [],
      tags: agent.tags ?? [],
      description: agent.description,
    };
  },
},
```

### 3. Tool `list_available_agents`

```typescript
// core/tools/extensions/agents-directory.tool.ts

export function createAgentDirectoryTools(opts: {
  username: string;
  agentDirectory: AgentDirectoryPort;
}) {
  return [
    {
      name: "list_available_agents",
      description: `Lista todos los agentes disponibles con sus capacidades, tools activas y estado.
Útil para seleccionar el agente más apropiado antes de usar run_workflow o manage_delegations.`,
      parameters: {
        type: "object",
        properties: {
          filter: {
            type: "object",
            properties: {
              tags: {
                type: "array",
                items: { type: "string" },
                description: "Filtrar agentes por tags (ej: ['research', 'coding'])",
              },
              hasCapability: {
                type: "string",
                description: "Filtrar agentes que tienen una tool específica activa",
              },
            },
          },
        },
      },
      execute: async (
        _id: string,
        args: { filter?: { tags?: string[]; hasCapability?: string } },
      ) => {
        const agents = await opts.agentDirectory.listAgents(opts.username, args.filter);
        const summary = agents.map((a) => ({
          id: a.agentId,
          name: a.name,
          status: a.isActive ? `🟢 activo (${a.activeSessions} sesiones)` : "⚪ libre",
          tools:
            a.capabilities.activeTools.slice(0, 5).join(", ") +
            (a.capabilities.activeTools.length > 5 ? "..." : ""),
          model: a.capabilities.model
            ? `${a.capabilities.model.provider}/${a.capabilities.model.modelId}`
            : "default",
          skills: a.capabilities.skills.join(", ") || "ninguna",
        }));
        return {
          content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
          details: {
            ui: {
              type: "table",
              columns: ["id", "name", "status", "tools", "model"],
              rows: summary,
            },
          },
        };
      },
    },
  ];
}
```

### 4. Endpoint REST `/api/agents/directory`

```typescript
// routes/agents/ (sub-router existente)

GET /api/agents/directory                     → lista todos los agentes con capacidades
GET /api/agents/:id/capabilities              → capacidades detalladas de un agente
```

### 5. Soporte de `tags` en `Agent`

Para que el filtrado por tags funcione, el modelo de agente necesita el campo `tags`:

```typescript
// packages/shared/src/schemas.ts

export const AgentSchema = z.object({
  // ... campos existentes ...
  tags: z.array(z.string()).optional().default([]),
  description: z.string().max(500).optional(),
});
```

---

## Archivos afectados

| Archivo                                          | Operación | Descripción                                                                                                      |
| ------------------------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------- |
| `core/ports/spaces-host.port.ts`                 | MODIFY    | Extender `AgentDirectoryPort` con `listAgents`, `getAgentCapabilities`, tipos `AgentCapabilities`, `AgentStatus` |
| `packages/shared/src/schemas.ts`                 | MODIFY    | Agregar `tags?: string[]`, `description?: string` a `AgentSchema`                                                |
| `core/tools/extensions/agents-directory.tool.ts` | NEW       | Tool `list_available_agents`                                                                                     |
| `core/session/tool-factory.ts`                   | MODIFY    | Registrar `list_available_agents` en las tools del agente global                                                 |
| `apps/server/src/routes/agents/`                 | MODIFY    | Agregar endpoints `GET /directory` y `GET /:id/capabilities`                                                     |
| `apps/client/src/pages/AgentsPage.tsx`           | MODIFY    | Mostrar tags y descripción en la tarjeta de agente                                                               |

---

## Criterio de aceptación

- [ ] `list_available_agents` devuelve lista correcta de agentes con tools, modelo y estado
- [ ] Filtrado por `tags` y `hasCapability` funciona correctamente
- [ ] `GET /api/agents/directory` funciona en REST
- [ ] Los agentes pueden tener `tags` definidos via UI (en su modal de edición)
- [ ] `pnpm --filter server run typecheck` → 0 errores

---

## Estimación

**4-6 horas.** Cambios moderados y localizados — la mayor parte es extensión de interfaces existentes.
