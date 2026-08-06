// SPDX-License-Identifier: MIT
import { processAttachments, type MentionTarget } from "@/components/chat/ChatInput";
import { literals as u } from "@/components/chat/ChatInput.literals";
import type { SkillInfo } from "@/components/chat/SkillsSelector";
import { useToast } from "@/contexts/ToastContext";
import { useLiterals } from "@/lib";
import { sessionsService } from "@/lib/api/sessions.service";
import { EntityEventBus } from "@/lib/event-bus";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { EntityType } from "shared";

const DEFAULT_TOOLS = [
  "read",
  "write",
  "edit",
  "bash",
  "grep",
  "find",
  "ls",
  "request_approval",
  "ask_question",
  "render_images",
  "render_chart",
  "render_html",
  "refresh_ui",
  "spawn_subagent",
  "delegate_task",
];

export interface Attachment {
  id: string;
  file: File;
  type: "image" | "document";
  previewUrl?: string;
}

interface UseChatInputFormParams {
  onSend: (
    message: string,
    option?: "steer" | "follow_up",
    tools?: string[],
    images?: Array<{ type: "image"; data: string; mimeType: string }>,
  ) => void;
  onAbort: () => void;
  streaming: boolean;
  sessionId: string | null;
  onToolsChange?: (tools: string[]) => void;
  runnerActive?: boolean;
  mentionTargets?: MentionTarget[];
  activeProjectName?: string | null;
  activeAgentId?: string | null;
  activeChannelId?: string | null;
  externalTextareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
  customEntityType?: EntityType;
  customEntityId?: string;
  userMessages?: string[];
}

