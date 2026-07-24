export interface ResolveAgentDefinitionParams {
  username: string;
  resolvedAgentId?: string;
  getDefaultModel: () => string | null;
}

export async function resolveAgentDefinition({
  username,
  resolvedAgentId,
  getDefaultModel,
}: ResolveAgentDefinitionParams): Promise<{ agentDef?: any }> {
  let agentDef: any;

  if (resolvedAgentId) {
    const { agentRegistry } = await import("../../agents");
    const agentEntry = agentRegistry.get(resolvedAgentId);
    agentDef = agentEntry?.server.definition;
  }

  return { agentDef };
}
