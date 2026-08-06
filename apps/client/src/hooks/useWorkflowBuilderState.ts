// SPDX-License-Identifier: MIT
import {
  abortWorkflowRun,
  deleteWorkflow as apiDeleteWorkflow,
  runWorkflow as apiRunWorkflow,
  saveWorkflow as apiSaveWorkflow,
  fetchWorkflowRuns,
  fetchWorkflows,
  resolveWorkflowApproval,
} from "@/lib/api/workflows.service";
import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkflowDefinition, WorkflowRun, WorkflowStep } from "shared";
import { useWebSocket } from "./useWebSocket";

export function useWorkflowBuilderState(targetWorkflowId?: string) {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const [activeRun, setActiveRun] = useState<WorkflowRun | null>(null);
  const [runHistory, setRunHistory] = useState<WorkflowRun[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { subscribe } = useWebSocket(null);
  const savedRef = useRef<string>("");

  const loadWorkflows = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await fetchWorkflows();
      setWorkflows(list);
      if (targetWorkflowId) {
        const found = list.find((w) => w.id === targetWorkflowId);
        if (found) {
          setSelectedWorkflow(found);
          savedRef.current = JSON.stringify(found);
          setIsDirty(false);
        }
      } else if (list.length > 0 && !selectedWorkflow) {
        setSelectedWorkflow(list[0]);
        savedRef.current = JSON.stringify(list[0]);
        setIsDirty(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load workflows";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [targetWorkflowId]);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const loadRunHistory = useCallback(async (workflowId: string) => {
    try {
      const runs = await fetchWorkflowRuns(workflowId);
      setRunHistory(runs);
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    if (selectedWorkflow) {
      loadRunHistory(selectedWorkflow.id);
    }
  }, [selectedWorkflow, loadRunHistory]);

  // Subscribe to real-time workflow events via WS
  useEffect(() => {
    const unsubStarted = subscribe("workflow_run_started", (data: any) => {
      if (selectedWorkflow && data.workflowId === selectedWorkflow.id) {
        loadRunHistory(selectedWorkflow.id);
      }
    });

    const unsubStepStarted = subscribe("workflow_step_started", (data: any) => {
      setActiveRun((prev) => {
        if (!prev || prev.id !== data.runId) return prev;
        return {
          ...prev,
          stepStates: {
            ...prev.stepStates,
            [data.stepId]: {
              ...(prev.stepStates[data.stepId] || { stepId: data.stepId }),
              stepId: data.stepId,
              status: "running",
              startedAt: new Date().toISOString(),
              agentSessionId: data.agentSessionId || prev.stepStates[data.stepId]?.agentSessionId,
            },
          },
        };
      });
    });

    const unsubStepCompleted = subscribe("workflow_step_completed", (data: any) => {
      setActiveRun((prev) => {
        if (!prev || prev.id !== data.runId) return prev;
        return {
          ...prev,
          stepStates: {
            ...prev.stepStates,
            [data.stepId]: {
              ...(prev.stepStates[data.stepId] || { stepId: data.stepId }),
              status: data.status,
              completedAt: new Date().toISOString(),
              outputs: data.outputs,
            },
          },
        };
      });
    });

    const unsubApprovalRequested = subscribe("workflow_approval_requested", (data: any) => {
      setActiveRun((prev) => {
        if (!prev || prev.id !== data.runId) return prev;
        return {
          ...prev,
          status: "waiting_approval",
          stepStates: {
            ...prev.stepStates,
            [data.stepId]: {
              ...(prev.stepStates[data.stepId] || { stepId: data.stepId }),
              status: "waiting_approval",
            },
          },
        };
      });
    });

    const unsubCompleted = subscribe("workflow_run_completed", (data: any) => {
      setActiveRun((prev) => {
        if (!prev || prev.id !== data.runId) return prev;
        return { ...prev, status: data.status, completedAt: new Date().toISOString() };
      });
      if (selectedWorkflow) {
        loadRunHistory(selectedWorkflow.id);
      }
    });

    return () => {
      unsubStarted();
      unsubStepStarted();
      unsubStepCompleted();
      unsubApprovalRequested();
      unsubCompleted();
    };
  }, [subscribe, selectedWorkflow, loadRunHistory]);

  const updateSelectedWorkflow = (newWf: WorkflowDefinition) => {
    setSelectedWorkflow(newWf);
    setIsDirty(JSON.stringify(newWf) !== savedRef.current);
  };

  const handleSelectWorkflow = (wf: WorkflowDefinition) => {
    setSelectedWorkflow(wf);
    savedRef.current = JSON.stringify(wf);
    setIsDirty(false);
    setSelectedStep(null);
    setActiveRun(null);
  };

  const handleCreateWorkflow = () => {
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
    setSelectedWorkflow(newWf);
    savedRef.current = "";
    setIsDirty(true);
    setSelectedStep(newWf.steps[0]);
  };

  const handleSaveWorkflow = async () => {
    if (!selectedWorkflow) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = {
        ...selectedWorkflow,
        updatedAt: new Date().toISOString(),
      };
      const saved = await apiSaveWorkflow(updated);
      setSelectedWorkflow(saved);
      savedRef.current = JSON.stringify(saved);
      setIsDirty(false);
      await loadWorkflows();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save workflow";
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    try {
      await apiDeleteWorkflow(id);
      if (selectedWorkflow?.id === id) {
        setSelectedWorkflow(null);
        setSelectedStep(null);
      }
      await loadWorkflows();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete workflow";
      setError(msg);
    }
  };

  const handleAddStep = (type: WorkflowStep["type"] = "agent") => {
    if (!selectedWorkflow) return;
    const newStepId = `step-${selectedWorkflow.steps.length + 1}`;
    const newStep: WorkflowStep = {
      id: newStepId,
      type,
      label: `New ${type.toUpperCase()} Step`,
      taskTemplate: type === "agent" ? "Execute agent task..." : undefined,
      condition: type === "if" || type === "switch" ? "$inputs.amount > 0" : undefined,
      codeSnippet: type === "code" ? "return { outputs: {} };" : undefined,
      approvalMessage: type === "approval" ? `Approval required for step ${newStepId}` : undefined,
    };
    const updatedSteps = [...selectedWorkflow.steps, newStep];
    updateSelectedWorkflow({ ...selectedWorkflow, steps: updatedSteps });
    setSelectedStep(newStep);
  };

  const handleUpdateStep = (updated: WorkflowStep) => {
    if (!selectedWorkflow) return;
    const steps = selectedWorkflow.steps.map((s) => (s.id === updated.id ? updated : s));
    updateSelectedWorkflow({ ...selectedWorkflow, steps });
    setSelectedStep(updated);
  };

  const handleDeleteStep = (stepId: string) => {
    if (!selectedWorkflow) return;
    const steps = selectedWorkflow.steps.filter((s) => s.id !== stepId);
    updateSelectedWorkflow({ ...selectedWorkflow, steps });
    if (selectedStep?.id === stepId) {
      setSelectedStep(null);
    }
  };

  const handleRunWorkflow = async (
    inputs?: Record<string, unknown>,
    options?: { dryRun?: boolean },
  ) => {
    if (!selectedWorkflow) return;
    setError(null);
    try {
      const run = await apiRunWorkflow(selectedWorkflow.id, inputs, options);
      setActiveRun(run);
      await loadRunHistory(selectedWorkflow.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to launch workflow run";
      setError(msg);
    }
  };

  const handleResolveApproval = async (runId: string, stepId: string, approved: boolean) => {
    try {
      await resolveWorkflowApproval(runId, stepId, approved);
      if (selectedWorkflow) {
        await loadRunHistory(selectedWorkflow.id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resolve approval";
      setError(msg);
    }
  };

  const handleSelectRun = (run: WorkflowRun) => {
    setActiveRun(run);
  };

  const handleAbortRun = async (runId: string) => {
    try {
      await abortWorkflowRun(runId);
      if (selectedWorkflow) {
        await loadRunHistory(selectedWorkflow.id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to abort run";
      setError(msg);
    }
  };

  return {
    workflows,
    selectedWorkflow,
    selectedStep,
    activeRun,
    runHistory,
    isLoading,
    isSaving,
    isDirty,
    error,
    actions: {
      handleSelectWorkflow,
      handleCreateWorkflow,
      handleSaveWorkflow,
      handleDeleteWorkflow,
      handleAddStep,
      handleUpdateStep,
      handleDeleteStep,
      handleRunWorkflow,
      handleResolveApproval,
      handleSelectRun,
      handleAbortRun,
      setSelectedStep,
      setActiveRun,
    },
  };
}
