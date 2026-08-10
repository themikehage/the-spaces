// SPDX-License-Identifier: MIT
import { customToolsService } from "@/lib/api/custom-tools.service";
import { useCallback, useEffect, useState } from "react";
import type { CustomToolSummary } from "shared";

export interface CustomToolEntry {
  name: string;
  label: string;
  description: string;
  enabled: boolean;
}

export function useCustomToolsList() {
  const [tools, setTools] = useState<CustomToolEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const all: CustomToolSummary[] = await customToolsService.fetchCustomTools();
      setTools(
        all
          .filter((t) => t.enabled !== false)
          .map((t) => ({
            name: t.name,
            label: t.label || t.name,
            description: t.description || "",
            enabled: t.enabled !== false,
          })),
      );
    } catch {
      // non-fatal — dropdown still works with built-in tools
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tools, isLoading, refresh };
}
