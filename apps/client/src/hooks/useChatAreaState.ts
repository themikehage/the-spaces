// SPDX-License-Identifier: MIT
import { literals as u } from "@/components/chat/ChatArea.literals";
import { processAttachments } from "@/components/chat/ChatInput";
import { useToast } from "@/contexts/ToastContext";
import { useChatInputFocus } from "@/hooks/useChatInputFocus";
import { useChatScroll } from "@/hooks/useChatScroll";
import { useEntityConfig } from "@/hooks/useEntityConfig";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useLiterals, type ContextUsage, type MessageUsage } from "@/lib";
import { sessionsService } from "@/lib/api/sessions.service";
import {
  buildCreateSessionBody,
  getSessionMeta,
  getSessionName,
  getSessionPath,
} from "@/lib/session-utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { EntityType, TaskRunnerState } from "shared";

const ALL_TOOL_NAMES = ["read", "write", "edit", "bash", "grep", "find", "ls"];

export interface Message {
  role: "user" | "assistant" | "tool_result" | "toolResult" | "system" | "tool_approval_request";
  content:
    | string
    | Array<{
        type: string;
        text?: string;
        thinking?: string;
        name?: string;
        arguments?: Record<string, unknown>;
      }>;
  toolName?: string;
  toolCallId?: string;
  args?: Record<string, any>;
  isError?: boolean;
  isStreaming?: boolean;
  api?: string;
  provider?: string;
  model?: string;
  usage?: MessageUsage;
  stopReason?: string;
  timestamp?: number;
  responseId?: string;
  id?: string;
  parentId?: string | null;
  siblings?: string[];
}

interface UseChatAreaStateParams {
  sessionId: string | null;
  activeProjectName: string | null;
  activeProjectId?: string | null;
  activeAgent?: { id: string; name: string; avatarUrl?: string } | null;
  activeTeam?: { id: string; name: string } | null;
  onSessionMetadataChange?: (metadata: any) => void;
}

