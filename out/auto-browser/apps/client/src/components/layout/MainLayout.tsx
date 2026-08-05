import { useState, useEffect } from "react";
import { useSessions } from "../../hooks/useSessions.ts";
import { useProviders } from "../../hooks/useProviders.ts";
import { DesktopHeader } from "./DesktopHeader.tsx";
import { MobileTopbar } from "./MobileTopbar.tsx";
import { SessionSidebar } from "../sessions/SessionSidebar.tsx";
import { MobileSidebarOverlay } from "./MobileSidebarOverlay.tsx";
import { ChatArea } from "../chat/ChatArea.tsx";
import { WelcomeChatInput } from "../chat/WelcomeChatInput.tsx";
import { ProviderSettingsModal } from "../ProviderSettingsModal.tsx";
import { useIsMobile } from "./hooks/useIsMobile.ts";
import { BrowserViewerPanel } from "../BrowserViewerPanel.tsx";

export function MainLayout() {
  const { sessions, loading: sessionsLoading, create, remove } = useSessions();
  const { providers, activeProvider, save, testConnection } = useProviders();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  // Auto-select first session or create session if empty (Phase 6.3)
  useEffect(() => {
    if (sessionsLoading) return;
    if (sessions.length > 0 && !activeId) {
      setActiveId(sessions[0]?.id ?? null);
    }
  }, [sessions, sessionsLoading, activeId]);

  const handleNewSession = async (): Promise<string | null> => {
    const session = await create();
    if (session) {
      setActiveId(session.id);
      return session.id;
    }
    return null;
  };

  const handleDeleteSession = async (id: string) => {
    await remove(id);
    if (activeId === id) {
      const remaining = sessions.filter((s) => s.id !== id);
      setActiveId(remaining[0]?.id ?? null);
    }
  };

  return (
    <div className="h-dvh w-screen flex flex-col overflow-hidden bg-background text-foreground">
      {/* Header */}
      {isMobile ? (
        <MobileTopbar
          onToggleSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      ) : (
        <DesktopHeader
          activeProvider={activeProvider ?? null}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <SessionSidebar
            sessions={sessions}
            activeId={activeId}
            onSelect={setActiveId}
            onDelete={handleDeleteSession}
            onNew={handleNewSession}
            loading={sessionsLoading}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {activeId ? (
            <ChatArea
              key={activeId}
              sessionId={activeId}
              activeModelName={activeProvider?.activeModelId}
            />
          ) : (
            <WelcomeChatInput
              onSelectPrompt={async (promptText) => {
                const newId = await handleNewSession();
                if (newId) {
                  // Prompt will be sent in active session
                }
              }}
              onNewSession={handleNewSession}
            />
          )}
        </main>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobile && (
        <MobileSidebarOverlay
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          sessions={sessions}
          activeId={activeId}
          onSelect={setActiveId}
          onDelete={handleDeleteSession}
          onNew={handleNewSession}
          loading={sessionsLoading}
        />
      )}

      {/* Settings Modal */}
      <ProviderSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        providers={providers}
        onSave={save}
        onTest={testConnection}
      />

      {/* Independent browser viewport panel */}
      <BrowserViewerPanel />
    </div>
  );
}
