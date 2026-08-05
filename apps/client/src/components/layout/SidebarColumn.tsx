// SPDX-License-Identifier: MIT
import { SessionSidebar } from "@/components/sidebar/SessionSidebar";
import type { RoutePage } from "@/router/useRoutePage";
import { DesktopSidebar } from "./sidebar/DesktopSidebar";
import { MobileSidebarOverlay } from "./sidebar/MobileSidebarOverlay";

interface SidebarColumnProps {
  currentPage: RoutePage;
  onNavigate: (path: string) => void;
  isMobile?: boolean;
  sidebarOpen: boolean;
  isHome?: boolean;
  onCloseSidebar: () => void;
}

export function SidebarColumn({
  currentPage,
  onNavigate,
  isMobile = false,
  sidebarOpen,
  isHome = false,
  onCloseSidebar,
}: SidebarColumnProps) {
  const sessionSidebarElement = (
    <SessionSidebar
      currentPage={currentPage}
      onNavigate={onNavigate}
      isMobile={isMobile}
      onCloseSidebar={onCloseSidebar}
    />
  );

  if (isMobile) {
    return (
      <MobileSidebarOverlay
        sidebarOpen={sidebarOpen}
        isHome={isHome}
        onClose={onCloseSidebar}
        onNavigate={onNavigate}
      >
        {sessionSidebarElement}
      </MobileSidebarOverlay>
    );
  }

  return <DesktopSidebar sidebarOpen={sidebarOpen}>{sessionSidebarElement}</DesktopSidebar>;
}