export function useChatAreaState({
  sessionId,
  activeProjectName,
  activeProjectId = null,
  activeAgent = null,
  activeTeam = null,
  onSessionMetadataChange,
}: UseChatAreaStateParams) {
  const l = useLiterals(u);
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setSandboxTools] = useState<string[]>(ALL_TOOL_NAMES);
  const [serialTools, setSerialTools] = useState<string[]>(["request_approval", "ask_question"]);
  const [contextUsage, setContextUsage] = useState<ContextUsage | null>(null);
  const [settledApprovals, setSettledApprovals] = useState<Record<string, "confirm" | "deny">>({});

  const entityType: EntityType = activeTeam
    ? "team"
    : activeAgent
      ? "agent"
      : activeProjectId || activeProjectName
        ? "project"
        : "global";
  const entityId =
    activeTeam?.id || activeAgent?.id || activeProjectId || activeProjectName || "global";
  const { resolvedConfig } = useEntityConfig({ type: entityType as any, id: entityId });

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
      } else {
        setWelcomeTools([
          "read",
          "write",
          "edit",
          "bash",
          "grep",
          "find",
          "ls",
          "request_approval",
          "ask_question",
          "render_html",
        ]);
      }
      if (resolvedConfig.skills) {
        setWelcomeSkills(resolvedConfig.skills);
      }
      if (resolvedConfig.executionMode) {
        setWelcomeExecutionMode(resolvedConfig.executionMode as any);
      }
    }
  }, [resolvedConfig, hasUserModifiedWelcome]);

  const [tasksState, setTasksState] = useState<TaskRunnerState>({
    tasks: [],
    currentTaskId: null,
    status: "idle",
  });
  const [compacting, setCompacting] = useState(false);
  const { connected, send, subscribe } = useWebSocket(sessionId);
  const [wasConnected, setWasConnected] = useState(connected);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const firstMessageSentRef = useRef(false);
  const receivedMessageIds = useRef<Set<string>>(new Set());

  const { isReadOnly: isReadOnlyExecution, isChannelExecution } = getSessionMeta(sessionId);

  const { showScrollButton, scrollToBottom, handleScroll } = useChatScroll(scrollContainerRef, {
    messages,
    isStreaming: streaming,
  });

  const chatInputRef = useChatInputFocus({
    sessionId,
    loadingMessages,
    streaming,
  });

  const handleCompact = useCallback(() => {
    if (!sessionId || compacting) return;
    setCompacting(true);
    send({ type: "compact", sessionId });
  }, [sessionId, send, compacting]);

  const handleResolveApproval = useCallback(
    (toolCallId: string, action: "confirm" | "deny") => {
      send({
        type: "ui_action",
        componentId: toolCallId,
        action,
      });
      setSettledApprovals((prev) => ({ ...prev, [toolCallId]: action }));
    },
    [send],
  );

  const handleToggleTasksStatus = useCallback(
    async (newStatus: "running" | "paused") => {
      if (!sessionId) return;
      try {
        await sessionsService.updateSessionTaskStatus(sessionId, "", newStatus);
        const data = await sessionsService.fetchSessionTasks(sessionId);
        setTasksState(data);
      } catch (e) {
        console.error("Failed to toggle task runner status:", e);
      }
    },
    [sessionId],
  );

  const loadMessages = useCallback(
    async (silent = false) => {
      if (!sessionId) {
        setMessages([]);
        setLoadingMessages(false);
        onSessionMetadataChange?.(null);
        return;
      }
      if (!silent) {
        setLoadingMessages(true);
      }
      try {
        const msgs = await sessionsService.fetchSessionMessages(sessionId);
        setMessages(msgs);
        msgs.forEach((m: any) => {
          const id = m.responseId || m.id;
          if (id) {
            receivedMessageIds.current.add(id);
          }
        });
        if (msgs.length > 0) {
          firstMessageSentRef.current = true;
        }
        scrollToBottom("instant");
      } catch (e) {
        console.error(e);
      } finally {
        if (!silent) {
          setLoadingMessages(false);
        }
      }
    },
    [sessionId, scrollToBottom, onSessionMetadataChange],
  );

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setLoadingMessages(false);
      setContextUsage(null);
      onSessionMetadataChange?.(null);
      return;
    }

    receivedMessageIds.current.clear();
    loadMessages();
    firstMessageSentRef.current = false;

    const fetchTools = async () => {
      try {
        const data = await sessionsService.fetchSessionTools(sessionId);
        setSandboxTools((data as any).tools ?? ALL_TOOL_NAMES);
        setSerialTools((data as any).serialTools ?? ["request_approval", "ask_question"]);
      } catch {
        /* noop */
      }
    };
    fetchTools();

    const fetchTasks = async () => {
      try {
        const data = await sessionsService.fetchSessionTasks(sessionId);
        setTasksState(data);
      } catch {
        /* noop */
      }
    };
    fetchTasks();

    const findMsgIndex = (prev: Message[], msg: Message) => {
      return prev.findIndex(
        (m) =>
          (m.id && msg.id && m.id === msg.id) ||
          (m.responseId && msg.responseId && m.responseId === msg.responseId),
      );
    };

    const hasContent = (c: any) => {
      if (!c) return false;
      if (typeof c === "string") return c.length > 0;
      if (Array.isArray(c)) return c.length > 0;
      return true;
    };

    const unsubStart = subscribe("agent_start", () => {
      setStreaming(true);
      setError(null);
    });

    const unsubEnd = subscribe("agent_end", () => {
      setStreaming(false);
      window.dispatchEvent(new CustomEvent("workspaceUpdated"));
    });

    const unsubMsgStart = subscribe("message_start", (data: unknown) => {
      const evt = data as Record<string, unknown>;
      const msg = evt.message as Message | undefined;
      if (!msg) return;
      if (msg.role === "user" && !(msg as any).details?.type) return;

      const msgId = msg.responseId || msg.id;
      if (msgId && receivedMessageIds.current.has(msgId)) {
        return;
      }
      if (msgId) {
        receivedMessageIds.current.add(msgId);
      }

      setMessages((prev) => {
        const index = findMsgIndex(prev, msg);
        if (index !== -1) {
          const existing = prev[index];
          const newContent = hasContent(msg.content) ? msg.content : existing.content;
          const updated = { ...existing, ...msg, content: newContent, isStreaming: true };
          const copy = [...prev];
          copy[index] = updated;
          return copy;
        }
        const last = prev[prev.length - 1];
        if (last?.isStreaming) {
          return [...prev.slice(0, -1), { ...msg, isStreaming: true }];
        }
        return [...prev, { ...msg, isStreaming: true }];
      });
    });

    const unsubMsg = subscribe("message_update", (data: unknown) => {
      const evt = data as Record<string, unknown>;
      const msg = evt.message as Message | undefined;
      if (!msg) return;

      setMessages((prev) => {
        const index = findMsgIndex(prev, msg);
        if (index !== -1) {
          const existing = prev[index];
          const updated = { ...existing, ...msg, isStreaming: true };
          const copy = [...prev];
          copy[index] = updated;
          return copy;
        }
        const last = prev[prev.length - 1];
        if (last?.isStreaming) {
          return [...prev.slice(0, -1), { ...msg, isStreaming: true }];
        }
        return [...prev, { ...msg, isStreaming: true }];
      });
    });

    const unsubMsgEnd = subscribe("message_end", (data: unknown) => {
      const evt = data as Record<string, unknown>;
      const msg = evt.message as Message | undefined;
      if (!msg) return;
      if (msg.role === "user" && !(msg as any).details?.type) return;

      setMessages((prev) => {
        const index = findMsgIndex(prev, msg);
        if (index !== -1) {
          const existing = prev[index];
          const updated = { ...existing, ...msg, isStreaming: false };
          const copy = [...prev];
          copy[index] = updated;
          return copy;
        }
        const last = prev[prev.length - 1];
        if (last?.isStreaming) {
          return [...prev.slice(0, -1), msg];
        }
        return [...prev, msg];
      });
      window.dispatchEvent(new CustomEvent("workspaceUpdated"));
    });

    const unsubToolEnd = subscribe("tool_execution_end", (data: unknown) => {
      const evt = data as Record<string, unknown>;
      const toolCallId = evt.toolCallId as string | undefined;
      if (!toolCallId) return;
      const result = evt.result as any;
      const isError = evt.isError as boolean | undefined;
      setMessages((prev) => {
        const alreadyExists = prev.some(
          (m) =>
            (m.role === "tool_result" || m.role === "toolResult") &&
            (m as any).toolCallId === toolCallId,
        );
        if (alreadyExists) return prev;
        const toolResultMsg: any = {
          role: "toolResult",
          toolCallId,
          content:
            result && typeof result === "object" && result.content
              ? result.content
              : [
                  {
                    type: "text",
                    text: typeof result === "string" ? result : JSON.stringify(result || ""),
                  },
                ],
          isError: !!isError,
          details: result?.details,
        };
        return [...prev, toolResultMsg];
      });
    });

    const unsubError = subscribe("agent_error", (data: unknown) => {
      const evt = data as Record<string, unknown>;
      setError(String(evt.error ?? l.unknownError));
      setStreaming(false);
      setCompacting(false);
    });

    const unsubTasks = subscribe("tasks_update", (data: any) => {
      if (data.state) {
        setTasksState(data.state);
      }
    });

    const unsubSubagent = subscribe("subagent_event", (data: any) => {
      if (data && data.toolCallId && data.event) {
        window.dispatchEvent(
          new CustomEvent(`subagent-event-${data.toolCallId}`, { detail: data.event }),
        );
      }
    });

    const unsubContext = subscribe("context_usage", (data: unknown) => {
      const evt = data as Record<string, unknown>;
      if (evt.contextUsage) {
        setContextUsage(evt.contextUsage as ContextUsage);
        setCompacting(false);
      }
    });

    const unsubToolUpdate = subscribe("tool_execution_update", (data: unknown) => {
      const evt = data as Record<string, unknown>;
      const toolCallId = evt.toolCallId as string | undefined;
      if (!toolCallId) return;
      window.dispatchEvent(new CustomEvent(`tool-update-${toolCallId}`, { detail: evt }));
    });

    return () => {
      unsubStart();
      unsubEnd();
      unsubMsgStart();
      unsubMsg();
      unsubMsgEnd();
      unsubToolEnd();
      unsubError();
      unsubTasks();
      unsubSubagent();
      unsubContext();
      unsubToolUpdate();
    };
  }, [sessionId, subscribe, loadMessages, l.unknownError, onSessionMetadataChange]);

  useEffect(() => {
    if (connected && !wasConnected && sessionId) {
      const timer = setTimeout(() => {
        loadMessages(true);
      }, 500);
      return () => clearTimeout(timer);
    }
    setWasConnected(connected);
  }, [connected, wasConnected, sessionId, loadMessages]);

  const handleSend = useCallback(
    (
      message: string,
      option?: "steer" | "follow_up",
      tools?: string[],
      images?: Array<{ type: "image"; data: string; mimeType: string }>,
    ) => {
      if (!message.trim() || !sessionId) return;

      scrollToBottom("instant");

      if (!firstMessageSentRef.current && option !== "steer" && option !== "follow_up") {
        firstMessageSentRef.current = true;
        const cleanName = message.trim();
        const name = cleanName.slice(0, 50) + (cleanName.length > 50 ? "..." : "");
        window.dispatchEvent(new CustomEvent("renameSession", { detail: { sessionId, name } }));
        sessionsService.updateSession(sessionId, { name }).catch(() => {});
      }

      if (option === "steer") {
        const userMsg: Message = { role: "user", content: `[Steer] ${message}` };
        setMessages((prev) => [...prev, userMsg]);
        send({ type: "steer", message, sessionId });
      } else if (option === "follow_up") {
        const userMsg: Message = { role: "user", content: `[Follow-up] ${message}` };
        setMessages((prev) => [...prev, userMsg]);
        send({ type: "follow_up", message, sessionId });
      } else {
        const userMsg: Message = { role: "user", content: message };
        setMessages((prev) => [...prev, userMsg]);
        send({ type: "prompt", message, sessionId, tools, images });
      }
    },
    [sessionId, send, scrollToBottom],
  );

  useEffect(() => {
    if (!sessionId) return;
    const pendingKey = `pending-prompt-${sessionId}`;
    const pendingImagesKey = `pending-images-${sessionId}`;

    let pending = (window as any).__pendingPrompts?.[sessionId];

    if (!pending) {
      const pendingStr = localStorage.getItem(pendingKey);
      if (pendingStr) {
        try {
          const parsed = JSON.parse(pendingStr);
          if (
            parsed &&
            typeof parsed.timestamp === "number" &&
            Date.now() - parsed.timestamp < 30000
          ) {
            pending = parsed;
          }
        } catch {
          pending = {
            text: pendingStr,
            timestamp: Date.now(),
          };
        }
      }
    }

    if ((window as any).__pendingPrompts?.[sessionId]) {
      delete (window as any).__pendingPrompts[sessionId];
    }
    localStorage.removeItem(pendingKey);
    localStorage.removeItem(pendingImagesKey);

    if (pending && pending.text) {
      setTimeout(() => {
        handleSend(pending.text, undefined, undefined, pending.images);
      }, 500);
    }
  }, [sessionId, handleSend]);

  const handleAbort = useCallback(() => {
    if (!sessionId) return;
    send({ type: "abort", sessionId });
  }, [sessionId, send]);

  const handleNavigate = useCallback(
    async (targetId: string) => {
      if (!sessionId) return;
      try {
        await sessionsService.navigateSession(sessionId, targetId);
        await loadMessages();
      } catch (err) {
        setError(String(err));
      }
    },
    [sessionId, loadMessages],
  );

  const createSessionAndSend = async (messageText: string, attachments?: File[]) => {
    const sessionName = getSessionName({ activeTeam, activeAgent, activeProjectName });

    try {
      let finalText = messageText;
      let imagesToSave: Array<{ type: "image"; data: string; mimeType: string }> = [];

      if (attachments && attachments.length > 0) {
        try {
          const result = await processAttachments(attachments, {
            activeProjectName,
            activeAgentId: activeAgent?.id,
          });
          finalText = messageText + result.extraText;
          imagesToSave = result.images;
        } catch (attachErr) {
          addToast("error", attachErr instanceof Error ? attachErr.message : String(attachErr));
          return;
        }
      }

      const body = buildCreateSessionBody(
        sessionName,
        {
          activeTeam,
          activeAgent,
          activeProjectName,
        },
        {
          tools: welcomeTools,
          skills: welcomeSkills,
          executionMode: welcomeExecutionMode,
        },
      );

      const session = await sessionsService.createSession(body);
      const path = getSessionPath(session.id, { activeTeam, activeAgent, activeProjectName });

      const pendingData = {
        text: finalText,
        images: imagesToSave.length > 0 ? imagesToSave : undefined,
        timestamp: Date.now(),
      };

      (window as any).__pendingPrompts = (window as any).__pendingPrompts || {};
      (window as any).__pendingPrompts[session.id] = pendingData;

      try {
        localStorage.setItem(`pending-prompt-${session.id}`, JSON.stringify(pendingData));
      } catch (err) {
        console.error("Failed to store pending prompt in localStorage:", err);
      }

      navigate(path);
    } catch (e) {
      console.error("Failed to auto-create session for prompt:", e);
      addToast("error", "Error inesperado al crear la sesión");
    }
  };

  const getSuggestions = () => {
    if (activeTeam) {
      return [
        {
          label: l.pillListAgents || "List Agents",
          promptText:
            l.pillListAgentsPrompt || "List all active programmatic agents and their roles.",
        },
        {
          label: l.pillStartLab || "Start Experiment",
          promptText:
            l.pillStartLabPrompt ||
            "Explain how to configure and run a debate experiment in the Laboratory.",
        },
      ];
    }
    if (activeAgent) {
      return [
        {
          label: l.pillAgentRole || "Describe Role",
          promptText:
            l.pillAgentRolePrompt || "Explain your system prompt, context, and capabilities.",
        },
      ];
    }
    if (activeProjectName) {
      return [
        {
          label: l.pillAnalyzeCode || "Analyze Workspace",
          promptText:
            l.pillAnalyzeCodePrompt ||
            "Analyze the current repository structure and describe its architecture.",
        },
        {
          label: l.pillRunTests || "Run Tests",
          promptText:
            l.pillRunTestsPrompt || "Run the project's test suite and report if any checks fail.",
        },
      ];
    }
    return [
      {
        label: l.pillCreateRepo || "Create Repo",
        promptText: l.pillCreateRepoPrompt || "Help me create a new code repository.",
      },
      {
        label: l.pillListAgents || "List Agents",
        promptText:
          l.pillListAgentsPrompt || "List all active programmatic agents and their roles.",
      },
    ];
  };

  return {
    l,
    navigate,
    messages,
    loadingMessages,
    streaming,
    error,
    setError,
    setSandboxTools,
    serialTools,
    contextUsage,
    settledApprovals,
    welcomeTools,
    welcomeSkills,
    welcomeExecutionMode,
    setWelcomeTools,
    setWelcomeSkills,
    setWelcomeExecutionMode,
    setHasUserModifiedWelcome,
    tasksState,
    compacting,
    connected,
    scrollContainerRef,
    showScrollButton,
    scrollToBottom,
    handleScroll,
    chatInputRef,
    handleCompact,
    handleResolveApproval,
    handleToggleTasksStatus,
    handleSend,
    handleAbort,
    handleNavigate,
    createSessionAndSend,
    getSuggestions,
    isReadOnlyExecution,
    isChannelExecution,
    entityType,
    entityId,
  };
}
