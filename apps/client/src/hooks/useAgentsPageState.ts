// SPDX-License-Identifier: MIT
import { useToast } from "@/contexts/ToastContext";
import { useAgents } from "@/hooks/useAgents";
import { useLiterals } from "@/lib";
import { agentsService } from "@/lib/api/agents.service";
import { teamsService } from "@/lib/api/teams.service";
import { literals as u } from "@/pages/AgentsPage.literals";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AgentDefinition } from "shared";

export function useAgentsPageState() {
  const l = useLiterals(u);
  const { addToast } = useToast();
  const {
    agents,
    loading,
    error,
    fetchAgents,
    registerAgent,
    stopAgent,
    uploadAvatar,
    deleteAvatar,
  } = useAgents();
  const [showRegister, setShowRegister] = useState(false);
  const [selectedAgentForExecutions, setSelectedAgentForExecutions] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedAgentForConfig, setSelectedAgentForConfig] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"my-agents" | "gallery">("my-agents");
  const [blueprints, setBlueprints] = useState<any[]>([]);
  const [loadingBlueprints, setLoadingBlueprints] = useState(false);
  const [blueprintsError, setBlueprintsError] = useState<string | null>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [galleryFilter, setGalleryFilter] = useState<"all" | "agent" | "team">("all");
  const [gallerySearch, setGallerySearch] = useState("");
  const [selectedBlueprint, setSelectedBlueprint] = useState<any | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);

  const fetchBlueprints = useCallback(async () => {
    setLoadingBlueprints(true);
    setBlueprintsError(null);
    try {
      const data = await agentsService.fetchBlueprints();
      setBlueprints((data as any).blueprints || data || []);
    } catch (err: any) {
      setBlueprintsError(err.message || "Failed to load blueprints");
    } finally {
      setLoadingBlueprints(false);
    }
  }, []);

  const fetchTeams = useCallback(async () => {
    try {
      const data = await teamsService.fetchTeams();
      setTeams((data as any).teams || data || []);
    } catch (e) {
      console.error("Failed to fetch teams:", e);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "gallery") {
      fetchBlueprints();
      fetchTeams();
    }
  }, [activeTab, fetchBlueprints, fetchTeams]);

  const handleInstall = useCallback(
    async (bpId: string) => {
      setInstallingId(bpId);
      try {
        const data = await agentsService.installBlueprint(bpId);

        addToast(
          "success",
          data.type === "agent" ? l.installSuccessAgent : l.installSuccessChannel,
        );

        await fetchAgents();
        await fetchTeams();
        window.dispatchEvent(new CustomEvent("entity-updated", { detail: { type: data.type } }));
      } catch (err: any) {
        console.error(err);
        addToast("error", err.message || l.installError);
      } finally {
        setInstallingId(null);
      }
    },
    [fetchAgents, fetchTeams, addToast, l],
  );

  const handleRegisterOrUpdate = async (def: AgentDefinition) => {
    await registerAgent(def);
  };

  const filteredBlueprints = useMemo(() => {
    return blueprints.filter((bp) => {
      const matchesSearch =
        bp.metadata.title.toLowerCase().includes(gallerySearch.toLowerCase()) ||
        bp.metadata.description.toLowerCase().includes(gallerySearch.toLowerCase()) ||
        bp.metadata.tags.some((tag: string) =>
          tag.toLowerCase().includes(gallerySearch.toLowerCase()),
        );

      const matchesType =
        galleryFilter === "all" ||
        (galleryFilter === "agent" && bp.type === "agent") ||
        (galleryFilter === "team" && bp.type === "team");

      return matchesSearch && matchesType;
    });
  }, [blueprints, gallerySearch, galleryFilter]);

  return {
    l,
    agents,
    loading,
    error,
    fetchAgents,
    stopAgent,
    uploadAvatar,
    deleteAvatar,
    showRegister,
    setShowRegister,
    selectedAgentForExecutions,
    setSelectedAgentForExecutions,
    selectedAgentForConfig,
    setSelectedAgentForConfig,
    activeTab,
    setActiveTab,
    blueprints,
    loadingBlueprints,
    blueprintsError,
    teams,
    galleryFilter,
    setGalleryFilter,
    gallerySearch,
    setGallerySearch,
    selectedBlueprint,
    setSelectedBlueprint,
    installingId,
    fetchBlueprints,
    handleInstall,
    handleRegisterOrUpdate,
    filteredBlueprints,
  };
}
