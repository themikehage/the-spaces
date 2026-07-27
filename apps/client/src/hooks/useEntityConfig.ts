// SPDX-License-Identifier: MIT
import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import type { EntityConfigType, EntityType } from "shared";

export function useEntityConfig(entityType: EntityType, entityId: string) {
  const [config, setConfig] = useState<EntityConfigType>({});
  const [resolvedConfig, setResolvedConfig] = useState<EntityConfigType>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!entityId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [rawRes, resolvedRes] = await Promise.all([
        apiFetch(`/api/config/${entityType}/${encodeURIComponent(entityId)}`),
        apiFetch(`/api/config/${entityType}/${encodeURIComponent(entityId)}/resolved`),
      ]);

      if (rawRes.ok) {
        const rawData = await rawRes.json();
        setConfig(rawData);
      }
      if (resolvedRes.ok) {
        const resolvedData = await resolvedRes.json();
        setResolvedConfig(resolvedData);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load entity config";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateConfig = async (newConfig: EntityConfigType) => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/config/${entityType}/${encodeURIComponent(entityId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update entity config");
      }

      await fetchConfig();
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save entity config";
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
    refresh: fetchConfig,
  };
}
