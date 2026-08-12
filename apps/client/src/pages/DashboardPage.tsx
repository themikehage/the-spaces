// SPDX-License-Identifier: MIT
import { EntityAvatar } from "@/components/shared/EntityAvatar";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Info, Trash2 } from "lucide-react";
import { CreateProjectModal, DeleteProjectModal, ProjectInfoModal } from "./DashboardModals";

interface Props {
  onNavigate?: (path: string) => void;
  onSelectProject: (projectId: string | null, projectName: string | null) => void;
}

export function DashboardPage({ onNavigate, onSelectProject }: Props) {
  const state = useDashboardData({ onNavigate });

  return (
    <div className="h-full flex flex-col bg-bg overflow-y-auto pb-14 scrollbar-thin">
      <div className="max-w-5xl mx-auto px-5 py-8 sm:py-10 w-full">
        {state.error && (
          <div className="p-4 bg-error/10 border border-error/20 text-error rounded-xl text-xs font-semibold">
            {state.error}
          </div>
        )}

        {state.loading ? (
          <DashboardSkeleton />
        ) : (
          <div className="flex flex-col gap-10">
            {/* Seccion 1: Agentes — scroll horizontal */}
            <div id="agents-sec" className="order-4 space-y-3 pt-1">
              <div className="flex justify-between items-center">
                <h2 className="text-foreground font-extrabold text-base sm:text-lg tracking-tight font-display">
                  {state.l.agentsSection}
                </h2>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate("/agents")}
                    className="text-[11px] text-accent hover:underline font-bold"
                  >
                    {state.l.viewAll || "View All"}
                  </button>
                )}
              </div>
              <div className="flex overflow-x-auto gap-4 pb-1 scrollbar-none">
                {state.agents.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => onNavigate?.(`/agents/${agent.id}/chat`)}
                    className="flex flex-col items-center text-center w-[80px] shrink-0 group relative cursor-pointer"
                  >
                    <div className="relative mb-1.5">
                      <EntityAvatar
                        name={agent.name}
                        avatarUrl={agent.avatarUrl}
                        size="2xl"
                        type="agent"
                        className="group-hover:scale-105 transition-transform duration-300 border border-input/20 shadow-md"
                      />
                      <span
                        className={`absolute bottom-0.5 right-1 w-3 h-3 rounded-full border-2 border-surface ${
                          agent.status === "streaming" || agent.status === "task-running"
                            ? "bg-warning animate-pulse"
                            : agent.status === "idle"
                              ? "bg-accent"
                              : "bg-text-secondary/30"
                        }`}
                      />
                    </div>
                    <h3 className="font-extrabold text-[11px] text-foreground truncate w-full group-hover:text-accent transition-colors leading-tight">
                      {agent.name}
                    </h3>
                  </div>
                ))}

                {state.agents.length === 0 && (
                  <div className="w-full bg-surface/30 rounded-2xl p-6 text-center border border-input/10 border-dashed">
                    <p className="text-xs text-text-secondary">No agents</p>
                  </div>
                )}
              </div>
            </div>

            {/* Seccion 2: Sesiones Recientes */}
            <div id="sessions-sec" className="order-1 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-foreground font-bold text-base tracking-tight font-display">
                    {state.l.sessionsSection}
                  </h2>
                  <p className="text-[11px] text-text-secondary mt-0.5">{state.l.operationalNow}</p>
                </div>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate("/sessions")}
                    className="text-xs text-primary hover:underline font-semibold"
                  >
                    {state.l.viewAll || "View All"}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {state.activeSessions.map((session) => {
                  let statusColor = "bg-text-secondary/40";
                  if (session.status === "streaming") statusColor = "bg-warning animate-pulse";
                  else if (session.status === "task-running")
                    statusColor = "bg-primary animate-pulse";
                  else if (session.status === "active") statusColor = "bg-accent";

                  return (
                    <button
                      key={session.id}
                      onClick={() => state.handleOpenSession(session)}
                      className="flex items-center text-left bg-surface/65 hover:bg-surface border border-input/60 rounded-xl overflow-hidden hover:border-primary/40 transition-colors cursor-pointer h-[68px] group relative"
                    >
                      <div className="w-[68px] h-[68px] bg-surface-hover flex-shrink-0 flex items-center justify-center relative border-r border-input/40">
                        <EntityAvatar
                          name={session.projectId || session.name}
                          avatarUrl={state.avatarLookup(session)}
                          size="full"
                          type={session.teamId ? "team" : session.agentId ? "agent" : "project"}
                          className="rounded-none w-full h-full"
                        />
                        <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full z-10 shadow-xs" />
                      </div>

                      <div className="flex-1 min-w-0 px-3 py-1">
                        <h3 className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors leading-tight">
                          {session.name}
                        </h3>
                        <p className="text-[10px] text-text-secondary truncate mt-0.5 font-medium">
                          {session.projectId
                            ? `Project: ${session.projectId}`
                            : session.teamId
                              ? "Team"
                              : "Agent"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
                          <span className="text-[10px] text-text-secondary font-medium">
                            {state.formatTime(session.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {state.activeSessions.length === 0 && (
                  <div className="col-span-full bg-surface/50 border border-input/10 rounded-xl py-6 text-center">
                    <p className="text-[11px] text-text-secondary font-medium">
                      {state.l.noActiveSessions}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div id="projects-sec" className="order-2 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-foreground font-bold text-base tracking-tight font-display">
                    {state.l.projectsSection}
                  </h2>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    {state.l.recentWorkspaces}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate("/projects")}
                      className="text-xs text-primary hover:underline font-semibold"
                    >
                      {state.l.viewAll || "View All"}
                    </button>
                  )}
                  <button
                    onClick={() => state.setShowModal(true)}
                    className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md font-semibold"
                  >
                    + {state.l.newProject.replace("+ New ", "").replace("+ Nuevo ", "")}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {state.repos.map((repo) => (
                  <div
                    key={repo.name}
                    className="bg-surface/55 hover:bg-surface border border-input/60 hover:border-primary/40 rounded-xl px-3 py-3 transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="w-10 h-10 shrink-0 relative rounded-lg overflow-hidden bg-surface-hover">
                        <EntityAvatar
                          name={repo.name}
                          avatarUrl={repo.avatarUrl}
                          size="full"
                          type="project"
                          className="rounded-none w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-xs text-foreground truncate leading-tight">
                          {repo.name}
                        </h3>
                        <p className="text-[10px] text-text-secondary mt-1">
                          {state.formatTime(repo.lastModified)}
                        </p>
                      </div>
                      <button
                        onClick={() => state.handleStartInfo(repo)}
                        className="p-2 text-text-secondary hover:text-foreground hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
                        title={state.l.infoModalTitle}
                      >
                        <Info size={14} />
                      </button>
                      <button
                        onClick={() => state.handleDeleteRepo(repo)}
                        className="p-2 text-text-secondary hover:text-error hover:bg-error/10 rounded-md transition-colors cursor-pointer"
                        title={state.l.deleteTooltip}
                      >
                        <Trash2 size={13} />
                      </button>
                      <button
                        onClick={() => onSelectProject(repo.id || repo.name, repo.name)}
                        className="px-3 py-1.5 bg-primary text-primary-foreground hover:opacity-90 rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        {state.l.open}
                      </button>
                    </div>
                  </div>
                ))}

                {state.repos.length === 0 && (
                  <div className="w-[200px] shrink-0 bg-surface/30 rounded-2xl p-6 text-center border border-input/10 border-dashed sm:w-auto sm:col-span-full">
                    <p className="text-xs text-text-secondary">{state.l.emptyTitle}</p>
                    <button
                      onClick={() => state.setShowModal(true)}
                      className="mt-3 px-3 py-1.5 bg-accent/15 hover:bg-accent/25 text-accent rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                    >
                      {state.l.emptyButton}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div id="teams-sec" className="order-3 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-foreground font-bold text-base tracking-tight font-display">
                    {state.l.teamsSection}
                  </h2>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    {state.l.membersCount.replace(
                      "{count}",
                      String(
                        state.teams.reduce((total, team) => total + (team.members?.length || 0), 0),
                      ),
                    )}
                  </p>
                </div>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate("/teams")}
                    className="text-xs text-primary hover:underline font-semibold"
                  >
                    {state.l.viewAll || "View All"}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {state.teams.map((team) => (
                  <div
                    key={team.id}
                    className="bg-surface/55 hover:bg-surface border border-input/60 hover:border-primary/40 rounded-xl px-3 py-3 flex items-center gap-3 transition-colors"
                  >
                    <div className="w-10 h-10 shrink-0 relative rounded-lg overflow-hidden bg-surface-hover">
                      <EntityAvatar
                        name={team.name}
                        avatarUrl={team.avatarUrl}
                        size="full"
                        type="team"
                        className="rounded-none w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-xs text-foreground truncate leading-tight">
                        {team.name}
                      </h3>
                      <p className="text-[10px] text-text-secondary mt-1 truncate">
                        {team.description || team.teamType || state.l.teamsSection}
                      </p>
                    </div>
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate(`/teams/${team.id}/chat`)}
                        className="px-3 py-1.5 bg-background hover:bg-primary hover:text-primary-foreground text-foreground rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        {state.l.open}
                      </button>
                    )}
                  </div>
                ))}

                {state.teams.length === 0 && (
                  <div className="w-[200px] shrink-0 bg-surface/30 rounded-2xl p-6 text-center border border-input/10 border-dashed sm:w-auto sm:col-span-full">
                    <p className="text-xs text-text-secondary">No teams</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <CreateProjectModal
        showModal={state.showModal}
        setShowModal={state.setShowModal}
        projectName={state.projectName}
        setRepoName={state.setRepoName}
        cloneUrl={state.cloneUrl}
        setCloneUrl={state.setCloneUrl}
        avatarUrl={state.avatarUrl}
        setAvatarUrl={state.setAvatarUrl}
        tag={state.tag}
        setTag={state.setTag}
        submitting={state.submitting}
        submitError={state.submitError}
        setSubmitError={state.setSubmitError}
        handleCreateRepo={state.handleCreateRepo}
        l={state.l}
      />

      <DeleteProjectModal
        deleteRepo={state.deleteRepo}
        setDeleteRepo={state.setDeleteRepo}
        confirmDeleteName={state.confirmDeleteName}
        setConfirmDeleteName={state.setConfirmDeleteName}
        deleting={state.deleting}
        handleDeleteRepoSubmit={state.handleDeleteRepoSubmit}
        l={state.l}
      />

      <ProjectInfoModal
        infoProject={state.infoProject}
        setInfoProject={state.setInfoProject}
        handleUpdateInfo={state.handleUpdateInfo}
        handleUploadProjectAvatar={state.handleUploadProjectAvatar}
        handleDeleteProjectAvatar={state.handleDeleteProjectAvatar}
      />
    </div>
  );
}
