// SPDX-License-Identifier: MIT
import { AgentAvatar } from "@/components/shared/AgentAvatar";
import { EntityAvatar } from "@/components/shared/EntityAvatar";
import { useSessions } from "@/contexts/SessionsContext";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { useLiterals } from "@/lib";
import { apiFetch } from "@/lib/api";
import {
  ArrowRight,
  ArrowUpDown,
  BookOpen,
  Calendar,
  ChevronRight,
  FolderPlus,
  Settings,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { literals as u } from "./SessionSidebar.literals";

// --- Component ---

interface RepoItem {
  id?: string;
  name: string;
  path: string;
  lastModified: string;
  avatarUrl?: string;
}

interface AgentItem {
  id: string;
  name: string;
  role: string;
  status: string;
  createdAt: string;
  avatarUrl?: string;
}

interface Props {
  currentPage?: string;
  onNavigate?: (path: string) => void;
  isMobile?: boolean;
  onCloseSidebar?: () => void;
}

export function SessionSidebar({
  currentPage = "chat",
  onNavigate,
  isMobile = false,
  onCloseSidebar,
}: Props) {
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
      const res = await apiFetch("/api/workspace-projects");
      if (res.ok) {
        const data = await res.json();
        setRepos(data.projects || data.repos || []);
      }
    } catch (err) {
      console.error("Failed to fetch repositories:", err);
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await apiFetch("/api/agents");
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch (err) {
      console.error("Failed to fetch agents:", err);
    } finally {
      setLoadingAgents(false);
    }
  }, []);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await apiFetch("/api/teams");
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams || []);
      }
    } catch (err) {
      console.error("Failed to fetch teams:", err);
    } finally {
      setLoadingTeams(false);
    }
  }, []);

  const isGlobal = !activeAgent && !activeProjectName && !activeTeam;
  const isSessionView =
    currentPage === "chat" || currentPage === "workspace" || currentPage === "preview";

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

  const accordionHeaderClass = isMobile
    ? "group/title flex items-center px-4 py-3 h-12 text-sm uppercase tracking-wider font-semibold text-muted-foreground"
    : "group/title flex items-center px-3 py-1 text-xs uppercase tracking-wider font-semibold text-muted-foreground cursor-pointer";

  const accordionButtonClass =
    "flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer text-left";

  const chevronSize = isMobile ? 20 : 16;

  const factoryButtonClass = `${
    isMobile
      ? "w-full flex items-center gap-3 px-4 py-3 h-12 rounded-lg text-base font-semibold transition-all cursor-pointer"
      : "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
  } ${
    isGlobal
      ? "bg-card text-primary border border-primary/30"
      : "bg-card/40 text-muted-foreground hover:bg-card hover:text-primary border border-transparent hover:border-primary/20"
  }`;

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

  const [globalSettings, setGlobalSettings] = useState<{
    factoryName?: string;
    factoryAvatarUrl?: string | null;
  } | null>(null);

  const fetchGlobalSettings = useCallback(async () => {
    try {
      const res = await apiFetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setGlobalSettings(data);
      }
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
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const type = customEvent.detail?.type;
      if (type === "project") {
        fetchRepos();
      } else if (type === "agent") {
        fetchAgents();
      } else if (type === "team") {
        fetchTeams();
      } else if (type === "settings") {
        fetchGlobalSettings();
      } else if (type !== "experiment") {
        fetchRepos();
        fetchAgents();
        fetchTeams();
        fetchGlobalSettings();
      }
    };
    window.addEventListener("entity-updated", handleUpdate);
    return () => window.removeEventListener("entity-updated", handleUpdate);
  }, [fetchRepos, fetchAgents, fetchTeams, fetchGlobalSettings]);

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
  const adminItems = useMemo(
    () => [
      {
        id: "skills",
        label: l.navSkills,
        path: "/skills",
        icon: <BookOpen size={14} />,
      },
      {
        id: "schedules",
        label: "Schedules",
        path: "/schedules",
        icon: <Calendar size={14} />,
      },
      {
        id: "settings",
        label: l.navSettings,
        path: "/settings",
        icon: <Settings size={14} />,
      },
      {
        id: "plugins",
        label: l.navPlugins || "Plugins",
        path: "/plugins",
        icon: <ArrowUpDown size={14} />,
      },
    ],
    [l.navSkills, l.navSettings, l.navPlugins],
  );

  return (
    <div className="flex flex-col h-full bg-background select-none text-foreground">
      {/* Spaces Button */}
      <div
        className={
          isMobile
            ? "p-4 border-b border-border flex-shrink-0"
            : "p-3 border-b border-border flex-shrink-0"
        }
      >
        <button onClick={handleGoFactory} className={factoryButtonClass} title={l.globalWorkspace}>
          {globalSettings?.factoryAvatarUrl ? (
            <AgentAvatar
              name={globalSettings.factoryName || "Spaces"}
              avatarUrl={globalSettings.factoryAvatarUrl}
              size={isMobile ? "sm" : "xs"}
              className="flex-shrink-0 rounded-full"
            />
          ) : (
            <FolderPlus size={isMobile ? 20 : 14} className="flex-shrink-0" />
          )}
          <span>{globalSettings?.factoryName || "Spaces"}</span>
        </button>
      </div>

      {/* Context List Accordions */}
      <div
        className={
          isMobile
            ? "flex-1 overflow-y-auto min-h-0 py-3 space-y-4"
            : "flex-1 overflow-y-auto min-h-0 py-2 space-y-3"
        }
      >
        {/* Repos Accordion */}
        <div className="flex flex-col">
          <div className={accordionHeaderClass} onClick={() => setIsOpenRepos((prev) => !prev)}>
            <ChevronRight
              size={chevronSize}
              className={`transform transition-transform ${isOpenRepos ? "rotate-90" : ""}`}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseSidebar?.();
                onNavigate?.("/projects");
              }}
              className={`${accordionButtonClass}`}
            >
              <span className="ml-2">
                {l.sectionProjects} ({repos.length})
              </span>
              <ArrowRight
                size={isMobile ? 20 : 12}
                className="text-muted-foreground flex-shrink-0"
              />
            </button>
          </div>

          {isOpenRepos && (
            <div className={isMobile ? "px-3 mt-1 space-y-1.5" : "px-2 mt-1 space-y-0.5"}>
              {loadingRepos ? (
                <div className="text-xs text-muted-foreground px-3 py-1 animate-pulse">
                  {l.loading}
                </div>
              ) : repos.length === 0 ? (
                <div className="text-xs text-muted-foreground px-3 py-1">{l.noProjects}</div>
              ) : (
                repos.map((repo) => {
                  const isActive = isSessionView && activeProjectName === repo.id && !activeAgent;
                  return (
                    <button
                      key={repo.id || repo.name}
                      onClick={() => handleSelectRepoClick(repo.id || repo.name, repo.name)}
                      className={itemClass(isActive)}
                    >
                      <EntityAvatar
                        name={repo.name}
                        avatarUrl={repo.avatarUrl}
                        size={isMobile ? "sm" : "xs"}
                        type="project"
                        className="flex-shrink-0"
                      />
                      <span className="truncate">{repo.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Agents Accordion */}
        <div className="flex flex-col">
          <div className={accordionHeaderClass} onClick={() => setIsOpenAgents((prev) => !prev)}>
            <ChevronRight
              size={chevronSize}
              className={`transform transition-transform ${isOpenAgents ? "rotate-90" : ""}`}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseSidebar?.();
                onNavigate?.("/agents");
              }}
              className={`${accordionButtonClass}`}
            >
              <span className="ml-2">
                {l.sectionAgents} ({agents.length})
              </span>
              <ArrowRight
                size={isMobile ? 20 : 12}
                className="text-muted-foreground flex-shrink-0"
              />
            </button>
          </div>

          {isOpenAgents && (
            <div className={isMobile ? "px-3 mt-1 space-y-1.5" : "px-2 mt-1 space-y-0.5"}>
              {loadingAgents ? (
                <div className="text-xs text-muted-foreground px-3 py-1 animate-pulse">
                  {l.loading}
                </div>
              ) : agents.length === 0 ? (
                <div className="text-xs text-muted-foreground px-3 py-1">{l.noAgents}</div>
              ) : (
                agents.map((agent) => {
                  const isActive = isSessionView && activeAgent?.id === agent.id;
                  const agentKanbanStatus = getAgentKanbanStatus(agent.id);
                  const statusDot =
                    agentKanbanStatus === "working"
                      ? "bg-success shadow-[0_0_6px_rgba(74,222,128,0.6)]"
                      : agentKanbanStatus === "idle"
                        ? "bg-text-secondary/30"
                        : "bg-text-secondary/10";
                  return (
                    <button
                      key={agent.id}
                      onClick={() =>
                        handleSelectAgentClick({
                          id: agent.id,
                          name: agent.name,
                          avatarUrl: agent.avatarUrl,
                        })
                      }
                      className={itemClass(isActive)}
                    >
                      <span className="relative flex-shrink-0">
                        <AgentAvatar
                          name={agent.name}
                          avatarUrl={agent.avatarUrl}
                          size={isMobile ? "sm" : "xs"}
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-background ${statusDot}`}
                        />
                      </span>
                      <span className="truncate">{agent.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Teams Accordion */}
        <div className="flex flex-col">
          <div className={accordionHeaderClass} onClick={() => setIsOpenTeams((prev) => !prev)}>
            <ChevronRight
              size={chevronSize}
              className={`transform transition-transform ${isOpenTeams ? "rotate-90" : ""}`}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseSidebar?.();
                onNavigate?.("/teams");
              }}
              className={`${accordionButtonClass}`}
            >
              <span className="ml-2">
                {l.sectionTeams} ({teams.length})
              </span>
              <ArrowRight
                size={isMobile ? 20 : 12}
                className="text-muted-foreground flex-shrink-0"
              />
            </button>
          </div>

          {isOpenTeams && (
            <div className={isMobile ? "px-3 mt-1 space-y-1.5" : "px-2 mt-1 space-y-0.5"}>
              {loadingTeams ? (
                <div className="text-xs text-muted-foreground px-3 py-1 animate-pulse">
                  {l.loading}
                </div>
              ) : teams.length === 0 ? (
                <div className="text-xs text-muted-foreground px-3 py-1">{l.noTeams}</div>
              ) : (
                teams.map((team) => {
                  const isActive = isSessionView && activeTeam?.id === team.id;
                  return (
                    <button
                      key={team.id}
                      onClick={() =>
                        handleSelectTeamClick({
                          id: team.id,
                          name: team.name,
                          avatarUrl: team.avatarUrl,
                        })
                      }
                      className={itemClass(isActive)}
                    >
                      <EntityAvatar
                        name={team.name}
                        avatarUrl={team.avatarUrl}
                        size={isMobile ? "sm" : "xs"}
                        type="team"
                        className="flex-shrink-0"
                      />
                      <span className="truncate">{team.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Admin Links */}
      {!isMobile && (
        <div className="p-2 border-t border-border/60 bg-card/10 space-y-1 flex-shrink-0">
          <div className="px-3 py-1 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            Admin
          </div>
          {adminItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate && onNavigate(item.path)}
                className={adminItemClass(isActive)}
              >
                <span
                  className={`${isActive ? "text-primary" : "text-muted-foreground"} w-4 flex justify-center flex-shrink-0`}
                >
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
