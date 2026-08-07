// SPDX-License-Identifier: MIT
import { useSessionActions } from "@/components/layout/hooks/useSessionActions";
import { useWorkspaceNavigation } from "@/components/layout/hooks/useWorkspaceNavigation";
import { literals as u } from "@/components/layout/MainLayout.literals";
import { useSessions } from "@/contexts/SessionsContext";
import { useAgents } from "@/hooks/useAgents";
import { useSessionResolver } from "@/hooks/useSessionResolver";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { useLiterals } from "@/lib";
import { projectsService } from "@/lib/api/projects.service";
import { settingsService } from "@/lib/api/settings.service";
import { teamsService } from "@/lib/api/teams.service";
import { EntityEventBus } from "@/lib/event-bus";
import { getSessionPath } from "@/lib/session-utils";
import { wsClient, type ConnectionState } from "@/lib/ws-client";
import { useWorkflowList } from "@/hooks/useWorkflowList";
import type { RoutePage } from "@/router/useRoutePage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { matchPath, useLocation } from "react-router-dom";
import type { AgentDefinition } from "shared";

interface UseMainLayoutStateParams {
  page: RoutePage;
  onNavigate: (path: string) => void;
  isMobile?: boolean;
  onBack?: () => void;
}

export function useMainLayoutState({
  page,
  onNavigate,
  isMobile = false,
  onBack,
}: UseMainLayoutStateParams) {
  const workspace = useWorkspaceContext();
  const {
    activeProjectId,
    activeProjectFriendlyName: activeProjectName,
    activeAgent: rawActiveAgent,
    activeTeam,
    selectProject: onSelectProject,
    selectTeam: onSelectTeam,
  } = workspace;

  const activeAgent = rawActiveAgent;
  const l = useLiterals(u);
  const { pathname } = useLocation();
  const { workflows } = useWorkflowList();
  const { sessions } = useSessions();

  const workflowMatch = matchPath("/workflows/:workflowId/*", pathname);
  const activeWorkflowId =
    workflowMatch?.params.workflowId ||
    (pathname.startsWith("/workflows/") ? pathname.split("/")[2] : null);

  const activeWorkflow = useMemo(() => {
    if (!activeWorkflowId) return null;
    return (
      workflows.find((w) => w.id === activeWorkflowId) || { id: activeWorkflowId, name: "Workflow" }
    );
  }, [activeWorkflowId, workflows]);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessionPopoverOpen, setSessionPopoverOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [wsState, setWsState] = useState<ConnectionState>(() => wsClient.getState());
  const [showAgentEdit, setShowAgentEdit] = useState(false);
  const [showProjectEdit, setShowProjectEdit] = useState(false);
  const [showTeamEdit, setShowTeamEdit] = useState(false);
  const [showGlobalEdit, setShowGlobalEdit] = useState(false);
  const [activeProjectData, setActiveProjectData] = useState<any>(null);
  const [activeTeamData, setActiveTeamData] = useState<any>(null);
  const [globalSettings, setGlobalSettings] = useState<{
    factoryName?: string;
    factoryAvatarUrl?: string | null;
  } | null>(null);

  const { updateAgent, uploadAvatar, deleteAvatar } = useAgents();

  useEffect(() => {
    const unsub = wsClient.onStateChange((state) => {
      setWsState(state);
    });
    return unsub;
  }, []);

  const sessionMatch = pathname.match(/\/session\/(.+?)(?:\/(?:delegations|timeline))?$/);
  const sessionId = sessionMatch?.[1] ?? null;

  const activeSessionTitle = useMemo(() => {
    if (!sessionId) return null;
    const found = sessions.find((s) => s.id === sessionId);
    return found?.name || null;
  }, [sessionId, sessions]);

  const handleExport = useCallback(
    (format: "json" | "jsonl" | "markdown") => {
      if (!sessionId) return;
      setExportDropdownOpen(false);

      const url = `/api/sessions/${sessionId}/export?format=${format}`;
      const a = document.createElement("a");
      a.href = url;
      a.download = `session-${sessionId}.${format === "markdown" ? "md" : format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    [sessionId],
  );

  useWorkspaceNavigation(page, onNavigate);

  const { quickCreating, handleSelectSession, handleNewSession, handleQuickCreate } =
    useSessionActions({
      activeProjectId,
      activeProjectFriendlyName: activeProjectName,
      activeAgent,
      activeTeam,
      onNavigate,
      setSidebarOpen,
    });

  const handleBackClick = useCallback(() => {
    if (onBack) {
      onBack();
    }
  }, [onBack]);

  const handleUpdateAgent = useCallback(
    async (def: AgentDefinition) => {
      if (!activeAgent) return;
      const { id: _id, ...updates } = def;
      await updateAgent(activeAgent.id, updates);
    },
    [activeAgent, updateAgent],
  );

  const handleUpdateProject = useCallback(
    async (updates: { name: string; cloneUrl: string | null; avatarUrl: string | null }) => {
      if (!activeProjectId) return;
      await projectsService.updateProject(activeProjectId, updates);
      localStorage.setItem("active-project-name", updates.name);
      EntityEventBus.emit({ type: "project" });
    },
    [activeProjectId],
  );

  const handleUploadProjectAvatar = useCallback(async (id: string, file: File) => {
    const avatarUrl = await projectsService.uploadProjectAvatar(id, file);
    EntityEventBus.emit({ type: "project" });
    return avatarUrl;
  }, []);

  const handleDeleteProjectAvatar = useCallback(async (id: string) => {
    await projectsService.deleteProjectAvatar(id);
    EntityEventBus.emit({ type: "project" });
  }, []);

  const handleDeleteProject = useCallback(
    async (id: string) => {
      await projectsService.deleteProject(id);
      onSelectProject(null, null);
      onNavigate("/projects");
      EntityEventBus.emit({ type: "project" });
    },
    [onSelectProject, onNavigate],
  );

  const handleUpdateTeam = useCallback(
    async (updates: any) => {
      if (!activeTeam?.id) return;
      await teamsService.updateTeam(activeTeam.id, updates);
      EntityEventBus.emit({ type: "team" });
    },
    [activeTeam?.id],
  );

  const handleUploadTeamAvatar = useCallback(async (id: string, file: File) => {
    const avatarUrl = await teamsService.uploadTeamAvatar(id, file);
    EntityEventBus.emit({ type: "team" });
    return avatarUrl;
  }, []);

  const handleDeleteTeamAvatar = useCallback(async (id: string) => {
    await teamsService.deleteTeamAvatar(id);
    EntityEventBus.emit({ type: "team" });
  }, []);

  const handleDeleteTeam = useCallback(
    async (id: string) => {
      await teamsService.deleteTeam(id);
      onSelectTeam(null);
      onNavigate("/teams");
      EntityEventBus.emit({ type: "team" });
    },
    [onSelectTeam, onNavigate],
  );

  const fetchGlobalSettings = useCallback(async () => {
    try {
      const data = await settingsService.fetchSettings();
      setGlobalSettings(data);
    } catch (err) {
      console.error("Failed to fetch global settings:", err);
    }
  }, []);

  useEffect(() => {
    fetchGlobalSettings();
  }, [fetchGlobalSettings]);

  useEffect(() => {
    if (!activeProjectId) {
      setActiveProjectData(null);
      return;
    }
    const fetchProjectData = async () => {
      try {
        const projects = await projectsService.fetchProjects();
        const proj = projects.find((p: any) => p.id === activeProjectId);
        if (proj) {
          setActiveProjectData(proj);
        }
      } catch (err) {
        console.error("Failed to fetch project details:", err);
      }
    };
    fetchProjectData();
  }, [activeProjectId]);

  useEffect(() => {
    if (!activeTeam?.id) {
      setActiveTeamData(null);
      return;
    }
    const fetchTeamData = async () => {
      try {
        const teams = await teamsService.fetchTeams();
        const team = teams.find((t: any) => t.id === activeTeam.id);
        if (team) {
          setActiveTeamData(team);
        }
      } catch (err) {
        console.error("Failed to fetch team details:", err);
      }
    };
    fetchTeamData();
  }, [activeTeam?.id]);

  useEffect(() => {
    return EntityEventBus.subscribe((detail) => {
      const type = detail?.type;
      if (type === "project" && activeProjectId) {
        projectsService
          .fetchProjects()
          .then((projects: any[]) => {
            const proj = projects.find((p: any) => p.id === activeProjectId);
            if (proj) {
              setActiveProjectData(proj);
              localStorage.setItem("active-project-name", proj.name);
            }
          })
          .catch((err) => console.error("Error refreshing active project data:", err));
      }

      if (type === "team" && activeTeam?.id) {
        teamsService
          .fetchTeams()
          .then((teams: any[]) => {
            const team = teams.find((t: any) => t.id === activeTeam.id);
            if (team) {
              setActiveTeamData(team);
            }
          })
          .catch((err) => console.error("Error refreshing active team data:", err));
      }

      if (type === "settings") {
        fetchGlobalSettings();
      }
    });
  }, [activeProjectId, activeTeam?.id, fetchGlobalSettings]);

  const isHome = isMobile && !activeProjectId && !activeAgent && !activeTeam && page === "chat";

  const mobileTitle = useMemo(() => {
    if (activeProjectId) return activeProjectName || activeProjectId;
    if (activeAgent) return activeAgent.name;
    if (activeTeam) return `#${activeTeam.name}`;
    if (page === "settings") return l.breadSettings || "Settings";
    if (page === "skills") return l.breadSkills || "Skills";
    if (page === "logs") return l.breadLogs || "Logs";
    if (page === "sessions") return l.breadSessions || "Sessions";
    return "Spaces";
  }, [activeProjectId, activeProjectName, activeAgent, activeTeam, page, l]);

  const { resolvedSessionId, resolving } = useSessionResolver({
    sessionId,
    activeProjectName: activeProjectId,
    activeProjectFriendlyName: activeProjectName,
    activeAgent,
    activeTeam,
    currentPage: page,
  });

  useEffect(() => {
    if (resolvedSessionId && !sessionId) {
      const context = {
        activeTeam,
        activeAgent,
        activeProjectName: activeProjectId,
        activeProjectFriendlyName: activeProjectName,
      };
      onNavigate(getSessionPath(resolvedSessionId, context));
    }
  }, [
    resolvedSessionId,
    sessionId,
    activeTeam,
    activeAgent,
    activeProjectId,
    activeProjectName,
    onNavigate,
  ]);

  const resolvingSession = !sessionId && page === "chat" && resolving;

  const isContextView =
    page === "chat" ||
    page === "workspace" ||
    page === "preview" ||
    page === "org" ||
    page === "delegations" ||
    page === "timeline";
  const showNewSessionButton = !isHome && isContextView;

  const isNegotiationTeam = activeTeamData?.teamType === "Negotiation";

  return {
    l,
    activeProjectId,
    activeProjectName,
    activeAgent,
    rawActiveAgent,
    activeTeam,
    activeWorkflow,
    onSelectProject,
    onSelectTeam,
    sidebarOpen,
    setSidebarOpen,
    sessionPopoverOpen,
    setSessionPopoverOpen,
    exportDropdownOpen,
    setExportDropdownOpen,
    wsState,
    showAssignmentModal,
    setShowAssignmentModal,
    showAgentEdit,
    setShowAgentEdit,
    showProjectEdit,
    setShowProjectEdit,
    showTeamEdit,
    setShowTeamEdit,
    showGlobalEdit,
    setShowGlobalEdit,
    activeProjectData,
    activeTeamData,
    globalSettings,
    sessionId,
    activeSessionTitle,
    quickCreating,
    handleSelectSession,
    handleNewSession,
    handleQuickCreate,
    handleBackClick,
    handleExport,
    handleUpdateAgent,
    uploadAvatar,
    deleteAvatar,
    handleUpdateProject,
    handleUploadProjectAvatar,
    handleDeleteProjectAvatar,
    handleDeleteProject,
    handleUpdateTeam,
    handleUploadTeamAvatar,
    handleDeleteTeamAvatar,
    handleDeleteTeam,
    isHome,
    mobileTitle,
    resolvingSession,
    isContextView,
    showNewSessionButton,
    isNegotiationTeam,
  };
}
