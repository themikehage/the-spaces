// SPDX-License-Identifier: MIT
import { GlobalApprovalOverlay } from "@/components/approvals/GlobalApprovalOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { SessionsProvider } from "@/contexts/SessionsContext";
import { useNavigationStack, type NavigationStackItem } from "@/hooks/useNavigationStack";
import { WorkspaceContextProvider } from "@/hooks/useWorkspaceContext";
import { LoginPage } from "@/pages/LoginPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { useRoutePage } from "@/router/useRoutePage";
import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppShell } from "./AppShell";

export function AppRouter() {
  const location = useLocation();
  return (
    <WorkspaceContextProvider>
      <AppRouterContent locationPath={location.pathname} />
    </WorkspaceContextProvider>
  );
}

interface AppRouterContentProps {
  locationPath: string;
}

function AppRouterContent({ locationPath }: AppRouterContentProps) {
  const page = useRoutePage();
  const { user, loading, needsSetup } = useAuth();
  const navigationStack = useNavigationStack();
  const recordedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (recordedPathRef.current === locationPath) return;
    recordedPathRef.current = locationPath;
    const item: NavigationStackItem = {
      type: page === "chat" ? "home" : "admin",
      page,
      path: locationPath,
    };
    navigationStack.push(item);
  }, [locationPath, navigationStack.push, page]);

  if (loading)
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  if (needsSetup) return <OnboardingPage />;
  if (!user) return <LoginPage />;

  return (
    <SessionsProvider>
      <GlobalApprovalOverlay />
      <AppShell activePage={page}>
        <Outlet />
      </AppShell>
    </SessionsProvider>
  );
}
