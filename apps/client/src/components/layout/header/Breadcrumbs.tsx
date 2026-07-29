// SPDX-License-Identifier: MIT
import type { RoutePage } from "@/router/useRoutePage";

interface BreadcrumbsProps {
  page: RoutePage;
  activeProjectId: string | null;
  activeProjectName: string | null;
  activeAgent: { id: string; name: string } | null;
  activeTeam?: { id: string; name: string } | null;
  onNavigate: (path: string) => void;
  l: Record<string, string>;
  factoryName?: string;
  sessionTitle?: string | null;
  onNavigateParentSession?: () => void;
}

export function Breadcrumbs({
  page,
  activeProjectId,
  activeProjectName,
  activeAgent,
  activeTeam = null,
  onNavigate,
  l,
  factoryName = "Spaces",
  sessionTitle = null,
  onNavigateParentSession,
}: BreadcrumbsProps) {
  let items: { label: string; path?: string; isSessionTitle?: boolean }[] = [];

  const currentProject = activeProjectId;
  const currentProjectFriendly = activeProjectName || activeProjectId;
  const currentAgent = activeAgent;
  const currentTeam = activeTeam;

  if (currentProject) {
    items = [
      { label: l.breadProyectos || "Projects", path: "/projects" },
      { label: currentProjectFriendly || currentProject, path: `/projects/${currentProject}/chat` },
    ];
  } else if (currentAgent) {
    items = [
      { label: l.breadAgentes || "Agents", path: "/agents" },
      { label: currentAgent.name, path: `/agents/${currentAgent.id}/chat` },
    ];
  } else if (currentTeam) {
    items = [
      { label: l.breadTeams || "Teams", path: "/teams" },
      { label: currentTeam.name, path: `/teams/${currentTeam.id}/chat` },
    ];
  } else {
    items = [{ label: factoryName, path: "/" }];
  }

  if (page === "workspace") {
    items.push({ label: l.tabFiles || "Files" });
  } else if (page === "preview") {
    items.push({ label: l.tabPreview || "Preview" });
  } else if (page === "chat") {
    items.push({ label: sessionTitle || l.tabChat || "Chat", isSessionTitle: true });
  } else if (page === "settings") {
    items = [{ label: l.breadSettings || "Settings" }];
  } else if (page === "skills") {
    items = [{ label: l.breadSkills || "Skills" }];
  } else if (page === "logs") {
    items = [{ label: l.breadLogs || "Logs" }];
  } else if (page === "projects") {
    items = [{ label: l.breadProyectos || "Projects" }];
  } else if (page === "agents") {
    items = [{ label: l.breadAgentes || "Agents" }];
  } else if (page === "teams") {
    items = [{ label: l.breadTeams || "Teams" }];
  } else if (page === "team") {
    items = [{ label: l.breadTeams || "Teams", path: "/teams" }];
    if (activeTeam) {
      items.push({ label: activeTeam.name });
    }
  } else if (page === "org") {
    items.push({ label: l.tabOrgChart || "Org Chart" });
  } else if (page === "sessions") {
    items = [{ label: l.breadSessions || "Sessions" }];
  } else if (page === "analytics") {
    items = [{ label: l.breadAnalytics || "Analytics" }];
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm min-w-0"
    >
      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary inline-block flex-shrink-0" />
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={index} className="flex items-center gap-1 sm:gap-1.5 min-w-0">
            {index > 0 && (
              <span className="text-muted-foreground font-normal select-none px-0.5 sm:px-1 flex-shrink-0">
                /
              </span>
            )}
            {onNavigateParentSession && isLast && item.isSessionTitle && (
              <button
                onClick={onNavigateParentSession}
                className="p-0.5 rounded hover:bg-card-hover text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                title="Volver a la sesión padre"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5L8.25 12l7.5-7.5"
                  />
                </svg>
              </button>
            )}
            {item.path && !isLast ? (
              <button
                onClick={() => onNavigate(item.path!)}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium cursor-pointer truncate max-w-[120px] sm:max-w-[200px]"
              >
                {item.label}
              </button>
            ) : (
              <span
                title={item.label}
                className={`truncate ${
                  isLast
                    ? "font-semibold text-foreground max-w-[160px] sm:max-w-[320px]"
                    : "text-muted-foreground font-medium max-w-[120px] sm:max-w-[200px]"
                }`}
              >
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
