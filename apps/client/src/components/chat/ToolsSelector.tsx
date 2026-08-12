// SPDX-License-Identifier: MIT
import { Modal } from "@/components/ui/Modal";
import { useLiterals } from "@/lib";
import { ChevronDown, Shield } from "lucide-react";
import { useState } from "react";
import {
  AVAILABLE_TOOLS,
  GATE_ENV_VARS,
  TOOL_DISPLAY_META,
  TOOL_PRESETS,
  type AutonomyMode,
  type ToolPreset,
} from "shared";
import { literals as u } from "./ToolsSelector.literals";

interface Props {
  activeTools: string[];
  onChange: (tools: string[], autonomyMode?: AutonomyMode) => void;
  disabled?: boolean;
  toolStatus?: Record<string, "available" | "missing_key">;
  autonomyMode?: AutonomyMode;
  executionMode?: AutonomyMode;
}

export function ToolsSelector({
  activeTools,
  onChange,
  disabled = false,
  toolStatus,
  autonomyMode,
  executionMode,
}: Props) {
  const l = useLiterals(u);
  const [open, setOpen] = useState(false);
  const activeMode = autonomyMode ?? executionMode;

  const handleToggleTool = (toolId: string) => {
    let next: string[];
    if (activeTools.includes(toolId)) {
      next = activeTools.filter((t) => t !== toolId);
    } else {
      next = [...activeTools, toolId];
    }
    onChange(next, activeMode);
  };

  const applyPreset = (preset: ToolPreset) => {
    let selected: string[] = [...TOOL_PRESETS[preset]];
    if (preset === "autonomous") {
      selected = selected.filter(
        (t) =>
          !(GATE_ENV_VARS[t as keyof typeof GATE_ENV_VARS] && toolStatus?.[t] === "missing_key"),
      );
    }
    onChange(selected, preset);
  };

  const isReadOnly =
    activeMode === "readonly" ||
    (activeTools.includes("read") &&
      activeTools.includes("grep") &&
      activeTools.includes("find") &&
      activeTools.includes("ls") &&
      !activeTools.includes("write") &&
      !activeTools.includes("edit") &&
      !activeTools.includes("bash"));

  const isAutonomous = activeMode === "autonomous";
  const isStandard = activeMode === "standard" || (!isReadOnly && !isAutonomous);

  let statusLabel = `${activeTools.length}/${AVAILABLE_TOOLS.length} tools`;
  if (isAutonomous) statusLabel = l.fullAccess;
  else if (isStandard) statusLabel = l.standard || "Standard";
  else if (isReadOnly) statusLabel = l.readOnly;
  else if (activeTools.length === 0) statusLabel = l.restricted;

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 cursor-pointer ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <Shield size={12} />
        <span>Sandbox: {statusLabel}</span>
        <ChevronDown size={10} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Allowed Tools">
        <div className="p-2 bg-card">
          <div className="px-1.5 pb-2 flex gap-2 border-b border-input mb-2">
            <button
              onClick={() => applyPreset("autonomous")}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer text-xs ${
                isAutonomous
                  ? "bg-primary/20 text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground bg-card-hover"
              }`}
            >
              {l.fullAccess}
            </button>
            <button
              onClick={() => applyPreset("standard")}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer text-xs ${
                isStandard
                  ? "bg-primary/20 text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground bg-card-hover"
              }`}
            >
              {l.standard || "Standard"}
            </button>
            <button
              onClick={() => applyPreset("readonly")}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer text-xs ${
                isReadOnly
                  ? "bg-primary/20 text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground bg-card-hover"
              }`}
            >
              {l.readOnly}
            </button>
          </div>
          <div className="space-y-2">
            {AVAILABLE_TOOLS.map((toolId) => {
              const meta = TOOL_DISPLAY_META[toolId];
              const gateKey = GATE_ENV_VARS[toolId];
              const isGated = !!(gateKey && toolStatus?.[toolId] === "missing_key");
              const checked = activeTools.includes(toolId);
              const isToolDisabled = disabled || isGated;

              return (
                <label
                  key={toolId}
                  className={`flex items-start gap-2.5 p-1.5 rounded-md transition-colors ${
                    isToolDisabled
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-card-hover/50 cursor-pointer"
                  }`}
                  title={isGated ? `Requires ${gateKey} in Settings > Env Vars` : undefined}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isToolDisabled}
                    onChange={() => !isToolDisabled && handleToggleTool(toolId)}
                    className="mt-0.5 accent-accent"
                  />
                  <div>
                    <div className="font-semibold text-foreground font-mono text-xs flex items-center gap-1.5">
                      {meta?.displayName || toolId}
                      {isGated && (
                        <span className="px-1 py-0.2 bg-warning/10 text-warning text-[8px] font-semibold rounded">
                          Gated
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground text-xs leading-snug">
                      {meta?.description}
                      {isGated && (
                        <span className="block text-warning text-[8px] mt-0.5 font-medium">
                          Requires {gateKey}
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
}
