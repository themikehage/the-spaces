import { useCallback, useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoginPage } from "@/pages/LoginPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { SessionsProvider } from "@/contexts/SessionsContext";
import { MainLayout } from "./MainLayout";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useNavigationStack, type NavigationStackItem } from "@/hooks/useNavigationStack";
import { GlobalApprovalOverlay } from "@/components/approvals/GlobalApprovalOverlay";
import { WorkspaceContextProvider } from "@/hooks/useWorkspaceContext";
import { useRoutePage } from "@/router/useRoutePage";

export function AppRouter() {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const navigate = useCallback((path: string) => routerNavigate(path), [routerNavigate]);
  return <WorkspaceContextProvider>
    <AppRouterContent locationPath={location.pathname} navigate={navigate} />
  </WorkspaceContextProvider>;
}

interface AppRouterContentProps {
  locationPath: string;
  navigate: (path: string) => void;
}

function AppRouterContent({ locationPath, navigate }: AppRouterContentProps) {
  const page = useRoutePage();
  const { user, loading, needsSetup } = useAuth();
  const isMobileState = useIsMobile();
  const navigationStack = useNavigationStack();
  const recordedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (recordedPathRef.current === locationPath) return;
    recordedPathRef.current = locationPath;
    const item: NavigationStackItem = { type: page === "chat" ? "home" : "admin", page, path: locationPath };
    navigationStack.push(item);
  }, [locationPath, navigationStack.push, page]);

  const handleBack = useCallback(() => {
    const previous = navigationStack.stack[navigationStack.stack.length - 2];
    if (navigationStack.canGoBack && previous?.path) {
      navigationStack.pop();
      navigate(previous.path);
      return;
    }
    navigate("/");
  }, [navigate, navigationStack.canGoBack, navigationStack.stack]);

  if (loading) return <div className="h-dvh flex items-center justify-center bg-background"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (needsSetup) return <OnboardingPage />;
  if (!user) return <LoginPage />;

  return <SessionsProvider>
    <GlobalApprovalOverlay />
    <MainLayout page={page} onNavigate={navigate} isMobile={isMobileState.isMobile} canGoBack={navigationStack.canGoBack} onBack={handleBack}>
      <Outlet />
    </MainLayout>
  </SessionsProvider>;
}
