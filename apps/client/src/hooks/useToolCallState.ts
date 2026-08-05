// SPDX-License-Identifier: MIT
import type { ToolResultData } from "@/components/chat/tools/ToolCallRow";
import { isCustomToolCheck } from "@/components/chat/tools/tool-row-utils";
import { useEffect, useState } from "react";

interface UseToolCallStateParams {
  toolName: string;
  args: Record<string, unknown>;
  result: ToolResultData | null;
  toolCallId?: string;
  disabled?: boolean;
}

export function useToolCallState({
  toolName,
  args: _args,
  result,
  toolCallId,
  disabled = false,
}: UseToolCallStateParams) {
  const [partialResult, setPartialResult] = useState<any>(null);

  useEffect(() => {
    if (!toolCallId || result !== null) return;

    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.partialResult) {
        setPartialResult(detail.partialResult);
      }
    };

    window.addEventListener(`tool-update-${toolCallId}`, handleUpdate);
    return () => {
      window.removeEventListener(`tool-update-${toolCallId}`, handleUpdate);
    };
  }, [toolCallId, result]);

  const resultPresentation = (result?.details as any)?.presentation;
  const isCustomTool = isCustomToolCheck(toolName);

  const [expanded, setExpanded] = useState(() => {
    if (disabled) return false;
    if (resultPresentation?.defaultExpanded !== undefined) {
      return !!resultPresentation.defaultExpanded;
    }
    if (isCustomTool) {
      return true;
    }
    return (
      toolName === "edit" ||
      toolName === "bash" ||
      toolName === "request_approval" ||
      toolName === "ask_question" ||
      toolName === "render_images" ||
      toolName === "render_html" ||
      toolName === "render_chart" ||
      toolName === "share_file" ||
      toolName === "spawn_subagent" ||
      toolName === "delegate_task" ||
      toolName === "manage_delegations" ||
      toolName === "exa_search" ||
      toolName === "web_fetch" ||
      toolName === "memory_recall" ||
      toolName === "memory_store"
    );
  });

  const activeResult =
    result ||
    (partialResult
      ? {
          toolName,
          content: [
            {
              type: "text",
              text:
                typeof partialResult === "string"
                  ? partialResult
                  : partialResult.output || partialResult.text || JSON.stringify(partialResult),
            },
          ],
          isError: false,
          details: partialResult.details || partialResult,
        }
      : null);

  const running = result === null;
  const hasError = result?.isError ?? false;

  return {
    expanded,
    setExpanded,
    toggleExpanded: () => !disabled && setExpanded((prev) => !prev),
    activeResult,
    running,
    hasError,
  };
}
