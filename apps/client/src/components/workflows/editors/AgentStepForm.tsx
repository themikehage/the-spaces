import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";
import React from "react";
import { AGENT_OUTPUT_MAX_CHARS, type WorkflowStep } from "shared";

type SubagentType = "builder" | "explorer" | "autonomous";

const SUBAGENT_TYPE_OPTIONS: DropdownOption<SubagentType>[] = [
  { value: "builder", label: "Builder Subagent" },
  { value: "explorer", label: "Explorer Subagent" },
  { value: "autonomous", label: "Autonomous Subagent" },
];

interface AgentStepFormProps {
  step: WorkflowStep;
  onUpdate: (updated: WorkflowStep) => void;
  onFocusField: (field: "taskTemplate") => void;
}

export const AgentStepForm: React.FC<AgentStepFormProps> = ({
  step,
  onUpdate,
  onFocusField,
}) => {
  return (
    <>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          Subagent Strategy
        </label>
        <Dropdown
          value={step.subagentType || "builder"}
          onChange={(val) => onUpdate({ ...step, subagentType: val })}
          options={SUBAGENT_TYPE_OPTIONS}
          matchWidth
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          Agent ID (Optional)
        </label>
        <input
          type="text"
          value={step.agentId || ""}
          onChange={(e) => onUpdate({ ...step, agentId: e.target.value || undefined })}
          placeholder="Leave blank for anonymous subagent"
          className="w-full px-3 py-1.5 rounded-lg bg-accent/50 border border-border text-foreground text-xs font-mono focus:outline-none focus:border-primary"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          Max Output Chars (Optional)
        </label>
        <input
          type="number"
          min={1}
          value={step.agentOutputMaxChars ?? AGENT_OUTPUT_MAX_CHARS}
          onChange={(e) => {
            const v = Number(e.target.value);
            onUpdate({
              ...step,
              agentOutputMaxChars: Number.isFinite(v) && v > 0 ? v : undefined,
            });
          }}
          placeholder={`Default: ${AGENT_OUTPUT_MAX_CHARS}`}
          className="w-full px-3 py-1.5 rounded-lg bg-accent/50 border border-border text-foreground text-xs font-mono focus:outline-none focus:border-primary"
        />
        <p className="text-[10px] text-muted-foreground mt-1">
          Maximum chars for the step output summary. Default {AGENT_OUTPUT_MAX_CHARS}.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          Task Template
        </label>
        <textarea
          value={step.taskTemplate || ""}
          onFocus={() => onFocusField("taskTemplate")}
          onChange={(e) => onUpdate({ ...step, taskTemplate: e.target.value })}
          rows={4}
          placeholder="Use {{ $inputs.var }} or {{ $steps.step1.outputs.var }}"
          className="w-full px-3 py-2 rounded-lg bg-accent/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary font-mono"
        />
      </div>
    </>
  );
};
