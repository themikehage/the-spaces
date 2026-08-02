// SPDX-License-Identifier: MIT
import type { RoutePage } from "@/router/useRoutePage";
import { type ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

interface Props {
  children?: ReactNode;
  activePage?: RoutePage;
  activeSessionId?: string | null;
  activeProjectName?: string | null;
  activeAgentId?: string | null;
  activeTeamId?: string | null;
  onOpenSettings?: () => void;
  onSelectSession?: (id: string | null) => void;
  onSelectProject?: (name: string | null) => void;
  onSelectAgent?: (id: string | null) => void;
  onSelectTeam?: (id: string | null) => void;
}

export function AppShell({ children, activePage = "chat", onOpenSettings }: Props) {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-surface-50 dark:bg-surface-900 font-sans text-surface-900 dark:text-surface-100">
      <AppHeader onOpenSettings={onOpenSettings} />
      <div className="flex-1 flex overflow-hidden">
        <AppSidebar activePage={activePage} />
        <main className="flex-1 flex flex-col h-full overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
