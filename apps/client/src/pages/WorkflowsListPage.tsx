// SPDX-License-Identifier: MIT
import { useWorkflowList } from "@/hooks/useWorkflowList";
import { deleteWorkflow, saveWorkflow } from "@/lib/api/workflows.service";
import { ArrowRight, GitBranch, Layers, Plus, RefreshCw, Trash2 } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import type { WorkflowDefinition } from "shared";

export const WorkflowsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { workflows, loading, error, refresh } = useWorkflowList();

  const handleCreateNew = async () => {
    const newWf: WorkflowDefinition = {
      id: crypto.randomUUID(),
      name: "New Workflow",
      description: "Custom automated agentic workflow",
      steps: [
        {
          id: "step-1",
          type: "agent",
          label: "Initial Task",
          taskTemplate: "Analyze initial inputs and produce findings.",
        },
      ],
      onError: "stop",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const saved = await saveWorkflow(newWf);
    navigate(`/workflows/${saved.id}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this workflow?")) {
      await deleteWorkflow(id);
      refresh();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative select-none">
      {/* Header Bar */}
      <div className="h-14 px-6 border-b border-border flex items-center justify-between flex-shrink-0 bg-card/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground tracking-wide">
              Workflows Studio
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Automated DAG execution pipelines and multi-agent workflows
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="p-2 rounded-xl bg-accent hover:bg-accent/80 text-muted-foreground hover:text-foreground transition cursor-pointer border border-border"
            title="Refresh List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleCreateNew}
            className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Workflow
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
            <RefreshCw className="w-5 h-5 animate-spin text-primary mr-2" /> Loading Workflows...
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-destructive text-xs font-semibold">
            {error}
          </div>
        ) : workflows.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="p-4 rounded-2xl bg-card border border-border mb-3 text-primary">
              <GitBranch className="w-8 h-8 opacity-70" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">No Workflows Configured</h3>
            <p className="text-xs text-muted-foreground max-w-sm mb-4">
              Build graph-based DAG workflows with parallel execution, sub-agent steps, and
              human-in-the-loop approvals.
            </p>
            <button
              onClick={handleCreateNew}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-2 shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Create First Workflow
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                onClick={() => navigate(`/workflows/${wf.id}`)}
                className="group p-5 rounded-2xl border border-border bg-card/40 hover:bg-card hover:border-primary/40 transition cursor-pointer flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                        <GitBranch className="w-4 h-4" />
                      </span>
                      <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition truncate">
                        {wf.name}
                      </h3>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, wf.id)}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                      title="Delete Workflow"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {wf.description || "No description provided."}
                  </p>
                </div>

                <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    <span>{wf.steps?.length || 0} steps</span>
                  </div>
                  <span className="flex items-center gap-1 text-primary group-hover:translate-x-0.5 transition font-semibold text-[11px]">
                    Open Studio <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
