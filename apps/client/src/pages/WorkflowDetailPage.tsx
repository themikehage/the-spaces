// SPDX-License-Identifier: MIT
import { TabsNav } from "@/components/ui/TabsNav";
import { WorkflowCanvas } from "@/components/workflows/WorkflowCanvas";
import { WorkflowExecutionsTab } from "@/components/workflows/WorkflowExecutionsTab";
import { WorkflowPlayground } from "@/components/workflows/WorkflowPlayground";
import { WorkflowStepEditor } from "@/components/workflows/WorkflowStepEditor";
import { useWorkflowBuilderState } from "@/hooks/useWorkflowBuilderState";
import { AlertCircle, ArrowLeft, GitBranch, Play, Save, Trash2 } from "lucide-react";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";

export const WorkflowDetailPage: React.FC = () => {
  const { workflowId, tab = "playground" } = useParams<{ workflowId: string; tab?: string }>();
  const navigate = useNavigate();

  const {
    selectedWorkflow,
    selectedStep,
    activeRun,
    runHistory,
    isLoading,
    isSaving,
    isDirty,
    error,
    actions,
  } = useWorkflowBuilderState(workflowId);

  const tabs = [
    { id: "playground", label: "Playground" },
    { id: "editor", label: "Editor" },
    { id: "executions", label: `Executions (${runHistory.length})` },
  ];

  const handleTabChange = (tabId: string) => {
    if (workflowId) {
      navigate(`/workflows/${workflowId}/${tabId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-background text-muted-foreground text-xs">
        Loading Workflow...
      </div>
    );
  }

  if (!selectedWorkflow) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-background text-muted-foreground text-xs space-y-3">
        <p>Workflow not found or deleted.</p>
        <button
          onClick={() => navigate("/workflows")}
          className="px-3 py-1.5 rounded-lg bg-accent text-foreground hover:bg-accent/80 transition"
        >
          Back to Workflows
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-border bg-card/40 px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/workflows")}
            className="p-1.5 rounded-lg bg-card hover:bg-accent border border-border text-muted-foreground hover:text-foreground transition"
            title="Back to Workflows List"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="p-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-foreground">{selectedWorkflow.name}</h1>
              {isDirty && (
                <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Unsaved
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate max-w-md">
              {selectedWorkflow.description || "Automated Agentic Workflow DAG"}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {tab === "editor" && (
            <button
              onClick={actions.handleSaveWorkflow}
              disabled={isSaving || !isDirty}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition disabled:opacity-40 shadow-sm cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> {isSaving ? "Saving..." : "Save"}
            </button>
          )}

          {tab !== "playground" && (
            <button
              onClick={() => {
                handleTabChange("playground");
                actions.handleRunWorkflow();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-sm cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Run Playground
            </button>
          )}

          <button
            onClick={async () => {
              if (confirm("Delete this workflow?")) {
                await actions.handleDeleteWorkflow(selectedWorkflow.id);
                navigate("/workflows");
              }
            }}
            className="p-2 rounded-xl bg-accent hover:bg-destructive/10 text-muted-foreground hover:text-destructive border border-border transition cursor-pointer"
            title="Delete Workflow"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="px-6 bg-card/20 border-b border-border">
        <TabsNav tabs={tabs} activeTab={tab} onChange={handleTabChange} />
      </div>

      {error && (
        <div className="bg-destructive/15 border-b border-destructive/20 text-destructive text-xs px-6 py-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Tab Content */}
      <div className="flex-1 flex overflow-hidden">
        {tab === "playground" && (
          <WorkflowPlayground
            workflow={selectedWorkflow}
            activeRun={activeRun}
            onRunWorkflow={actions.handleRunWorkflow}
            onAbortRun={actions.handleAbortRun}
          />
        )}

        {tab === "editor" && (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
              <WorkflowCanvas
                workflow={selectedWorkflow}
                selectedStep={selectedStep}
                activeRun={activeRun}
                onSelectStep={actions.setSelectedStep}
                onAddStep={actions.handleAddStep}
                onDeleteStep={actions.handleDeleteStep}
              />
            </div>
            {selectedStep && (
              <WorkflowStepEditor
                step={selectedStep}
                workflow={selectedWorkflow}
                onUpdate={actions.handleUpdateStep}
                onDelete={actions.handleDeleteStep}
                onClose={() => actions.setSelectedStep(null)}
              />
            )}
          </div>
        )}

        {tab === "executions" && (
          <WorkflowExecutionsTab
            workflow={selectedWorkflow}
            runHistory={runHistory}
            activeRun={activeRun}
            onSelectRun={actions.handleSelectRun}
            onAbortRun={actions.handleAbortRun}
          />
        )}
      </div>
    </div>
  );
};
