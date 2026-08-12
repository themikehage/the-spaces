// SPDX-License-Identifier: MIT
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { HeaderWithActions } from "@/components/ui/HeaderWithActions";
import { IconButton } from "@/components/ui/IconButton";
import { LoadingState } from "@/components/ui/LoadingState";
import { useWorkflowList } from "@/hooks/useWorkflowList";
import { deleteWorkflow, saveWorkflow } from "@/lib/api/workflows.service";
import { ArrowRight, GitBranch, Layers, Plus, Trash2 } from "lucide-react";
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
      <HeaderWithActions
        title="Workflows Studio"
        subtitle="Automated DAG execution pipelines and multi-agent workflows"
        icon={GitBranch}
        count={workflows.length}
        onRefresh={refresh}
        isRefreshing={loading}
        primaryAction={{
          label: "New Workflow",
          icon: Plus,
          onClick: handleCreateNew,
        }}
      />

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <LoadingState label="Loading Workflows..." />
        ) : error ? (
          <ErrorState error={error} onRetry={refresh} />
        ) : workflows.length === 0 ? (
          <EmptyState
            icon={GitBranch}
            title="No Workflows Configured"
            description="Build graph-based DAG workflows with parallel execution, sub-agent steps, and human-in-the-loop approvals."
            actionLabel="Create First Workflow"
            onAction={handleCreateNew}
            actionIcon={Plus}
          />
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
                      {wf.tag && (
                        <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full flex-shrink-0 bg-primary/10 text-primary border border-primary/20">
                          {wf.tag}
                        </span>
                      )}
                    </div>
                    <IconButton
                      icon={Trash2}
                      size="sm"
                      tooltip="Delete Workflow"
                      onClick={(e) => handleDelete(e, wf.id)}
                      className="opacity-0 group-hover:opacity-100"
                    />
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
