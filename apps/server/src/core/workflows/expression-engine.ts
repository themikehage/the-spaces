// SPDX-License-Identifier: MIT
import { BadRequestError } from "../infra/errors";
import { getNestedValue } from "./variable-interpolator";

export interface ExpressionContext {
  $inputs: Record<string, unknown>;
  $steps: Record<
    string,
    {
      status: string;
      outputs?: Record<string, unknown>;
      error?: string;
      agentSessionId?: string;
    }
  >;
  $run: {
    id: string;
    workflowId: string;
    workflowName: string;
    status: string;
  };
  [key: string]: unknown;
}

export class ExpressionResolutionError extends BadRequestError {
  constructor(message: string) {
    super("EXPRESSION_RESOLUTION_ERROR", message);
  }
}

export function resolveExpression(expr: string, context: ExpressionContext): unknown {
  const trimmed = expr.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith("{{") && trimmed.endsWith("}}")) {
    const innerPath = trimmed.slice(2, -2).trim();
    return getNestedValue(context as Record<string, unknown>, innerPath);
  }

  return getNestedValue(context as Record<string, unknown>, trimmed);
}
