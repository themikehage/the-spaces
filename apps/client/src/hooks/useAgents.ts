// SPDX-License-Identifier: MIT
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { agentsService } from "@/lib/api/agents.service";
import { EntityEventBus } from "@/lib/event-bus";
import { useCallback, useEffect, useState } from "react";
import type { AgentDefinition, AgentInfo } from "shared";

export function useAgents() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await agentsService.fetchAgents();
      setAgents(data);
    } catch (err: any) {
      setError(err.message || "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const registerAgent = useCallback(
    async (definition: AgentDefinition): Promise<AgentInfo> => {
      const agent = await agentsService.registerAgent(definition);
      await fetchAgents();
      EntityEventBus.emit({ type: "agent" });
      return agent;
    },
    [fetchAgents],
  );

  const stopAgent = useCallback(
    async (id: string): Promise<void> => {
      await agentsService.stopAgent(id);
      await fetchAgents();
      EntityEventBus.emit({ type: "agent" });
    },
    [fetchAgents],
  );

  const promptAgent = useCallback(async (id: string, message: string): Promise<string> => {
    return agentsService.promptAgent(id, message);
  }, []);

  const updateAgent = useCallback(
    async (id: string, updates: Partial<Omit<AgentDefinition, "id">>): Promise<AgentInfo> => {
      const agent = await agentsService.updateAgent(id, updates);
      await fetchAgents();
      EntityEventBus.emit({ type: "agent" });
      return agent;
    },
    [fetchAgents],
  );

  const { uploadAvatar, deleteAvatar } = useAvatarUpload({
    uploadFn: agentsService.uploadAgentAvatar,
    deleteFn: agentsService.deleteAgentAvatar,
    onSuccess: fetchAgents,
  });

  return {
    agents,
    loading,
    error,
    fetchAgents,
    registerAgent,
    stopAgent,
    updateAgent,
    promptAgent,
    uploadAvatar,
    deleteAvatar,
  };
}
