// SPDX-License-Identifier: MIT
import { SessionPopover } from "@/components/sidebar/SessionPopover";
import { useMainLayoutState } from "@/hooks/useMainLayoutState";
import { attentionStore } from "@/lib/attention/attention-store";
import type { RoutePage } from "@/router/useRoutePage";
import {
  Clock,
  Download,
  Folder,
  Globe,
  List,
  MessageSquare,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { Breadcrumbs } from "./header/Breadcrumbs";
import { DesktopHeader } from "./header/DesktopHeader";
import { LayoutModals } from "./LayoutModals";
import { MobileBottomBar } from "./mobile/MobileBottomBar";
import { MobileTopbar } from "./MobileTopbar";
import { SidebarColumn } from "./SidebarColumn";
import { ContextTabBar } from "./tabs/ContextTabBar";

interface Props {
  page: RoutePage;
  onNavigate: (path: string) => void;
  children: ReactNode;
  isMobile?: boolean;
  canGoBack?: boolean;
  onBack?: () => void;
}

export function MainLayout({
  page,
  onNavigate,
  children,
  isMobile = false,
  canGoBack = false,
  onBack,
}: Props) {
  useEffect(() => {
    attentionStore.start();
  }, []);

  const state = useMainLayoutState({
    page,
    onNavigate,
    isMobile,
    onBack,
  });

  const contentElement = state.resolvingSession ? (
    <div className="absolute inset-0 flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  ) : (
    children
  );

  const contextTabs = useMemo(() => {
    let basePath = "";
    if (state.activeAgent) basePath = `/agents/${state.activeAgent.id}`;
    else if (state.activeTeam) basePath = `/teams/${state.activeTeam.id}`;
    else if (state.activeProjectId) basePath = `/projects/${state.activeProjectId}`;

    const list = [
      {
        id: "chat",
        label: state.l.tabChat,
        path: state.sessionId
          ? `${basePath}/session/${state.sessionId}`
          : basePath
            ? `${basePath}/chat`
            : "/",
        icon: <MessageSquare size={14} />,
      },
    ];

    if (!state.isNegotiationTeam) {
      list.push(
        {
          id: "delegations",
          label: state.l.tabDelegations || "Delegations",
          path: state.sessionId
            ? `${basePath}/session/${state.sessionId}/delegations`
            : basePath
              ? `${basePath}/delegations`
              : "/delegations",
          icon: <Users size={14} />,
        },
        {
          id: "workspace",
          label: state.l.tabFiles,
          path: basePath ? `${basePath}/workspace` : "/workspace",
          icon: <Folder size={14} />,
        },
        {
          id: "timeline",
          label: state.l.tabTimeline || "Timeline",
          path: state.sessionId
            ? `${basePath}/session/${state.sessionId}/timeline`
            : basePath
              ? `${basePath}/timeline`
              : "/timeline",
          icon: <Clock size={14} />,
        },
      );
    }

    if (state.activeProjectName || state.activeProjectId) {
      list.push({
        id: "preview",
        label: state.l.tabPreview,
        path: basePath ? `${basePath}/preview` : "/preview",
        icon: <Globe size={14} />,
      });
    }

    if (state.activeTeam) {
      list.push({
        id: "org",
        label: state.l.tabOrgChart,
        path: `${basePath}/org`,
        icon: <List size={14} />,
      });
    }

    return list;
  }, [
    state.sessionId,
    state.activeProjectId,
    state.activeProjectName,
    state.activeAgent,
    state.activeTeam,
    state.isNegotiationTeam,
    state.l,
  ]);

  const breadcrumbsElement = (
    <Breadcrumbs
      page={page}
      activeProjectId={state.activeProjectId}
      activeProjectName={state.activeProjectName}
      activeAgent={state.activeAgent}
      activeTeam={state.activeTeam}
      onNavigate={onNavigate}
      l={state.l}
      factoryName={state.globalSettings?.factoryName}
      sessionTitle={state.activeSessionTitle}
    />
  );

  const rightToolbarElement = (
    <>
      {!isMobile && (
        <button
          onClick={state.handleQuickCreate}
          disabled={state.quickCreating}
          className="flex items-center gap-1 px-1.5 py-1 rounded-md text-[11px] font-semibold border border-border hover:bg-card text-muted-foreground hover:text-foreground transition-all cursor-pointer bg-card/10 disabled:opacity-50"
          title="Nueva sesion"
        >
          {state.quickCreating ? (
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <Plus size={14} />
          )}
        </button>
      )}

      {state.activeProjectId && (
        <button
          type="button"
          onClick={() => state.setShowAssignmentModal(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border border-border hover:bg-card text-muted-foreground hover:text-foreground transition-all cursor-pointer bg-card/10"
          title="Manage project team"
        >
          <Users size={13} className="text-primary" />
        </button>
      )}

      {state.sessionId && (
        <div className="relative flex items-center">
          <button
            onClick={() => state.setExportDropdownOpen((p) => !p)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border border-border hover:bg-card text-muted-foreground hover:text-foreground transition-all cursor-pointer bg-card/10"
            title="Exportar conversación"
          >
            <Download size={12} className="text-muted-foreground" />
          </button>
          {state.exportDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-transparent"
                onClick={() => state.setExportDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-44 bg-card border border-input rounded-xl shadow-2xl flex flex-col z-50 animate-scale-in overflow-hidden p-1">
                <button
                  onClick={() => state.handleExport("markdown")}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:bg-card-hover hover:text-foreground transition-all cursor-pointer font-sans"
                >
                  Exportar Markdown (.md)
                </button>
                <button
                  onClick={() => state.handleExport("jsonl")}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:bg-card-hover hover:text-foreground transition-all cursor-pointer font-sans"
                >
                  Exportar JSONL (.jsonl)
                </button>
                <button
                  onClick={() => state.handleExport("json")}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:bg-card-hover hover:text-foreground transition-all cursor-pointer font-sans"
                >
                  Exportar JSON (.json)
                </button>
              </div>
            </>
          )}
        </div>
      )}
      <button
        onClick={() => state.setSessionPopoverOpen((p) => !p)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold border border-border hover:bg-card text-muted-foreground hover:text-foreground transition-all cursor-pointer bg-card/10"
        title={state.l.titleSessions}
      >
        <Clock size={12} />
      </button>
      <SessionPopover
        isOpen={state.sessionPopoverOpen}
        onClose={() => state.setSessionPopoverOpen(false)}
        activeSessionId={state.sessionId}
        activeProjectName={state.activeProjectId}
        activeProjectFriendlyName={state.activeProjectName}
        activeAgent={state.activeAgent}
        activeTeam={state.activeTeam}
        onSelectSession={state.handleSelectSession}
        onNewSession={state.handleNewSession}
      />
      {state.activeAgent && state.activeAgent.id !== "lab-architect" && (
        <button
          onClick={() => state.setShowAgentEdit(true)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-all cursor-pointer"
          title="Configurar agente"
        >
          <Settings size={14} />
        </button>
      )}
      {state.activeProjectId && (
        <button
          onClick={() => state.setShowProjectEdit(true)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-all cursor-pointer"
          title="Configurar proyecto"
        >
          <Settings size={14} />
        </button>
      )}
      {state.activeTeam && (
        <button
          onClick={() => state.setShowTeamEdit(true)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-all cursor-pointer"
          title="Configurar equipo"
        >
          <Settings size={14} />
        </button>
      )}
      {!state.rawActiveAgent && !state.activeProjectId && !state.activeTeam && page === "chat" && (
        <button
          onClick={() => state.setShowGlobalEdit(true)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-all cursor-pointer"
          title="Configurar Spaces"
        >
          <Settings size={14} />
        </button>
      )}
    </>
  );

  const sharedTabBar = (
    <ContextTabBar
      page={page}
      contextTabs={contextTabs}
      onNavigateTab={onNavigate}
      rightSlot={rightToolbarElement}
    />
  );

  return (
    <>
      <div className="h-dvh flex flex-col bg-background text-foreground overflow-hidden font-sans">
        {isMobile ? (
          <MobileTopbar
            isMobile={isMobile}
            isHome={state.isHome}
            title={state.mobileTitle}
            canGoBack={canGoBack}
            onBack={state.handleBackClick}
            onMenuToggle={() => state.setSidebarOpen((prev) => !prev)}
            onNewSession={state.handleQuickCreate}
            onNavigate={onNavigate}
            showNewSessionButton={state.showNewSessionButton}
            l={state.l}
            wsState={state.wsState}
          />
        ) : (
          <DesktopHeader
            onHome={() => {
              state.onSelectProject(null, null);
              onNavigate("/dashboard");
            }}
            onToggleSidebar={() => state.setSidebarOpen((p) => !p)}
            onNavigate={onNavigate}
            wsState={state.wsState}
            breadcrumbs={breadcrumbsElement}
          />
        )}

        <div className="flex flex-1 min-h-0 relative overflow-hidden">
          <SidebarColumn
            currentPage={page}
            onNavigate={onNavigate}
            isMobile={isMobile}
            sidebarOpen={state.sidebarOpen}
            isHome={state.isHome}
            onCloseSidebar={() => state.setSidebarOpen(false)}
          />

          <main
            className={
              isMobile
                ? `absolute inset-x-0 top-0 ${
                    state.sidebarOpen ? "bottom-14" : "bottom-0"
                  } z-30 flex flex-col bg-background`
                : "flex-1 min-w-0 flex flex-col h-full bg-background"
            }
          >
            {state.isContextView && sharedTabBar}
            <div className="flex-1 min-h-0 relative">{contentElement}</div>
          </main>

          {isMobile && state.sidebarOpen && (
            <MobileBottomBar
              currentPage={page}
              isHome={state.isHome}
              onNavigate={onNavigate}
              setSidebarOpen={state.setSidebarOpen}
            />
          )}
        </div>
      </div>

      <LayoutModals
        showAgentEdit={state.showAgentEdit}
        setShowAgentEdit={state.setShowAgentEdit}
        activeAgent={state.activeAgent}
        handleUpdateAgent={state.handleUpdateAgent}
        uploadAvatar={state.uploadAvatar}
        deleteAvatar={state.deleteAvatar}
        showProjectEdit={state.showProjectEdit}
        setShowProjectEdit={state.setShowProjectEdit}
        activeProjectId={state.activeProjectId}
        activeProjectName={state.activeProjectName}
        activeProjectData={state.activeProjectData}
        handleUpdateProject={state.handleUpdateProject}
        handleUploadProjectAvatar={state.handleUploadProjectAvatar}
        handleDeleteProjectAvatar={state.handleDeleteProjectAvatar}
        handleDeleteProject={state.handleDeleteProject}
        showTeamEdit={state.showTeamEdit}
        setShowTeamEdit={state.setShowTeamEdit}
        activeTeamData={state.activeTeamData}
        handleUpdateTeam={state.handleUpdateTeam}
        handleUploadTeamAvatar={state.handleUploadTeamAvatar}
        handleDeleteTeamAvatar={state.handleDeleteTeamAvatar}
        handleDeleteTeam={state.handleDeleteTeam}
        showGlobalEdit={state.showGlobalEdit}
        setShowGlobalEdit={state.setShowGlobalEdit}
        showAssignmentModal={state.showAssignmentModal}
        setShowAssignmentModal={state.setShowAssignmentModal}
      />
    </>
  );
}
