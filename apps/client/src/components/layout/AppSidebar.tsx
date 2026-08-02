// SPDX-License-Identifier: MIT
import { SessionSidebar } from "@/components/sidebar/SessionSidebar";
import type { RoutePage } from "@/router/useRoutePage";

interface Props {
  activePage?: RoutePage;
  onNavigate?: (path: string) => void;
  isMobile?: boolean;
  onCloseSidebar?: () => void;
}

export function AppSidebar({
  activePage = "chat",
  onNavigate,
  isMobile = false,
  onCloseSidebar,
}: Props) {
  return (
    <aside className="w-64 h-full border-r border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-950 flex flex-col">
      <SessionSidebar
        currentPage={activePage}
        onNavigate={onNavigate}
        isMobile={isMobile}
        onCloseSidebar={onCloseSidebar}
      />
    </aside>
  );
}
