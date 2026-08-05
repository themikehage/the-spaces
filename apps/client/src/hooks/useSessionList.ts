// SPDX-License-Identifier: MIT
import { literals as u } from "@/components/sidebar/SessionSidebar.literals";
import { useSessions } from "@/contexts/SessionsContext";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { useLiterals } from "@/lib";
import { agentsService } from "@/lib/api/agents.service";
import { projectsService } from "@/lib/api/projects.service";
import { settingsService } from "@/lib/api/settings.service";
import { teamsService } from "@/lib/api/teams.service";
import { EntityEventBus } from "@/lib/event-bus";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface RepoItem {
  id?: string;
  name: string;
  path: string;
  lastModified: string;
  avatarUrl?: string;
}

export interface AgentItem {
  id: string;
  name: string;
  role: string;
  status: string;
  createdAt: string;
  avatarUrl?: string;
}

interface UseSessionListParams {
  currentPage?: string;
  onNavigate?: (path: string) => void;
  isMobile?: boolean;
  onCloseSidebar?: () => void;
}

export function useSessionList({
  currentPage = "chat",
  onNavigate,
  isMobile = false,
  onCloseSidebar,
}: UseSessionListParams) {
  const workspace = useWorkspaceContext();
  const {
    activeProjectId: activeProjectName,
    activeAgent,
    activeTeam,
    selectProject: onSelectProject,
    selectAgent: onSelectAgent,
    selectTeam: onSelectTeam,
  } = workspace;

  const l = useLiterals(u);
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const { getAgentKanbanStatus } = useSessions();

  const [isOpenRepos, setIsOpenRepos] = useState(true);
  const [isOpenAgents, setIsOpenAgents] = useState(true);
  const [isOpenTeams, setIsOpenTeams] = useState(true);

  const fetchRepos = useCallback(async () => {
    try {
      const data = await projectsService.fetchProjects();
      setRepos((data as any).projects || (data as any).repos || data || []);
    } catch (err) {
      console.error("Failed to fetch repositories:", err);
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  const fetchAgents = useCallback(async () => {
    try {
      const data = await agentsService.fetchAgents();
      setAgents((data as any).agents || data || []);
    } catch (err) {
      console.error("Failed to fetch agents:", err);
    } finally {
      setLoadingAgents(false);
    }
  }, []);

  const fetchTeams = useCallback(async () => {
    try {
      const data = await teamsService.fetchTeams();
      setTeams((data as any).teams || data || []);
    } catch (err) {
      console.error("Failed to fetch teams:", err);
    } finally {
      setLoadingTeams(false);
    }
  }, []);

  const [globalSettings, setGlobalSettings] = useState<{
    factoryName?: string;
    factoryAvatarUrl?: string | null;
  } | null>(null);

  const fetchGlobalSettings = useCallback(async () => {
    try {
      const data = await settingsService.fetchSettings();
      setGlobalSettings(data);
    } catch (err) {
      console.error("Failed to fetch settings in sidebar:", err);
    }
  }, []);

  useEffect(() => {
    fetchRepos();
    fetchAgents();
    fetchTeams();
    fetchGlobalSettings();
  }, [fetchRepos, fetchAgents, fetchTeams, fetchGlobalSettings]);

  useEffect(() => {
    return EntityEventBus.subscribe((detail) => {
      const type = detail?.type;
      if (type === "project") {
        fetchRepos();
      } else if (type === "agent") {
        fetchAgents();
      } else if (type === "team") {
        fetchTeams();
      } else if (type === "settings") {
        fetchGlobalSettings();
      } else if (type !== "custom-tool") {
        fetchRepos();
        fetchAgents();
        fetchTeams();
        fetchGlobalSettings();
      }
    });
  }, [fetchRepos, fetchAgents, fetchTeams, fetchGlobalSettings]);

  const isGlobal = !activeAgent && !activeProjectName && !activeTeam;
  const isSessionView =
    currentPage === "chat" || currentPage === "workspace" || currentPage === "preview";

  const handleGoFactory = useCallback(() => {
    if (onSelectProject) onSelectProject(null, null);
    if (onSelectAgent) onSelectAgent(null);
    if (onSelectTeam) onSelectTeam(null);
    if (onNavigate) onNavigate("/");
    onCloseSidebar?.();
  }, [onSelectProject, onSelectAgent, onSelectTeam, onNavigate, onCloseSidebar]);

  const handleSelectRepoClick = useCallback(
    (projectId: string, projectName: string) => {
      if (onSelectProject) onSelectProject(projectId, projectName);
      onCloseSidebar?.();
    },
    [onSelectProject, onCloseSidebar],
  );

  const handleSelectAgentClick = useCallback(
    (agent: { id: string; name: string; avatarUrl?: string }) => {
      if (onSelectAgent) onSelectAgent(agent);
      onCloseSidebar?.();
    },
    [onSelectAgent, onCloseSidebar],
  );

  const handleSelectTeamClick = useCallback(
    (team: { id: string; name: string; avatarUrl?: string }) => {
      if (onSelectTeam) onSelectTeam(team);
      onCloseSidebar?.();
    },
    [onSelectTeam, onCloseSidebar],
  );

  const itemClass = useCallback(
    (isActive: boolean) => {
      if (isMobile) {
        return `w-full flex items-center gap-3 px-4 py-3 h-12 rounded-lg text-base truncate transition-colors text-left cursor-pointer ${
          isActive
            ? "bg-card-hover text-foreground font-semibold border-l-4 border-primary rounded-l-none pl-3"
            : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
        }`;
      }
      return `w-full flex items-center gap-2 px-3 py-1 rounded-lg text-xs truncate transition-colors text-left cursor-pointer ${
        isActive
          ? "bg-card-hover text-foreground font-medium border-l-2 border-primary rounded-l-none pl-2"
          : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
      }`;
    },
    [isMobile],
  );

  const adminItemClass = useCallback(
    (isActive: boolean) => {
      if (isMobile) {
        return `w-full flex items-center gap-3 px-4 py-3 h-12 rounded-lg text-base transition-colors cursor-pointer text-left ${
          isActive
            ? "bg-card text-foreground font-semibold border-l-4 border-primary rounded-l-none pl-3"
            : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
        }`;
      }
      return `w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
        isActive
          ? "bg-card text-foreground font-medium"
          : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
      }`;
    },
    [isMobile],
  );

  const factoryButtonClass = useMemo(
    () =>
      `${
        isMobile
          ? "w-full flex items-center gap-3 px-4 py-3 h-12 rounded-lg text-base font-semibold transition-all cursor-pointer"
          : "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
      } ${
        isGlobal
          ? "bg-card text-primary border border-primary/30"
          : "bg-card/40 text-muted-foreground hover:bg-card hover:text-primary border border-transparent hover:border-primary/20"
      }`,
    [isMobile, isGlobal],
  );

  return {
    l,
    activeProjectName,
    activeAgent,
    activeTeam,
    repos,
    agents,
    teams,
    loadingRepos,
    loadingAgents,
    loadingTeams,
    getAgentKanbanStatus,
    isOpenRepos,
    setIsOpenRepos,
    isOpenAgents,
    setIsOpenAgents,
    isOpenTeams,
    setIsOpenTeams,
    globalSettings,
    isGlobal,
    isSessionView,
    handleGoFactory,
    handleSelectRepoClick,
    handleSelectAgentClick,
    handleSelectTeamClick,
    itemClass,
    adminItemClass,
    factoryButtonClass,
  };
}
