// SPDX-License-Identifier: MIT
import { apiFetch } from "@/lib/api";
import type { EntityType } from "@spaces/core";
import { useCallback, useEffect, useState } from "react";
import { useEntityConfig } from "./useEntityConfig";

export interface SkillInfo {
  name: string;
  description: string;
  filePath?: string;
  disableModelInvocation?: boolean;
  scope?: string;
  content?: string;
}

export function useEntitySkills(entityType: EntityType, entityId: string) {
  const {
    config,
    resolvedConfig,
    isLoading: configLoading,
    isSaving,
    error: configError,
    updateConfig,
    refresh: refreshConfig,
  } = useEntityConfig(entityType, entityId);

  const [installedSkills, setInstalledSkills] = useState<SkillInfo[]>([]);
  const [skillsLoading, setSkillsLoading] = useState<boolean>(true);
  const [skillsError, setSkillsError] = useState<string | null>(null);

  const fetchSkills = useCallback(async () => {
    if (!entityId) return;
    setSkillsLoading(true);
    setSkillsError(null);
    try {
      const query =
        entityType && entityId
          ? `?entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`
          : "";
      const res = await apiFetch(`/api/skills${query}`);
      if (res.ok) {
        const data = await res.json();
        setInstalledSkills(data.skills || []);
      } else {
        const errData = await res.json().catch(() => ({}));
        setSkillsError(errData.error || "Failed to load skills");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load skills";
      setSkillsError(message);
    } finally {
      setSkillsLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const activeSkills: string[] = config.skills && Array.isArray(config.skills) ? config.skills : [];
  const resolvedSkills: string[] =
    resolvedConfig.skills && Array.isArray(resolvedConfig.skills) ? resolvedConfig.skills : [];

  const toggleSkill = async (skillName: string) => {
    const isCurrentlyActive = activeSkills.includes(skillName);
    const updatedSkills = isCurrentlyActive
      ? activeSkills.filter((s) => s !== skillName)
      : [...activeSkills, skillName];

    const success = await updateConfig({
      ...config,
      skills: updatedSkills,
    });

    if (success) {
      await fetchSkills();
    }
    return success;
  };

  const setActiveSkills = async (newSkills: string[]) => {
    const success = await updateConfig({
      ...config,
      skills: newSkills,
    });

    if (success) {
      await fetchSkills();
    }
    return success;
  };

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshConfig(), fetchSkills()]);
  }, [refreshConfig, fetchSkills]);

  return {
    installedSkills,
    activeSkills,
    resolvedSkills,
    isLoading: configLoading || skillsLoading,
    isSaving,
    error: configError || skillsError,
    toggleSkill,
    setActiveSkills,
    refresh: refreshAll,
  };
}
