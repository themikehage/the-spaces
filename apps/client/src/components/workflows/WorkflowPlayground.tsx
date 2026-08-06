// SPDX-License-Identifier: MIT
import { Play, RefreshCw, Send, Terminal } from "lucide-react";
import React, { useState } from "react";
import type { WorkflowDefinition, WorkflowRun } from "shared";
import { WorkflowRunPanel } from "./WorkflowRunPanel";

interface WorkflowPlaygroundProps {
  workflow: WorkflowDefinition;
  activeRun: WorkflowRun | null;
  onRunWorkflow: (inputs?: Record<string, unknown>) => Promise<void>;
  onAbortRun: (runId: string) => Promise<void>;
  onApproveStep: (runId: string, stepId: string) => Promise<void>;
  onRejectStep: (runId: string, stepId: string) => Promise<void>;
}

export const WorkflowPlayground: React.FC<WorkflowPlaygroundProps> = ({
  workflow,
  activeRun,
  onRunWorkflow,
  onAbortRun,
  onApproveStep,
  onRejectStep,
}) => {
  const inputConfigs = workflow.inputs ? Object.entries(workflow.inputs) : [];
  const [formInputs, setFormInputs] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    inputConfigs.forEach(([key, param]) => {
      if (param.default !== undefined) {
        initial[key] = param.default;
      } else if (param.type === "boolean") {
        initial[key] = false;
      } else if (param.type === "number") {
        initial[key] = 0;
      } else {
        initial[key] = "";
      }
    });
    return initial;
  });

  const [rawJsonInput, setRawJsonInput] = useState<string>('{\n  "message": ""\n}');
  const [useRawJson, setUseRawJson] = useState<boolean>(inputConfigs.length === 0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFieldChange = (key: string, value: any) => {
    setFormInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleExecute = async () => {
    setError(null);
    setIsRunning(true);
    try {
      let payload: Record<string, unknown> = {};
      if (useRawJson || inputConfigs.length === 0) {
        try {
          payload = JSON.parse(rawJsonInput);
        } catch {
          // If not valid JSON, treat as message text string
          payload = { message: rawJsonInput };
        }
      } else {
        payload = formInputs;
      }
      await onRunWorkflow(payload);
    } catch (err: any) {
      setError(err.message || "Failed to launch workflow execution");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-background">
      {/* Left Column: Workflow Playground Input Form */}
      <div className="w-full md:w-96 border-r border-border bg-card/20 flex flex-col h-full flex-shrink-0">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
            <Terminal className="w-4 h-4 text-primary" />
            <span>Playground Inputs</span>
          </div>
          {inputConfigs.length > 0 && (
            <button
              onClick={() => setUseRawJson(!useRawJson)}
              className="text-[11px] text-muted-foreground hover:text-primary transition"
            >
              {useRawJson ? "Form Mode" : "JSON Mode"}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Execute <span className="font-medium text-foreground">{workflow.name}</span> in real
            time and monitor step execution.
          </p>

          {error && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {error}
            </div>
          )}

          {!useRawJson && inputConfigs.length > 0 ? (
            <div className="space-y-3">
              {inputConfigs.map(([key, param]) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs font-medium text-foreground flex items-center justify-between">
                    <span>{param.label || key}</span>
                    {param.required && (
                      <span className="text-destructive text-[10px]">*required</span>
                    )}
                  </label>
                  {param.description && (
                    <p className="text-[11px] text-muted-foreground">{param.description}</p>
                  )}

                  {param.type === "boolean" ? (
                    <input
                      type="checkbox"
                      checked={!!formInputs[key]}
                      onChange={(e) => handleFieldChange(key, e.target.checked)}
                      className="rounded border-border bg-accent text-primary focus:ring-primary h-4 w-4"
                    />
                  ) : param.type === "number" ? (
                    <input
                      type="number"
                      value={formInputs[key] ?? 0}
                      onChange={(e) => handleFieldChange(key, Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                    />
                  ) : (
                    <input
                      type="text"
                      value={formInputs[key] ?? ""}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      placeholder={`Enter ${key}...`}
                      className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Payload Inputs (JSON or Text)
              </label>
              <textarea
                value={rawJsonInput}
                onChange={(e) => setRawJsonInput(e.target.value)}
                rows={10}
                placeholder="Enter input JSON payload..."
                className="w-full p-3 rounded-lg bg-card border border-border text-xs font-mono text-foreground focus:outline-none focus:border-primary resize-none"
              />
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border bg-card/30">
          <button
            onClick={handleExecute}
            disabled={isRunning || activeRun?.status === "running"}
            className="w-full py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Launching...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Playground</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Column: Live Run Execution Output */}
      <div className="flex-1 overflow-y-auto p-6 bg-background/50 flex flex-col justify-start">
        {activeRun ? (
          <div className="max-w-4xl mx-auto w-full space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" />
                <span>Live Execution Stream</span>
              </h2>
              <span className="text-xs font-mono text-muted-foreground">
                Run #{activeRun.id.slice(0, 8)}
              </span>
            </div>
            <WorkflowRunPanel
              run={activeRun}
              workflow={workflow}
              onAbort={onAbortRun}
              onApproveStep={onApproveStep}
              onRejectStep={onRejectStep}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
            <div className="p-4 rounded-2xl bg-card border border-border mb-3">
              <Play className="w-8 h-8 text-primary opacity-60" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Ready to Test Workflow</h3>
            <p className="text-xs max-w-sm">
              Configure input payload on the left and click "Run Playground" to trigger real-time
              DAG step execution.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
