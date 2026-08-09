// SPDX-License-Identifier: MIT
import { ChatSkeleton } from "@/components/skeletons/ChatSkeleton";
import type { Message } from "@/hooks/useChatAreaState";
import { getSessionPath } from "@/lib/session-utils";
import { ChevronDown } from "lucide-react";
import type { TaskRunnerState } from "shared";
import { ChatInput, processAttachments } from "./ChatInput";
import { FloatingTasks } from "./FloatingTasks";
import { MessageList } from "./MessageList";
import { WelcomeChatInput } from "./WelcomeChatInput";

interface ChatBodyProps {
  sessionId: string | null;
  activeProjectName: string | null;
  activeAgent: { id: string; name: string; avatarUrl?: string } | null;
  activeTeam: { id: string; name: string } | null;
  messages: Message[];
  loadingMessages: boolean;
  streaming: boolean;
  connected: boolean;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
  showScrollButton: boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  chatInputRef: React.RefObject<HTMLTextAreaElement | null>;
  tasksState: TaskRunnerState;
  handleToggleTasksStatus: (newStatus: "running" | "paused") => Promise<void>;
  handleCancelTasks?: () => Promise<void>;
  serialTools: string[];
  settledApprovals: Record<string, "confirm" | "deny">;
  handleResolveApproval: (toolCallId: string, action: "confirm" | "deny") => void;
  handleSend: (
    message: string,
    option?: "steer" | "follow_up",
    tools?: string[],
    images?: Array<{ type: "image"; data: string; mimeType: string }>,
  ) => void;
  handleAbort: () => void;
  handleNavigate: (targetId: string) => Promise<void>;
  setSandboxTools: React.Dispatch<React.SetStateAction<string[]>>;
  contextUsage: any;
  compacting: boolean;
  handleCompact: () => void;
  getSuggestions: () => Array<{ label: string; promptText: string }>;
  isReadOnlyExecution: boolean;
  navigate: (path: string) => void;
}

export function ChatBody({
  sessionId,
  activeProjectName,
  activeAgent,
  activeTeam,
  messages,
  loadingMessages,
  streaming,
  connected,
  scrollContainerRef,
  handleScroll,
  showScrollButton,
  scrollToBottom,
  chatInputRef,
  tasksState,
  handleToggleTasksStatus,
  handleCancelTasks,
  serialTools,
  settledApprovals,
  handleResolveApproval,
  handleSend,
  handleAbort,
  handleNavigate,
  setSandboxTools,
  contextUsage,
  compacting,
  handleCompact,
  getSuggestions,
  isReadOnlyExecution,
  navigate,
}: ChatBodyProps) {
  const userMessages = messages
    .filter((m) => m.role === "user")
    .map((m) => {
      if (typeof m.content === "string") return m.content;
      if (Array.isArray(m.content)) {
        const textPart = m.content.find((c) => c.type === "text" && c.text);
        if (textPart?.text) return textPart.text;
      }
      return "";
    })
    .filter((text) => text.trim().length > 0);

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full relative">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto min-h-0 ${loadingMessages || messages.length === 0 ? "flex flex-col justify-center animate-fade-in" : ""}`}
      >
        {loadingMessages ? (
          <ChatSkeleton />
        ) : (
          <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 sm:py-4 w-full">
            {messages.length === 0 ? (
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
                sessionId={sessionId}
                onSend={async (msg, attachments) => {
                  if (attachments && attachments.length > 0) {
                    const result = await processAttachments(attachments, {
                      activeProjectName,
                      activeAgentId: activeAgent?.id,
                    });
                    handleSend(
                      msg + result.extraText,
                      undefined,
                      undefined,
                      result.images.length > 0 ? result.images : undefined,
                    );
                  } else {
                    handleSend(msg);
                  }
                }}
                suggestions={getSuggestions()}
                showModelSelector={true}
                allowAttachments={!activeTeam}
                disabled={streaming || !connected}
                loading={streaming}
                textareaRef={chatInputRef}
                entityType={
                  activeTeam
                    ? "team"
                    : activeAgent
                      ? "agent"
                      : activeProjectName
                        ? "project"
                        : "global"
                }
                entityId={
                  activeTeam
                    ? activeTeam.id
                    : activeAgent
                      ? activeAgent.id
                      : activeProjectName
                        ? activeProjectName
                        : "global"
                }
              />
            ) : (
              <>
                <FloatingTasks
                  tasksState={tasksState}
                  onToggleStatus={handleToggleTasksStatus}
                  onCancelTasks={handleCancelTasks}
                />
                <MessageList
                  messages={messages}
                  onNavigate={handleNavigate}
                  sessionId={sessionId}
                  activeProjectName={activeProjectName}
                  activeAgentId={activeAgent?.id}
                  activeAgentName={activeAgent?.name}
                  activeAgentAvatarUrl={activeAgent?.avatarUrl}
                  activeTeamId={activeTeam?.id}
                  serialTools={serialTools}
                  onOpenSubagentConsole={(
                    toolCallId: string,
                    targetType?: string,
                    targetId?: string,
                  ) => {
                    const prefix =
                      targetType === "delegate" ||
                      targetType === "agent" ||
                      targetType === "project" ||
                      targetType === "session"
                        ? "del"
                        : "sub";
                    const subSessionId = `${prefix}_${toolCallId}`;

                    let context: any = { activeAgent, activeProjectName, activeTeam };

                    if (targetType && targetId) {
                      if (activeTeam) {
                        context = { activeTeam };
                      } else {
                        context = {
                          activeAgent: targetType === "agent" ? { id: targetId, name: "" } : null,
                          activeProjectName: targetType === "project" ? targetId : null,
                        };
                      }
                    }

                    navigate(getSessionPath(subSessionId, context));
                  }}
                  settledApprovals={settledApprovals}
                  onResolveApproval={handleResolveApproval}
                />
                {!isReadOnlyExecution && <div className="h-[176px] flex-shrink-0" />}
              </>
            )}
          </div>
        )}
      </div>

      {showScrollButton && messages.length > 0 && (
        <button
          onClick={() => scrollToBottom("smooth")}
          className={`absolute ${isReadOnlyExecution ? "bottom-20" : "bottom-44"} left-1/2 -translate-x-1/2 z-20 flex items-center justify-center w-9 h-9 rounded-full bg-surface border border-border text-accent shadow-xl hover:bg-surface-hover active:scale-95 transition-all duration-200`}
        >
          <ChevronDown size={16} className="animate-bounce" />
        </button>
      )}

      {messages.length > 0 && !isReadOnlyExecution && (
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-t from-bg to-transparent pointer-events-none" />
          <ChatInput
            onSend={handleSend}
            onAbort={handleAbort}
            streaming={streaming}
            sessionId={sessionId}
            onToolsChange={setSandboxTools}
            runnerActive={tasksState.status === "running" || tasksState.status === "decomposing"}
            activeProjectName={activeProjectName}
            activeAgentId={activeAgent?.id}
            entityType={
              activeTeam ? "team" : activeAgent ? "agent" : activeProjectName ? "project" : "global"
            }
            entityId={
              activeTeam
                ? activeTeam.id
                : activeAgent
                  ? activeAgent.id
                  : activeProjectName
                    ? activeProjectName
                    : "global"
            }
            contextUsage={contextUsage}
            onCompact={handleCompact}
            compacting={compacting}
            textareaRef={chatInputRef}
            disabled={!connected}
            userMessages={userMessages}
          />
        </div>
      )}
    </div>
  );
}
