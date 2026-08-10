// SPDX-License-Identifier: MIT
import { useLiterals } from "@/lib";
import { skillsService } from "@/lib/api/skills.service";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EntityType, ExecutionMode } from "shared";
import type { Attachment } from "./AttachmentPreview";
import { InputCard } from "./InputCard";
import { InputToolbar } from "./InputToolbar";
import type { SkillInfo } from "./SkillsSelector";
import { literals as u } from "./WelcomeChatInput.literals";

export interface SuggestionPill {
  label: string;
  icon?: React.ReactNode;
  promptText: string;
}

interface Props {
  title?: string;
  placeholder?: string;
  sessionId: string | null;
  onSend: (message: string, attachments?: File[]) => void;
  suggestions?: SuggestionPill[];
  showModelSelector?: boolean;
  selectedModel?: string;
  onModelChange?: (modelId: string) => void;
  activeTools?: string[];
  onToolsChange?: (tools: string[], executionMode?: ExecutionMode) => void;
  executionMode?: ExecutionMode;
  activeSkills?: string[];
  onSkillsChange?: (skills: string[]) => void;
  allowAttachments?: boolean;
  disabled?: boolean;
  loading?: boolean;
  value?: string;
  onChange?: (val: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  entityType?: EntityType;
  entityId?: string;
}

export function WelcomeChatInput({
  title,
  placeholder,
  sessionId,
  onSend,
  suggestions = [],
  activeTools,
  onToolsChange,
  executionMode,
  activeSkills,
  onSkillsChange,
  allowAttachments = true,
  disabled = false,
  loading = false,
  value,
  onChange,
  textareaRef: externalTextareaRef,
  entityType,
  entityId,
}: Props) {
  const l = useLiterals(u);
  const [internalInput, setInternalInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [allSkills, setAllSkills] = useState<SkillInfo[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);

  const localTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalTextareaRef || localTextareaRef;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const input = value !== undefined ? value : internalInput;
  const setInput = onChange || setInternalInput;

  useEffect(() => {
    setSkillsLoading(true);
    skillsService
      .fetchSkills()
      .then((data) => {
        const list = (data as any).skills || data || [];
        setAllSkills(list);
      })
      .catch((e) => console.error("Failed to load skills in WelcomeChatInput:", e))
      .finally(() => setSkillsLoading(false));
  }, []);

  const handleToggleSkill = (skillName: string) => {
    if (!onSkillsChange) return;
    const current = activeSkills || [];
    if (current.includes(skillName)) {
      onSkillsChange(current.filter((s) => s !== skillName));
    } else {
      onSkillsChange([...current, skillName]);
    }
  };

  // Dynamic Time Greeting
  const getGreeting = useCallback(() => {
    const hours = new Date().getHours();
    if (hours < 12) return l.morningGreeting;
    if (hours < 18) return l.afternoonGreeting;
    return l.eveningGreeting;
  }, [l]);

  const handleSend = () => {
    if (disabled || loading || (!input.trim() && attachments.length === 0)) return;
    const files = attachments.map((a) => a.file);
    onSend(input, files);
    setInput("");
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newAttachments: Attachment[] = files.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
      file,
      type: file.type.startsWith("image/") ? "image" : "document",
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const found = prev.find((a) => a.id === id);
      if (found?.previewUrl) {
        URL.revokeObjectURL(found.previewUrl);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center px-4 py-8 animate-fade-in">
      {/* Dynamic Header Greeting */}
      <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-text-primary text-center mb-8 tracking-tight">
        {title || `${getGreeting()}`}
      </h1>

      {/* Floating Card Container */}
      <div className="w-full">
        <InputCard
          streaming={loading}
          disabled={disabled || loading}
          focused={false}
          attachments={attachments}
          onRemoveAttachment={removeAttachment}
          input={input}
          onInputChange={setInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || l.defaultPlaceholder}
          textareaRef={textareaRef}
          toolbar={
            <InputToolbar
              sessionId={sessionId}
              streaming={loading}
              disabled={disabled || loading}
              activeTools={activeTools || []}
              onToolsChange={onToolsChange || (() => {})}
              skills={allSkills}
              skillsLoading={skillsLoading}
              onSelectSkill={handleToggleSkill}
              onFileClick={() => {
                if (allowAttachments) fileInputRef.current?.click();
              }}
              onSend={handleSend}
              onStop={() => {}}
              executionMode={executionMode}
              entityType={entityType}
              entityId={entityId}
            />
          }
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Suggestion Pills underneath input */}
      {suggestions.length > 0 && (
        <div className="w-full flex items-center justify-center gap-2 mt-5 overflow-x-auto flex-nowrap sm:flex-wrap pb-2 no-scrollbar">
          {suggestions.map((pill, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (!disabled && !loading) {
                  onSend(pill.promptText, []);
                }
              }}
              disabled={disabled || loading}
              className="flex items-center gap-2 bg-surface hover:bg-surface-hover border border-border/80 text-text-primary px-3 py-1.5 rounded-full text-xs font-semibold hover:border-accent/40 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              {pill.icon}
              <span>{pill.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

