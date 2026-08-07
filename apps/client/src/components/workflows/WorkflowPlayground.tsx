// SPDX-License-Identifier: MIT
import { Code2, FormInput, Pin, RefreshCw, Send, Sparkles } from "lucide-react";
import React, { useState } from "react";
import type { WorkflowDefinition, WorkflowRun } from "shared";
import { WorkflowRunPanel } from "./WorkflowRunPanel";

interface WorkflowPlaygroundProps {
  workflow: WorkflowDefinition;
  activeRun: WorkflowRun | null;
  onRunWorkflow: (inputs?: Record<string, unknown>, options?: { dryRun?: boolean }) => Promise<void>;
  onAbortRun: (runId: string) => Promise<void>;
  onResolveApproval?: (runId: string, stepId: string, approved: boolean) => Promise<void>;
}

export const WorkflowPlayground: React.FC<WorkflowPlaygroundProps> = ({
  workflow,
  activeRun,
  onRunWorkflow,
  onAbortRun,
  onResolveApproval,
}) => {
  const inputConfigs = workflow.inputs ? Object.entries(workflow.inputs) : [];
  const [formInputs, setFormInputs] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
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

  const [rawText, setRawText] = useState<string>("");
  const [useRawJson, setUseRawJson] = useState<boolean>(inputConfigs.length === 0);
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [isDryRun, setIsDryRun] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFieldChange = (key: string, value: unknown) => {
    setFormInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleExecute = async () => {
    setError(null);
    setIsRunning(true);
    try {
      let payload: Record<string, unknown> = {};
      if (useRawJson || inputConfigs.length === 0) {
        if (rawText.trim().startsWith("{") || rawText.trim().startsWith("[")) {
          try {
            payload = JSON.parse(rawText);
          } catch {
            payload = { message: rawText };
          }
        } else {
          payload = { message: rawText };
        }
      } else {
        payload = formInputs;
      }
      await onRunWorkflow(payload, { dryRun: isDryRun });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to launch workflow execution";
      setError(msg);
    } finally {
      setIsRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isRunning && activeRun?.status !== "running") {
        handleExecute();
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-background">
      {/* Top Main Section: Full-screen Execution Stream */}
      <div className="flex-1 overflow-y-auto p-6 pb-36 bg-background/40">
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
              onResolveApproval={onResolveApproval}
            />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm mb-4">
              <Sparkles className="w-8 h-8 text-primary opacity-80" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              Workflow Playground: {workflow.name}
            </h3>
            <p className="text-xs max-w-md text-muted-foreground mb-4">
              Send an execution trigger below to launch real-time DAG steps. You'll see step logs and live outputs right here.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
              <span className="px-2 py-0.5 rounded-md bg-accent border border-border">
                {workflow.steps?.length || 0} Steps
              </span>
              <span>•</span>
              <span className="px-2 py-0.5 rounded-md bg-accent border border-border">
                {inputConfigs.length} Defined Inputs
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Section: Floating Chat-like Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent flex flex-col items-center justify-end z-10 pointer-events-none">
        <div className="max-w-3xl w-full pointer-events-auto flex flex-col gap-2">
          {error && (
            <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs backdrop-blur-sm">
              {error}
            </div>
          )}

          {/* Form Modal / Collapsible for Structured Form Inputs */}
          {!useRawJson && inputConfigs.length > 0 && showFormModal && (
            <div className="p-4 rounded-2xl bg-card border border-border shadow-xl space-y-3 mb-1">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FormInput className="w-3.5 h-3.5 text-primary" />
                  Structured Inputs Form
                </span>
                <button
                  onClick={() => setShowFormModal(false)}
                  className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Close Form
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                {inputConfigs.map(([key, param]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[11px] font-medium text-foreground flex items-center justify-between">
                      <span>{param.label || key}</span>
                      {param.required && <span className="text-destructive text-[9px]">*req</span>}
                    </label>
                    {param.type === "boolean" ? (
                      <input
                        type="checkbox"
                        checked={!!formInputs[key]}
                        onChange={(e) => handleFieldChange(key, e.target.checked)}
                        className="rounded border-border bg-accent text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                      />
                    ) : param.type === "number" ? (
                      <input
                        type="number"
                        value={(formInputs[key] as number) ?? 0}
                        onChange={(e) => handleFieldChange(key, Number(e.target.value))}
                        className="w-full px-3 py-1 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                      />
                    ) : (
                      <input
                        type="text"
                        value={(formInputs[key] as string) ?? ""}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        placeholder={`Enter ${key}...`}
                        className="w-full px-3 py-1 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Floating Input Card */}
          <div className="bg-card/90 border border-border/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md p-3 focus-within:border-primary/60 transition-all duration-200">
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder={
                !useRawJson && inputConfigs.length > 0
                  ? `Click "Form Inputs" below or enter message/JSON payload here...`
                  : `Enter input message or JSON payload for ${workflow.name}...`
              }
              className="w-full bg-transparent border-none text-xs text-foreground placeholder:text-muted-foreground focus:outline-none resize-none font-sans"
            />

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                {/* Dry Run Toggle */}
                <button
                  type="button"
                  onClick={() => setIsDryRun(!isDryRun)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition cursor-pointer ${
                    isDryRun
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-accent/40 text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  <Pin className="w-3 h-3" />
                  <span>Dry Run</span>
                </button>

                {/* Switch between JSON/Text and Form mode if inputConfigs exist */}
                {inputConfigs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (useRawJson) {
                        setUseRawJson(false);
                        setShowFormModal(true);
                      } else {
                        setShowFormModal(!showFormModal);
                      }
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border border-border bg-accent/40 text-muted-foreground hover:text-foreground transition cursor-pointer"
                  >
                    {useRawJson ? <Code2 className="w-3 h-3" /> : <FormInput className="w-3 h-3" />}
                    <span>{useRawJson ? "Raw JSON Mode" : "Form Inputs"}</span>
                  </button>
                )}
              </div>

              {/* Run / Send Button */}
              <button
                onClick={handleExecute}
                disabled={isRunning || activeRun?.status === "running"}
                className="py-1.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Run</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

