// SPDX-License-Identifier: MIT
import { fetchWorkflows } from "@/lib/api/workflows.service";
import { EntityEventBus } from "@/lib/event-bus";
import { useCallback, useEffect, useState } from "react";
import type { WorkflowDefinition } from "shared";

export function useWorkflowList() {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWorkflows = useCallback(async () => {
    try {
      const data = await fetchWorkflows();
      setWorkflows(data);
    } catch (err: any) {
      console.error("Failed to fetch workflows in sidebar:", err);
      setError(err.message || "Failed to load workflows");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  useEffect(() => {
    return EntityEventBus.subscribe((detail) => {
      if (!detail?.type || detail.type === "workflow" || detail.type === "all") {
        loadWorkflows();
      }
    });
  }, [loadWorkflows]);

  return {
    workflows,
    loading,
    error,
    refresh: loadWorkflows,
  };
}
