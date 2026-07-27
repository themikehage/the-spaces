import { useLiterals, type ContextUsage } from "@/lib";
import { BookOpen, Paperclip, Sliders } from "lucide-react";
import { useRef, useState } from "react";
import type { EntityType } from "shared";
import { literals as u } from "./ChatInput.literals";
import { ContextButton } from "./ContextButton";
import { ModelSelector } from "./ModelSelector";
import { SendStopButton } from "./SendStopButton";
import { SkillsPopover } from "./SkillsPopover";
import type { SkillInfo } from "./SkillsSelector";
import { ToolsPopover } from "./ToolsPopover";

interface InputToolbarProps {
  sessionId: string | null;
  streaming: boolean;
  disabled: boolean;
  activeTools: string[];
  onToolsChange: (tools: string[], executionMode?: "readonly" | "standard" | "autonomous") => void;
  skills: SkillInfo[];
  skillsLoading: boolean;
  onSelectSkill: (skillName: string) => void;
  onFileClick: () => void;
  toolStatus?: Record<string, "available" | "missing_key">;
  onSend: () => void;
  onStop: () => void;
  contextUsage?: ContextUsage | null;
  onCompact?: () => void;
  compacting?: boolean;
  executionMode?: "readonly" | "standard" | "autonomous";
  entityType?: EntityType;
  entityId?: string;
}

export function InputToolbar({
  sessionId,
  streaming,
  disabled,
  activeTools,
  onToolsChange,
  skills,
  skillsLoading,
  onSelectSkill,
  onFileClick,
  toolStatus = {},
  onSend,
  onStop,
  contextUsage = null,
  onCompact,
  compacting = false,
  executionMode,
  entityType,
  entityId,
}: InputToolbarProps) {
  const l = useLiterals(u);
  const [openSkills, setOpenSkills] = useState(false);
  const [openTools, setOpenTools] = useState(false);

  const skillsTriggerRef = useRef<HTMLButtonElement>(null);
  const toolsTriggerRef = useRef<HTMLButtonElement>(null);

  const isReadOnly =
    executionMode === "readonly" ||
    (activeTools.includes("read") &&
      activeTools.includes("grep") &&
      activeTools.includes("find") &&
      activeTools.includes("ls") &&
      !activeTools.includes("write") &&
      !activeTools.includes("edit") &&
      !activeTools.includes("bash"));

  const isAutonomous = executionMode === "autonomous";
  const isStandard = executionMode === "standard" || (!isReadOnly && !isAutonomous);

  let toolsLabelText = `${activeTools.length} tools`;
  if (isAutonomous)
    toolsLabelText = l.fullAccess; // displays Autonomous
  else if (isStandard) toolsLabelText = l.standard || "Standard";
  else if (isReadOnly) toolsLabelText = l.readOnly;

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-[#171717] border-t border-border/30">
      {/* Left controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onFileClick}
          disabled={disabled}
          className="p-1.5 rounded-lg border border-border/40 bg-[#171717] hover:bg-[#313131] text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title={l.attachFiles}
        >
          <Paperclip size={14} />
        </button>

        <ModelSelector sessionId={sessionId} disabled={disabled} compact={true} />

        <div className="relative">
          <button
            ref={skillsTriggerRef}
            type="button"
            onClick={() => !disabled && setOpenSkills((prev) => !prev)}
            disabled={disabled}
            title={`${l.skillsLabel} (${skills.length})`}
            className={`p-1.5 rounded-lg border border-border/40 bg-[#171717] hover:bg-[#313131] text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              openSkills ? "text-primary border-primary/45" : ""
            }`}
          >
            <BookOpen size={14} />
          </button>
          <SkillsPopover
            skills={skills}
            loading={skillsLoading}
            open={openSkills}
            onClose={() => setOpenSkills(false)}
            onSelectSkill={onSelectSkill}
            triggerRef={skillsTriggerRef}
            entityType={entityType}
            entityId={entityId}
          />
        </div>

        <div className="relative">
          <button
            ref={toolsTriggerRef}
            type="button"
            onClick={() => !disabled && setOpenTools((prev) => !prev)}
            disabled={disabled}
            title={`${l.toolsLabel}: ${toolsLabelText}`}
            className={`p-1.5 rounded-lg border border-border/40 bg-[#171717] hover:bg-[#313131] text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              openTools ? "text-primary border-primary/45" : ""
            }`}
          >
            <Sliders size={14} />
          </button>
          <ToolsPopover
            activeTools={activeTools}
            onChange={onToolsChange}
            open={openTools}
            onClose={() => setOpenTools(false)}
            triggerRef={toolsTriggerRef}
            toolStatus={toolStatus}
            disabled={disabled}
            executionMode={executionMode}
          />
        </div>

        <ContextButton
          contextUsage={contextUsage}
          onCompact={onCompact}
          compacting={compacting}
          disabled={disabled}
        />
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        <SendStopButton streaming={streaming} disabled={disabled} onSend={onSend} onStop={onStop} />
      </div>
    </div>
  );
}
