import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";
import React from "react";
import type { WorkflowStep } from "shared";

type ResponseFormatOption = "text" | "json";

const RESPONSE_FORMAT_OPTIONS: DropdownOption<ResponseFormatOption>[] = [
  { value: "text", label: "Text Response" },
  { value: "json", label: "Structured JSON Response" },
];

interface LlmStepFormProps {
  step: WorkflowStep;
  onUpdate: (updated: WorkflowStep) => void;
  onFocusField: (field: "llmPrompt" | "llmSystemPrompt") => void;
}

export const LlmStepForm: React.FC<LlmStepFormProps> = ({
  step,
  onUpdate,
  onFocusField,
}) => {
  return (
    <>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          Prompt Template
        </label>
        <textarea
          value={step.llmPrompt || ""}
          onFocus={() => onFocusField("llmPrompt")}
          onChange={(e) => onUpdate({ ...step, llmPrompt: e.target.value })}
          rows={4}
          placeholder="Enter prompt template. Use {{ $inputs.var }} or {{ $steps.step1.outputs.text }}"
          className="w-full px-3 py-2 rounded-lg bg-accent/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary font-mono"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          System Prompt (Optional)
        </label>
        <textarea
          value={step.llmSystemPrompt || ""}
          onFocus={() => onFocusField("llmSystemPrompt")}
          onChange={(e) => onUpdate({ ...step, llmSystemPrompt: e.target.value || undefined })}
          rows={2}
          placeholder="You are a helpful assistant..."
          className="w-full px-3 py-1.5 rounded-lg bg-accent/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary font-mono"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          Response Format
        </label>
        <Dropdown
          value={step.llmResponseFormat || "text"}
          onChange={(val) => onUpdate({ ...step, llmResponseFormat: val })}
          options={RESPONSE_FORMAT_OPTIONS}
          matchWidth
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Model ID (Optional)
          </label>
          <input
            type="text"
            value={step.llmModelId || ""}
            onChange={(e) => onUpdate({ ...step, llmModelId: e.target.value || undefined })}
            placeholder="Default user model"
            className="w-full px-3 py-1.5 rounded-lg bg-accent/50 border border-border text-foreground text-xs font-mono focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Temperature
          </label>
          <input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={step.llmTemperature ?? ""}
            onChange={(e) => {
              const val = e.target.value !== "" ? parseFloat(e.target.value) : undefined;
              onUpdate({ ...step, llmTemperature: val });
            }}
            placeholder="0.7"
            className="w-full px-3 py-1.5 rounded-lg bg-accent/50 border border-border text-foreground text-xs font-mono focus:outline-none focus:border-primary"
          />
        </div>
      </div>
    </>
  );
};
