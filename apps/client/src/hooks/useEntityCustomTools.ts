// SPDX-License-Identifier: MIT
import { customToolsService } from "@/lib/api/custom-tools.service";
import { useCallback, useEffect, useState } from "react";
import type {
  CustomToolSummary,
  EntityToolsScopeResponse,
  EntityType,
  ToolScopeTarget,
} from "shared";

export function useEntityCustomTools(entityType: EntityType, entityId?: string) {
  const [availableTools, setAvailableTools] = useState<CustomToolSummary[]>([]);
  const [scopeConfig, setScopeConfig] = useState<EntityToolsScopeResponse | null>(null);

  const [toolsList, setToolsList] = useState<string[]>([]);
  const [agentAdd, setAgentAdd] = useState<string[]>([]);
  const [agentRemove, setAgentRemove] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [toolsData, scopeData] = await Promise.all([
        customToolsService.fetchCustomTools(),
        customToolsService.fetchEntityToolsScope(entityType, entityId),
      ]);

      setAvailableTools(toolsData || []);
      setScopeConfig(scopeData);

      if (entityType === "global") {
        setToolsList(scopeData.global || []);
      } else if (entityType === "project") {
        setToolsList(scopeData.project || []);
      } else if (entityType === "team") {
        setToolsList(scopeData.team || []);
      } else if (entityType === "agent") {
        setAgentAdd(scopeData.agent?.add || []);
        setAgentRemove(scopeData.agent?.remove || []);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load tool configuration";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  let isDirty = false;
  if (scopeConfig) {
    if (entityType === "global") {
      const initial = [...(scopeConfig.global || [])].sort();
      const current = [...toolsList].sort();
      isDirty = JSON.stringify(initial) !== JSON.stringify(current);
    } else if (entityType === "project") {
      const initial = [...(scopeConfig.project || [])].sort();
      const current = [...toolsList].sort();
      isDirty = JSON.stringify(initial) !== JSON.stringify(current);
    } else if (entityType === "team") {
      const initial = [...(scopeConfig.team || [])].sort();
      const current = [...toolsList].sort();
      isDirty = JSON.stringify(initial) !== JSON.stringify(current);
    } else if (entityType === "agent") {
      const initAdd = [...(scopeConfig.agent?.add || [])].sort();
      const currAdd = [...agentAdd].sort();
      const initRemove = [...(scopeConfig.agent?.remove || [])].sort();
      const currRemove = [...agentRemove].sort();
      isDirty =
        JSON.stringify(initAdd) !== JSON.stringify(currAdd) ||
        JSON.stringify(initRemove) !== JSON.stringify(currRemove);
    }
  }

  const toggleTool = useCallback(
    (toolName: string) => {
      if (entityType !== "agent") {
        setToolsList((prev) =>
          prev.includes(toolName) ? prev.filter((t) => t !== toolName) : [...prev, toolName],
        );
      } else {
        const globalSet = new Set(scopeConfig?.global || []);
        const teamSet = new Set(scopeConfig?.team || []);
        const projectSet = new Set(scopeConfig?.project || []);
        const isInherited =
          globalSet.has(toolName) || teamSet.has(toolName) || projectSet.has(toolName);

        if (isInherited) {
          const isCurrentlyRemoved = agentRemove.includes(toolName);
          if (isCurrentlyRemoved) {
            setAgentRemove((prev) => prev.filter((t) => t !== toolName));
          } else {
            setAgentRemove((prev) => [...prev, toolName]);
            setAgentAdd((prev) => prev.filter((t) => t !== toolName));
          }
        } else {
          const isCurrentlyAdded = agentAdd.includes(toolName);
          if (isCurrentlyAdded) {
            setAgentAdd((prev) => prev.filter((t) => t !== toolName));
          } else {
            setAgentAdd((prev) => [...prev, toolName]);
            setAgentRemove((prev) => prev.filter((t) => t !== toolName));
          }
        }
      }
    },
    [entityType, scopeConfig, agentAdd, agentRemove],
  );

  const saveChanges = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    setError(null);

    let target: ToolScopeTarget;
    if (entityType === "global") {
      target = { type: "global" };
    } else if (entityType === "project") {
      if (!entityId) return false;
      target = { type: "project", id: entityId };
    } else if (entityType === "team") {
      if (!entityId) return false;
      target = { type: "team", id: entityId };
    } else if (entityType === "agent") {
      if (!entityId) return false;
      target = { type: "agent", id: entityId };
    } else {
      return false;
    }

    const payload = {
      target,
      add: entityType === "agent" ? agentAdd : toolsList,
      remove: entityType === "agent" ? agentRemove : [],
    };

    try {
      await customToolsService.updateEntityToolsScope(payload);
      await fetchData();
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save tool scope configuration";
      setError(msg);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [entityType, entityId, agentAdd, agentRemove, toolsList, fetchData]);

  return {
    availableTools,
    scopeConfig,
    toolsList,
    agentAdd,
    agentRemove,
    isDirty,
    isLoading,
    isSaving,
    error,
    toggleTool,
    saveChanges,
    refresh: fetchData,
  };
}
