// SPDX-License-Identifier: MIT
import { type AgentSession } from "../../ai";
import { type PipelineStep } from "./schemas";

export interface PipelineContext {
  cwd: string;
  session: AgentSession;
  username: string;
  sessionId: string;
}

function getNestedValue(obj: Record<string, any>, path: string): any {
  const keys = path.split(".");
  let current: any = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === "string") {
      try {
        current = JSON.parse(current);
      } catch {
        return undefined;
      }
    }
    if (typeof current !== "object") return undefined;
    current = current[key];
  }
  return current;
}

export function buildScopeWithDefaults(
  params: Record<string, any>,
  schema?: Record<string, any>,
): Record<string, any> {
  const scope: Record<string, any> = { ...params };
  if (schema?.properties && typeof schema.properties === "object") {
    for (const [key, prop] of Object.entries<any>(schema.properties)) {
      if (scope[key] === undefined && prop && prop.default !== undefined) {
        scope[key] = prop.default;
      }
    }
  }
  return scope;
}

export function resolveVariables(template: any, scope: Record<string, any>): any {
  if (typeof template === "string") {
    const fullMatch = template.match(/^\{([\w.]+)\}$/);
    if (fullMatch) {
      const value = getNestedValue(scope, fullMatch[1]);
      if (value !== undefined) {
        return value;
      }
    }
    return template.replace(/\{([\w.]+)\}/g, (match, key) => {
      const value = getNestedValue(scope, key);
      if (value !== undefined) {
        if (typeof value === "object" && value !== null) {
          const jsonStr = JSON.stringify(value);
          if (
            template.includes(`'{${key}}'`) ||
            template.includes(`"{${key}}"`) ||
            template.includes("python") ||
            template.includes("bash") ||
            template.includes("-c")
          ) {
            return jsonStr.replace(/"/g, '\\"');
          }
          return jsonStr;
        }
        return String(value);
      }
      return match;
    });
  }
  if (Array.isArray(template)) {
    return template.map((item) => resolveVariables(item, scope));
  }
  if (typeof template === "object" && template !== null) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(template)) {
      result[key] = resolveVariables(value, scope);
    }
    return result;
  }
  return template;
}

export async function executePipeline(
  steps: PipelineStep[],
  toolParams: Record<string, any>,
  context: PipelineContext,
  onError: "stop" | "continue" = "stop",
  signal?: AbortSignal,
  onProgress?: (step: number, total: number, description: string) => void,
  parametersSchema?: Record<string, any>,
): Promise<any> {
  const scope = buildScopeWithDefaults(toolParams, parametersSchema);
  const stepLogs: Array<{
    step: number;
    tool: string;
    description?: string;
    status: "success" | "failed";
    output?: string;
    error?: string;
  }> = [];
  let lastOutput = "";

  const total = steps.length;
  for (let i = 0; i < total; i++) {
    const step = steps[i];
    const stepNum = i + 1;
    const desc = step.description || `Executing ${step.tool}`;

    onProgress?.(stepNum, total, desc);

    if (signal?.aborted) {
      throw new Error("Pipeline execution aborted");
    }

    // 1. Resolve variables in parameters
    const resolvedParams = resolveVariables(step.params, scope);

    // 2. Find tool
    const sessionAny = context.session as any;
    const tool = sessionAny.allToolsMap?.get(step.tool);
    if (!tool) {
      const errorMsg = `Tool "${step.tool}" not found in session tools map`;
      stepLogs.push({
        step: stepNum,
        tool: step.tool,
        description: step.description,
        status: "failed",
        error: errorMsg,
      });
      if (onError === "stop") {
        return {
          content: [
            { type: "text", text: `Pipeline failed at step ${stepNum} (${desc}): ${errorMsg}` },
          ],
          details: { stepLogs, lastOutput },
          isError: true,
          scope,
        };
      }
      continue;
    }

    // 3. Execute tool
    try {
      const toolCallId = `step_${stepNum}_${Date.now()}`;
      const result = await tool.execute(toolCallId, resolvedParams, signal);

      const rawText =
        result?.content?.[0]?.text ??
        result?.output ??
        result?.text ??
        result?.result ??
        (typeof result === "string"
          ? result
          : typeof result === "object" && result !== null
            ? JSON.stringify(result)
            : String(result ?? ""));
      const textResult = typeof rawText === "string" ? rawText : JSON.stringify(rawText);

      const detailsError =
        result.details?.isError === true ||
        (result.details?.exitCode !== undefined && result.details?.exitCode !== 0) ||
        (result.exitCode !== undefined && result.exitCode !== 0);
      const textErrorPattern =
        typeof textResult === "string" &&
        (textResult.includes("ENOENT:") ||
          textResult.includes("Error:") ||
          textResult.startsWith("Error "));
      const isError = result.isError || detailsError || textErrorPattern;

      if (isError) {
        stepLogs.push({
          step: stepNum,
          tool: step.tool,
          description: step.description,
          status: "failed",
          error: textResult,
        });
        if (onError === "stop") {
          return {
            content: [
              { type: "text", text: `Pipeline failed at step ${stepNum} (${desc}): ${textResult}` },
            ],
            details: { stepLogs, lastOutput },
            isError: true,
            scope,
          };
        }
      } else {
        const exitCode = result.details?.exitCode ?? result.exitCode ?? (isError ? 1 : 0);
        const stepObj = {
          output: textResult,
          exitCode,
          status: isError ? "error" : "success",
          isError,
        };
        lastOutput = textResult;
        scope[`_step_${i}`] = textResult;
        scope[`step${i}`] = textResult;
        scope[String(i)] = textResult;
        scope[`_last`] = textResult;
        scope[`prev`] = textResult;
        scope[`last`] = textResult;
        scope[`result`] = textResult;
        scope[`output`] = textResult;
        if (step.id) {
          scope[step.id] = stepObj;
        }
        if (step.output) {
          scope[step.output] = textResult;
        }
        stepLogs.push({
          step: stepNum,
          tool: step.tool,
          description: step.description,
          status: "success",
          output: textResult,
        });
      }
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      stepLogs.push({
        step: stepNum,
        tool: step.tool,
        description: step.description,
        status: "failed",
        error: errorMsg,
      });
      if (onError === "stop") {
        return {
          content: [
            {
              type: "text",
              text: `Pipeline failed at step ${stepNum} (${desc}) with exception: ${errorMsg}`,
            },
          ],
          details: { stepLogs, lastOutput },
          isError: true,
          scope,
        };
      }
    }
  }

  return {
    content: [{ type: "text", text: lastOutput || "Pipeline completed successfully" }],
    details: { stepLogs, lastOutput },
    isError: false,
    scope,
  };
}
