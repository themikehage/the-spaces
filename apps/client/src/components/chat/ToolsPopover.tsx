// SPDX-License-Identifier: MIT
import { useEntityToolsConfig } from "@/hooks/useEntityToolsConfig";
import { useCustomToolsList } from "@/hooks/useCustomToolsList";
import { useLiterals } from "@/lib";
import { useEffect, useRef, useState } from "react";
import { Wrench } from "lucide-react";
import {
  AVAILABLE_TOOLS,
  GATE_ENV_VARS,
  TOOL_DISPLAY_META,
  TOOL_PRESETS,
  type EntityType,
  type ExecutionMode,
  type ToolPreset,
} from "shared";
import { literals as u } from "./ChatInput.literals";
import { PortalPopover } from "./PortalPopover";

interface ToolsPopoverProps {
  activeTools: string[];
  onChange: (tools: string[], executionMode?: ExecutionMode) => void;
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  toolStatus?: Record<string, "available" | "missing_key">;
  disabled?: boolean;
  executionMode?: ExecutionMode;
  entityType?: EntityType;
  entityId?: string;
  sessionId?: string | null;
}

export function ToolsPopover({
  activeTools: propActiveTools,
  onChange,
  open,
  onClose,
  triggerRef,
  toolStatus = {},
  disabled = false,
  executionMode: propExecutionMode,
  entityType,
  entityId,
  sessionId,
}: ToolsPopoverProps) {
  const l = useLiterals(u);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const entityTools = useEntityToolsConfig(entityType, entityId, sessionId);
  const { tools: customTools } = useCustomToolsList();

  const activeTools = entityType && entityId ? entityTools.activeTools : propActiveTools;
  const executionMode = entityType && entityId ? entityTools.executionMode : propExecutionMode;

  useEffect(() => {
    if (open) {
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % AVAILABLE_TOOLS.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + AVAILABLE_TOOLS.length) % AVAILABLE_TOOLS.length);
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        const toolId = AVAILABLE_TOOLS[selectedIndex];
        const gateKey = GATE_ENV_VARS[toolId];
        const isGated = !!(gateKey && toolStatus?.[toolId] === "missing_key");
        if (!disabled && !isGated) {
          handleToggleTool(toolId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedIndex, activeTools, toolStatus, disabled, onClose]);

  const handleToggleTool = (toolId: string) => {
    let next: string[];
    if (activeTools.includes(toolId)) {
      next = activeTools.filter((t) => t !== toolId);
    } else {
      next = [...activeTools, toolId];
    }

    if (entityType && entityId) {
      entityTools.updateTools(next, executionMode);
    }
    onChange(next, executionMode);
  };

  const applyPreset = (preset: ToolPreset) => {
    let nextTools: string[] = [...TOOL_PRESETS[preset]];
    if (preset === "autonomous") {
      nextTools = nextTools.filter(
        (t) =>
          !(GATE_ENV_VARS[t as keyof typeof GATE_ENV_VARS] && toolStatus?.[t] === "missing_key"),
      );
    }

    if (entityType && entityId) {
      entityTools.updateTools(nextTools, preset);
    }
    onChange(nextTools, preset);
  };

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

  return (
    <PortalPopover triggerRef={triggerRef} open={open} onClose={onClose}>
      <div
        ref={popoverRef}
        className="w-80 max-h-96 overflow-hidden bg-[#171717] border border-border rounded-xl shadow-xl flex flex-col"
      >
        <div className="flex gap-1.5 p-2 border-b border-border bg-[#171717] shrink-0">
          <button
            type="button"
            onClick={() => applyPreset("autonomous")}
            disabled={disabled}
            className={`flex-1 text-center py-1 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors ${
              isAutonomous
                ? "bg-primary/20 text-primary border border-primary/20"
                : "bg-[#121212] border border-border/30 hover:bg-[#202020] text-muted-foreground"
            }`}
          >
            {l.fullAccess}
          </button>
          <button
            type="button"
            onClick={() => applyPreset("standard")}
            disabled={disabled}
            className={`flex-1 text-center py-1 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors ${
              isStandard
                ? "bg-primary/20 text-primary border border-primary/20"
                : "bg-[#121212] border border-border/30 hover:bg-[#202020] text-muted-foreground"
            }`}
          >
            {l.standard || "Standard"}
          </button>
          <button
            type="button"
            onClick={() => applyPreset("readonly")}
            disabled={disabled}
            className={`flex-1 text-center py-1 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors ${
              isReadOnly
                ? "bg-primary/20 text-primary border border-primary/20"
                : "bg-[#121212] border border-border/30 hover:bg-[#202020] text-muted-foreground"
            }`}
          >
            {l.readOnly}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 max-h-72">
          {AVAILABLE_TOOLS.map((toolId, idx) => {
            const meta = TOOL_DISPLAY_META[toolId];
            const gateKey = GATE_ENV_VARS[toolId];
            const isGated = !!(gateKey && toolStatus?.[toolId] === "missing_key");
            const checked = activeTools.includes(toolId);
            const isToolDisabled = disabled || isGated;
            const isFocused = idx === selectedIndex;

            return (
              <div
                key={toolId}
                onClick={() => !isToolDisabled && handleToggleTool(toolId)}
                className={`w-full p-2 rounded-lg transition-colors flex items-start gap-2.5 cursor-pointer text-left ${
                  isFocused
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-card-hover border border-transparent"
                } ${isToolDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                title={isGated ? `Requires ${gateKey} in Settings > Env Vars` : undefined}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isToolDisabled}
                  onChange={() => {}}
                  className="mt-0.5 accent-accent cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-mono text-xs font-semibold text-foreground truncate">
                      {meta?.displayName || toolId}
                    </span>
                    {isGated && (
                      <span className="px-1 py-0.2 bg-warning/10 text-warning text-[8px] font-semibold rounded shrink-0">
                        Gated
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                    {meta?.description}
                  </p>
                </div>
              </div>
            );
          })}

          {customTools.length > 0 && (
            <>
              <div className="flex items-center gap-1.5 px-2 pt-2 pb-1">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Custom
                </span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
              {customTools.map((ct) => {
                const checked = activeTools.includes(ct.name);
                return (
                  <div
                    key={ct.name}
                    onClick={() => !disabled && handleToggleTool(ct.name)}
                    className={`w-full p-2 rounded-lg transition-colors flex items-start gap-2.5 cursor-pointer text-left hover:bg-card-hover border border-transparent ${
                      disabled ? "opacity-40 cursor-not-allowed" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => {}}
                      className="mt-0.5 accent-accent cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Wrench size={10} className="text-muted-foreground shrink-0" />
                        <span className="font-mono text-xs font-semibold text-foreground truncate">
                          {ct.label}
                        </span>
                      </div>
                      {ct.description && (
                        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                          {ct.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </PortalPopover>
  );
}
