// SPDX-License-Identifier: MIT
import { useChatAreaState } from "@/hooks/useChatAreaState";
import { ChatBody } from "./ChatBody";
import { ChatHeader } from "./ChatHeader";
import { WelcomeChatInput } from "./WelcomeChatInput";

interface Props {
  sessionId: string | null;
  activeProjectName: string | null;
  activeProjectId?: string | null;
  activeAgent?: { id: string; name: string; avatarUrl?: string } | null;
  activeTeam?: { id: string; name: string } | null;
  onSessionMetadataChange?: (metadata: any) => void;
}

export function ChatArea({
  sessionId,
  activeProjectName,
  activeProjectId = null,
  activeAgent = null,
  activeTeam = null,
  onSessionMetadataChange,
}: Props) {
  const state = useChatAreaState({
    sessionId,
    activeProjectName,
    activeProjectId,
    activeAgent,
    activeTeam,
    onSessionMetadataChange,
  });

  if (!sessionId) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-bg relative">
        <WelcomeChatInput
          title={
            activeTeam
              ? `#${activeTeam.name}`
              : activeAgent
                ? `${activeAgent.name}`
                : activeProjectName
                  ? `${activeProjectName}`
                  : undefined
          }
          sessionId={null}
          onSend={(msg, attachments) => state.createSessionAndSend(msg, attachments)}
          suggestions={state.getSuggestions()}
          showModelSelector={true}
          activeTools={state.welcomeTools}
          onToolsChange={(t, mode) => {
            state.setHasUserModifiedWelcome(true);
            state.setWelcomeTools(t);
            if (mode) state.setWelcomeExecutionMode(mode);
          }}
          executionMode={state.welcomeExecutionMode}
          activeSkills={state.welcomeSkills}
          onSkillsChange={(s) => {
            state.setHasUserModifiedWelcome(true);
            state.setWelcomeSkills(s);
          }}
          allowAttachments={!activeTeam}
          disabled={state.streaming || !state.connected}
          loading={state.streaming}
          textareaRef={state.chatInputRef}
          entityType={state.entityType}
          entityId={state.entityId}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-w-0 overflow-hidden">
      <ChatHeader
        error={state.error}
        setError={state.setError}
        connected={state.connected}
        isReadOnlyExecution={state.isReadOnlyExecution}
        isChannelExecution={state.isChannelExecution}
      />
      <ChatBody
        sessionId={sessionId}
        activeProjectName={activeProjectName}
        activeProjectId={activeProjectId}
        activeAgent={activeAgent}
        activeTeam={activeTeam}
        messages={state.messages}
        loadingMessages={state.loadingMessages}
        streaming={state.streaming}
        connected={state.connected}
        scrollContainerRef={state.scrollContainerRef}
        handleScroll={state.handleScroll}
        showScrollButton={state.showScrollButton}
        scrollToBottom={state.scrollToBottom}
        chatInputRef={state.chatInputRef}
        tasksState={state.tasksState}
        handleToggleTasksStatus={state.handleToggleTasksStatus}
        handleCancelTasks={state.handleCancelTasks}
        serialTools={state.serialTools}
        settledApprovals={state.settledApprovals}
        handleResolveApproval={state.handleResolveApproval}
        handleSend={state.handleSend}
        handleAbort={state.handleAbort}
        handleNavigate={state.handleNavigate}
        setSandboxTools={state.setSandboxTools}
        contextUsage={state.contextUsage}
        compacting={state.compacting}
        handleCompact={state.handleCompact}
        getSuggestions={state.getSuggestions}
        isReadOnlyExecution={state.isReadOnlyExecution}
        navigate={state.navigate}
      />
    </div>
  );
}
