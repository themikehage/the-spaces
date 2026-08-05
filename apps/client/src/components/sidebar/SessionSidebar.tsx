// SPDX-License-Identifier: MIT
import { AgentAvatar } from "@/components/shared/AgentAvatar";
import { useSessionList } from "@/hooks/useSessionList";
import {
  ArrowRight,
  ArrowUpDown,
  BookOpen,
  Calendar,
  ChevronRight,
  FolderPlus,
  Settings,
} from "lucide-react";
import { useMemo } from "react";
import { AgentListItem, ProjectListItem, TeamListItem } from "./SessionListItem";

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
  const state = useSessionList({
    currentPage,
    onNavigate,
    isMobile,
    onCloseSidebar,
  });

  const accordionHeaderClass = isMobile
    ? "group/title flex items-center px-4 py-3 h-12 text-sm uppercase tracking-wider font-semibold text-muted-foreground"
    : "group/title flex items-center px-3 py-1 text-xs uppercase tracking-wider font-semibold text-muted-foreground cursor-pointer";

  const accordionButtonClass =
    "flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer text-left";

  const chevronSize = isMobile ? 20 : 16;

  const adminItems = useMemo(
    () => [
      {
        id: "skills",
        label: state.l.navSkills,
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
        label: state.l.navSettings,
        path: "/settings",
        icon: <Settings size={14} />,
      },
      {
        id: "plugins",
        label: state.l.navPlugins || "Plugins",
        path: "/plugins",
        icon: <ArrowUpDown size={14} />,
      },
    ],
    [state.l.navSkills, state.l.navSettings, state.l.navPlugins],
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
        <button
          onClick={state.handleGoFactory}
          className={state.factoryButtonClass}
          title={state.l.globalWorkspace}
        >
          {state.globalSettings?.factoryAvatarUrl ? (
            <AgentAvatar
              name={state.globalSettings.factoryName || "Spaces"}
              avatarUrl={state.globalSettings.factoryAvatarUrl}
              size={isMobile ? "sm" : "xs"}
              className="flex-shrink-0 rounded-full"
            />
          ) : (
            <FolderPlus size={isMobile ? 20 : 14} className="flex-shrink-0" />
          )}
          <span>{state.globalSettings?.factoryName || "Spaces"}</span>
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
          <div
            className={accordionHeaderClass}
            onClick={() => state.setIsOpenRepos((prev) => !prev)}
          >
            <ChevronRight
              size={chevronSize}
              className={`transform transition-transform ${state.isOpenRepos ? "rotate-90" : ""}`}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseSidebar?.();
                onNavigate?.("/projects");
              }}
              className={accordionButtonClass}
            >
              <span className="ml-2">
                {state.l.sectionProjects} ({state.repos.length})
              </span>
              <ArrowRight
                size={isMobile ? 20 : 12}
                className="text-muted-foreground flex-shrink-0"
              />
            </button>
          </div>

          {state.isOpenRepos && (
            <div className={isMobile ? "px-3 mt-1 space-y-1.5" : "px-2 mt-1 space-y-0.5"}>
              {state.loadingRepos ? (
                <div className="text-xs text-muted-foreground px-3 py-1 animate-pulse">
                  {state.l.loading}
                </div>
              ) : state.repos.length === 0 ? (
                <div className="text-xs text-muted-foreground px-3 py-1">{state.l.noProjects}</div>
              ) : (
                state.repos.map((repo) => {
                  const isActive =
                    state.isSessionView &&
                    state.activeProjectName === repo.id &&
                    !state.activeAgent;
                  return (
                    <ProjectListItem
                      key={repo.id || repo.name}
                      id={repo.id || repo.name}
                      name={repo.name}
                      avatarUrl={repo.avatarUrl}
                      isActive={isActive}
                      isMobile={isMobile}
                      itemClass={state.itemClass}
                      onClick={(id, name) => state.handleSelectRepoClick(id, name)}
                    />
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Agents Accordion */}
        <div className="flex flex-col">
          <div
            className={accordionHeaderClass}
            onClick={() => state.setIsOpenAgents((prev) => !prev)}
          >
            <ChevronRight
              size={chevronSize}
              className={`transform transition-transform ${state.isOpenAgents ? "rotate-90" : ""}`}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseSidebar?.();
                onNavigate?.("/agents");
              }}
              className={accordionButtonClass}
            >
              <span className="ml-2">
                {state.l.sectionAgents} ({state.agents.length})
              </span>
              <ArrowRight
                size={isMobile ? 20 : 12}
                className="text-muted-foreground flex-shrink-0"
              />
            </button>
          </div>

          {state.isOpenAgents && (
            <div className={isMobile ? "px-3 mt-1 space-y-1.5" : "px-2 mt-1 space-y-0.5"}>
              {state.loadingAgents ? (
                <div className="text-xs text-muted-foreground px-3 py-1 animate-pulse">
                  {state.l.loading}
                </div>
              ) : state.agents.length === 0 ? (
                <div className="text-xs text-muted-foreground px-3 py-1">{state.l.noAgents}</div>
              ) : (
                state.agents.map((agent) => {
                  const isActive = state.isSessionView && state.activeAgent?.id === agent.id;
                  const agentKanbanStatus = state.getAgentKanbanStatus(agent.id);
                  const kanbanStatus =
                    agentKanbanStatus === "working"
                      ? "working"
                      : agentKanbanStatus === "idle"
                        ? "idle"
                        : "other";
                  return (
                    <AgentListItem
                      key={agent.id}
                      id={agent.id}
                      name={agent.name}
                      avatarUrl={agent.avatarUrl}
                      isActive={isActive}
                      isMobile={isMobile}
                      kanbanStatus={kanbanStatus}
                      itemClass={state.itemClass}
                      onClick={state.handleSelectAgentClick}
                    />
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Teams Accordion */}
        <div className="flex flex-col">
          <div
            className={accordionHeaderClass}
            onClick={() => state.setIsOpenTeams((prev) => !prev)}
          >
            <ChevronRight
              size={chevronSize}
              className={`transform transition-transform ${state.isOpenTeams ? "rotate-90" : ""}`}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseSidebar?.();
                onNavigate?.("/teams");
              }}
              className={accordionButtonClass}
            >
              <span className="ml-2">
                {state.l.sectionTeams} ({state.teams.length})
              </span>
              <ArrowRight
                size={isMobile ? 20 : 12}
                className="text-muted-foreground flex-shrink-0"
              />
            </button>
          </div>

          {state.isOpenTeams && (
            <div className={isMobile ? "px-3 mt-1 space-y-1.5" : "px-2 mt-1 space-y-0.5"}>
              {state.loadingTeams ? (
                <div className="text-xs text-muted-foreground px-3 py-1 animate-pulse">
                  {state.l.loading}
                </div>
              ) : state.teams.length === 0 ? (
                <div className="text-xs text-muted-foreground px-3 py-1">{state.l.noTeams}</div>
              ) : (
                state.teams.map((team) => {
                  const isActive = state.isSessionView && state.activeTeam?.id === team.id;
                  return (
                    <TeamListItem
                      key={team.id}
                      id={team.id}
                      name={team.name}
                      avatarUrl={team.avatarUrl}
                      isActive={isActive}
                      isMobile={isMobile}
                      itemClass={state.itemClass}
                      onClick={state.handleSelectTeamClick}
                    />
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
                className={state.adminItemClass(isActive)}
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
