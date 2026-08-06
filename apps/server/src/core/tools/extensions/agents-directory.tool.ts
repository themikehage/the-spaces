// SPDX-License-Identifier: MIT
import type { AgentDirectoryPort } from "../../ports/spaces-host.port";

export interface CreateAgentDirectoryToolsOptions {
  username: string;
  agentDirectory?: AgentDirectoryPort;
}

export function createAgentDirectoryTools(opts: CreateAgentDirectoryToolsOptions) {
  if (!opts.agentDirectory) return [];

  const agentDirectory = opts.agentDirectory;

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
        const agents = await agentDirectory.listAgents(opts.username, args.filter);
        const summary = agents.map((a) => ({
          id: a.agentId,
          name: a.name,
          status: a.isActive ? "🟢 activo" : "⚪ libre",
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