export function useChatInputForm({
  onSend,
  onAbort: _onAbort,
  streaming,
  sessionId,
  onToolsChange,
  runnerActive = false,
  mentionTargets = [],
  activeProjectName,
  activeAgentId = null,
  activeChannelId = null,
  externalTextareaRef,
  disabled = false,
  customEntityType,
  customEntityId,
  userMessages = [],
}: UseChatInputFormParams) {
  const l = useLiterals(u);
  const resolvedEntityType: EntityType =
    customEntityType || (activeAgentId ? "agent" : activeProjectName ? "project" : "global");
  const resolvedEntityId: string = customEntityId || activeAgentId || activeProjectName || "global";
  const { addToast } = useToast();
  const [input, setInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedDraft, setSavedDraft] = useState("");
  const [activeTools, setActiveTools] = useState<string[]>(DEFAULT_TOOLS);
  const [executionMode, setExecutionMode] = useState<
    "readonly" | "standard" | "autonomous" | undefined
  >(undefined);
  const [toolStatus, setToolStatus] = useState<Record<string, "available" | "missing_key">>({});
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [focused, setFocused] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const localTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalTextareaRef || localTextareaRef;

  const [autocompleteMode, setAutocompleteMode] = useState<"skill" | "mention" | null>(null);
  const [autocompleteSearch, setAutocompleteSearch] = useState("");
  const [autocompleteSelectedIndex, setAutocompleteSelectedIndex] = useState(0);

  useEffect(() => {
    setHistoryIndex(-1);
    setSavedDraft("");
  }, [sessionId]);

  const setInputValueFromHistory = (val: string) => {
    setInput(val);
    const textarea = textareaRef.current;
    if (textarea) {
      setTimeout(() => {
        textarea.selectionStart = val.length;
        textarea.selectionEnd = val.length;
      }, 0);
    }
  };

  const filteredMentions = mentionTargets.filter((t) =>
    t.name.toLowerCase().includes(autocompleteSearch.toLowerCase()),
  );

  const filteredSkills = skills.filter((s) =>
    s.name.toLowerCase().includes(autocompleteSearch.toLowerCase()),
  );

  const filteredItems =
    autocompleteMode === "mention"
      ? filteredMentions.map((t) => ({ id: t.id, name: t.name }))
      : filteredSkills.map((s) => ({ id: s.name, name: s.name, description: s.description }));

  const checkAutocomplete = (text: string, cursorPosition: number) => {
    const textBeforeCursor = text.slice(0, cursorPosition);

    if (mentionTargets.length > 0) {
      const mentionMatch = textBeforeCursor.match(/(?:^|\s)@(\S*)$/);
      if (mentionMatch) {
        setAutocompleteSearch(mentionMatch[1]);
        setAutocompleteMode("mention");
        setAutocompleteSelectedIndex(0);
        return;
      }
    }

    const lastWordMatch = textBeforeCursor.match(/(\/\S*)$/);
    if (lastWordMatch) {
      const triggerWord = lastWordMatch[1];
      setAutocompleteSearch(triggerWord.slice(1));
      setAutocompleteMode("skill");
      setAutocompleteSelectedIndex(0);
    } else {
      setAutocompleteMode(null);
    }
  };

  const insertMention = (targetName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = input.slice(0, cursorPosition);
    const textAfterCursor = input.slice(cursorPosition);
    const replaced = textBeforeCursor.replace(
      /(?:^|(\s))@\S*$/,
      (_, space) => `${space ?? ""}@${targetName} `,
    );
    const newVal = replaced + textAfterCursor;
    setInput(newVal);
    setAutocompleteMode(null);
    const newCursorPos = replaced.length;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertSkillReference = (skillName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = input.slice(0, cursorPosition);
    const textAfterCursor = input.slice(cursorPosition);

    const hasSlashMatch = textBeforeCursor.match(/(\/\S*)$/);
    let textBeforeCursorReplaced;
    if (hasSlashMatch) {
      textBeforeCursorReplaced = textBeforeCursor.replace(/(\/\S*)$/, `/${skillName} `);
    } else {
      const needsSpace = textBeforeCursor.length > 0 && !textBeforeCursor.endsWith(" ");
      textBeforeCursorReplaced = `${textBeforeCursor}${needsSpace ? " " : ""}/${skillName} `;
    }
    const newVal = textBeforeCursorReplaced + textAfterCursor;
    setInput(newVal);
    setAutocompleteMode(null);
    const newCursorPos = textBeforeCursorReplaced.length;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newAttachments = files.map((file) => {
      const isImg = file.type.startsWith("image/");
      return {
        id: Math.random().toString(36).substring(2, 9),
        file,
        type: isImg ? ("image" as const) : ("document" as const),
        previewUrl: isImg ? URL.createObjectURL(file) : undefined,
      };
    });
    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleSendAction = async (option?: "steer" | "follow_up") => {
    if ((!input.trim() && attachments.length === 0) || runnerActive) return;

    try {
      const files = attachments.map((a) => a.file);
      const result = await processAttachments(files, {
        activeProjectName,
        activeAgentId,
        activeChannelId,
      });

      const finalMessage = input + result.extraText;
      onSend(
        finalMessage,
        option,
        activeTools,
        result.images.length > 0 ? result.images : undefined,
      );

      attachments.forEach((a) => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      });
      setAttachments([]);
      setInput("");
      setHistoryIndex(-1);
      setSavedDraft("");
      setAutocompleteMode(null);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : String(err));
    }
  };

  const handleInputChange = (val: string) => {
    setInput(val);
    setHistoryIndex(-1);
    const textarea = textareaRef.current;
    if (textarea) {
      checkAutocomplete(val, textarea.selectionStart);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (autocompleteMode && filteredItems.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAutocompleteSelectedIndex((prev) => (prev + 1) % filteredItems.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setAutocompleteSelectedIndex(
          (prev) => (prev - 1 + filteredItems.length) % filteredItems.length,
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selectedItem = filteredItems[autocompleteSelectedIndex];
        if (autocompleteMode === "mention") {
          insertMention(selectedItem.name);
        } else {
          insertSkillReference(selectedItem.name);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setAutocompleteMode(null);
        return;
      }
    }

    if (e.key === "ArrowUp" && !autocompleteMode && userMessages.length > 0) {
      const textarea = textareaRef.current;
      if (textarea && textarea.selectionStart === 0) {
        e.preventDefault();
        if (historyIndex === -1) {
          setSavedDraft(input);
          setHistoryIndex(0);
          setInputValueFromHistory(userMessages[userMessages.length - 1]);
        } else if (historyIndex < userMessages.length - 1) {
          const nextIndex = historyIndex + 1;
          setHistoryIndex(nextIndex);
          setInputValueFromHistory(userMessages[userMessages.length - 1 - nextIndex]);
        }
        return;
      }
    }

    if (e.key === "ArrowDown" && !autocompleteMode && historyIndex !== -1) {
      const textarea = textareaRef.current;
      if (textarea && textarea.selectionStart === textarea.value.length) {
        e.preventDefault();
        if (historyIndex > 0) {
          const nextIndex = historyIndex - 1;
          setHistoryIndex(nextIndex);
          setInputValueFromHistory(userMessages[userMessages.length - 1 - nextIndex]);
        } else {
          setInputValueFromHistory(savedDraft);
          setHistoryIndex(-1);
        }
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (streaming) {
        handleSendAction("steer");
      } else {
        handleSendAction();
      }
    } else if (e.key === "Enter" && e.altKey) {
      e.preventDefault();
      if (streaming) {
        handleSendAction("follow_up");
      }
    }
  };

  const handleToolsChange = async (
    tools: string[],
    nextMode?: "readonly" | "standard" | "autonomous",
  ) => {
    setActiveTools(tools);
    if (nextMode) {
      setExecutionMode(nextMode);
    }
    onToolsChange?.(tools);
    if (!sessionId) return;
    try {
      await sessionsService.updateSessionTools(sessionId, {
        tools,
        executionMode: nextMode || executionMode,
      });
    } catch {
      /* noop */
    }
  };

  useEffect(() => {
    const handleFocus = () => setFocused(true);
    const handleBlur = () => setFocused(false);

    const el = textareaRef.current;
    if (el) {
      el.addEventListener("focus", handleFocus);
      el.addEventListener("blur", handleBlur);
    }
    return () => {
      if (el) {
        el.removeEventListener("focus", handleFocus);
        el.removeEventListener("blur", handleBlur);
      }
    };
  }, [textareaRef]);

  useEffect(() => {
    if (!sessionId) {
      setActiveTools(DEFAULT_TOOLS);
      setExecutionMode(undefined);
      return;
    }
    const fetchTools = async () => {
      try {
        const data = await sessionsService.fetchSessionTools(sessionId);
        setActiveTools((data as any).tools ?? DEFAULT_TOOLS);
        setToolStatus((data as any).toolStatus ?? {});
        setExecutionMode((data as any).executionMode);
      } catch {
        setActiveTools(DEFAULT_TOOLS);
        setExecutionMode(undefined);
      }
    };
    fetchTools();
  }, [sessionId]);

  const fetchSessionSkills = useCallback(async () => {
    if (!sessionId) {
      setSkills([]);
      return;
    }
    setSkillsLoading(true);
    try {
      const list = await sessionsService.fetchSessionSkills(sessionId);
      setSkills((list as any) || []);
    } catch (err) {
      console.error("Error loading session skills:", err);
    } finally {
      setSkillsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSessionSkills();
  }, [fetchSessionSkills]);

  useEffect(() => {
    return EntityEventBus.subscribe((detail) => {
      if (detail?.type === "skill" || !detail?.type) {
        fetchSessionSkills();
      }
    });
  }, [fetchSessionSkills]);

  const placeholderText = runnerActive
    ? l.placeholderRunnerActive
    : streaming
      ? l.placeholderSteer
      : l.placeholderSend;

  return {
    l,
    resolvedEntityType,
    resolvedEntityId,
    input,
    setInput,
    handleInputChange,
    activeTools,
    executionMode,
    toolStatus,
    skills,
    skillsLoading,
    attachments,
    focused,
    fileInputRef,
    textareaRef,
    autocompleteMode,
    setAutocompleteMode,
    autocompleteSelectedIndex,
    filteredItems,
    checkAutocomplete,
    insertMention,
    insertSkillReference,
    handleFileChange,
    removeAttachment,
    handleSendAction,
    handleKeyDown,
    handleToolsChange,
    placeholderText,
    disabled: runnerActive || disabled,
  };
}
