// SPDX-License-Identifier: MIT
import { configService } from "@/lib/api/config.service";
import { EntityEventBus } from "@/lib/event-bus";
import { useCallback, useEffect, useState } from "react";
import type { AgentRef, EntityConfigType, EntityType } from "shared";

export function useEntityConfig(agentRef: AgentRef) {
  const entityType: EntityType = agentRef.type as EntityType;
  const targetId: string = agentRef.id;

  const [config, setConfig] = useState<EntityConfigType>({});
  const [resolvedConfig, setResolvedConfig] = useState<EntityConfigType>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!targetId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [rawData, resolvedData] = await Promise.all([
        configService.fetchEntityConfig(entityType, targetId).catch(() => null),
        configService.fetchResolvedConfig(entityType, targetId).catch(() => null),
      ]);

      if (rawData) setConfig(rawData);
      if (resolvedData) setResolvedConfig(resolvedData);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load entity config";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [entityType, targetId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    const unsub = EntityEventBus.subscribe((evt) => {
      if (evt?.type === "config") {
        fetchConfig();
      }
    });
    return unsub;
  }, [fetchConfig]);

  const updateConfig = async (newConfig: EntityConfigType) => {
    setIsSaving(true);
    setError(null);
    try {
      await configService.updateEntityConfig(entityType, targetId, newConfig);
      await fetchConfig();
      EntityEventBus.emit({ type: "config" });
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save entity config";
      setError(message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const patchConfig = async (patch: Partial<EntityConfigType>) => {
    setIsSaving(true);
    setError(null);
    try {
      await configService.patchEntityConfig(entityType, targetId, patch);
      await fetchConfig();
      EntityEventBus.emit({ type: "config" });
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to patch entity config";
      setError(message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    config,
    resolvedConfig,
    isLoading,
    isSaving,
    error,
    updateConfig,
    patchConfig,
    refresh: fetchConfig,
  };
}
