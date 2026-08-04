// SPDX-License-Identifier: MIT
import { useToast } from "@/contexts/ToastContext";
import { useChat } from "@/hooks/useChat";
import { useEntityConfig } from "@/hooks/useEntityConfig";
import { useWebSocket } from "@/hooks/useWebSocket";
import { apiFetch } from "@/lib/api";
import { buildCreateSessionBody, getSessionName, getSessionPath } from "@/lib/session-utils";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChatInput, processAttachments } from "./ChatInput";
import { MessageList } from "./MessageList";
import { WelcomeChatInput } from "./WelcomeChatInput";

interface Props {
  sessionId: string | null;
  activeProjectName?: string | null;
  activeProjectId?: string | null;
  activeAgent?: { id: string; name: string; avatarUrl?: string } | null;
  activeTeam?: { id: string; name: string } | null;
  onSessionMetadataChange?: (metadata: any) => void;
}

export function ChatArea({
  sessionId,
  activeProjectName = null,
  activeProjectId = null,
  activeAgent = null,
  activeTeam = null,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const { connected } = useWebSocket(sessionId);
  const { messages, streaming, error, send, abort } = useChat(sessionId);
  const initialMessageSentRef = useRef(false);

  const entityType = activeTeam
    ? "team"
    : activeAgent
      ? "agent"
      : activeProjectId || activeProjectName
        ? "project"
        : "global";
  const entityId =
    activeTeam?.id || activeAgent?.id || activeProjectId || activeProjectName || "global";
  const { resolvedConfig } = useEntityConfig(entityType, entityId);

  const [welcomeTools, setWelcomeTools] = useState<string[]>([]);
  const [welcomeSkills, setWelcomeSkills] = useState<string[]>([]);
  const [welcomeExecutionMode, setWelcomeExecutionMode] = useState<
    "readonly" | "standard" | "autonomous" | undefined
  >(undefined);
  const [hasUserModifiedWelcome, setHasUserModifiedWelcome] = useState(false);

  useEffect(() => {
    if (resolvedConfig && !hasUserModifiedWelcome) {
      if (resolvedConfig.toolOverrides?.add && resolvedConfig.toolOverrides.add.length > 0) {
        setWelcomeTools(resolvedConfig.toolOverrides.add);
      }
      if (resolvedConfig.skills) setWelcomeSkills(resolvedConfig.skills);
      if (resolvedConfig.executionMode)
        setWelcomeExecutionMode(resolvedConfig.executionMode as any);
    }
  }, [resolvedConfig, hasUserModifiedWelcome]);

  useEffect(() => {
    if (!sessionId || !connected || initialMessageSentRef.current) return;
    const state = location.state as { initialMessage?: string } | null;
    if (state?.initialMessage) {
      initialMessageSentRef.current = true;
      send(state.initialMessage);
      window.history.replaceState({}, "");
    }
  }, [sessionId, connected, send, location.state]);

  const createSessionAndSend = async (messageText: string, attachments?: File[]) => {
    const sessionName = getSessionName({ activeTeam, activeAgent, activeProjectName });
    try {
      let finalText = messageText;
      if (attachments && attachments.length > 0) {
        const result = await processAttachments(attachments, {
          activeProjectName,
          activeAgentId: activeAgent?.id,
        });
        finalText = messageText + result.extraText;
      }
      const body = buildCreateSessionBody(
        sessionName,
        { activeTeam, activeAgent, activeProjectName },
        { tools: welcomeTools, skills: welcomeSkills, executionMode: welcomeExecutionMode },
      );
      const data = await apiFetch<{ id: string }>("/api/sessions", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const newSessionId = data.id;
      const targetPath = getSessionPath(newSessionId, {
        activeTeam,
        activeAgent,
        activeProjectName,
      });
      navigate(targetPath, { state: { initialMessage: finalText } });
    } catch (err: any) {
      addToast("error", err.message || "Failed to create session");
    }
  };

  const handleSend = (text: string) => {
    if (!sessionId) {
      createSessionAndSend(text);
    } else {
      send(text);
    }
  };

  if (!sessionId) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center p-6 bg-surface-50 dark:bg-surface-900">
        <WelcomeChatInput
          sessionId={null}
          onSend={(text, attachments) => createSessionAndSend(text, attachments)}
          activeTools={welcomeTools}
          activeSkills={welcomeSkills}
          executionMode={welcomeExecutionMode}
          onToolsChange={(tools, mode) => {
            setWelcomeTools(tools);
            if (mode) setWelcomeExecutionMode(mode);
            setHasUserModifiedWelcome(true);
          }}
          onSkillsChange={(skills) => {
            setWelcomeSkills(skills);
            setHasUserModifiedWelcome(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-surface-50 dark:bg-surface-900 relative">
      {error && (
        <div className="bg-red-500/10 text-red-500 p-3 text-sm border-b border-red-500/20 flex justify-between items-center">
          <span>{error}</span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <MessageList messages={messages as any} streaming={streaming} />
      </div>
      <div className="p-4 border-t border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-950">
        <ChatInput
          sessionId={sessionId}
          onSend={handleSend}
          onAbort={abort}
          streaming={streaming}
          disabled={!connected}
        />
      </div>
    </div>
  );
}
