// SPDX-License-Identifier: MIT
import jsonata from "jsonata";
import { BadRequestError } from "../infra/errors";
import { getNestedValue } from "./variable-interpolator";
import type { IConditionEvaluator } from "../ports/condition-evaluator.port";

export class ConditionEvaluationError extends BadRequestError {
  constructor(message: string) {
    super("CONDITION_EVALUATION_ERROR", message);
  }
}

export class JsonataConditionEvaluator implements IConditionEvaluator {
  async evaluate(condition: string, scope: Record<string, unknown>): Promise<boolean | string> {
    const trimmed = condition.trim();
    if (!trimmed) return true;

    const templateMatch = trimmed.match(/^\{\{\s*([\w.$_-]+)\s*\}\}$/);
    if (templateMatch) {
      const value = getNestedValue(scope, templateMatch[1]);
      if (typeof value === "boolean" || typeof value === "string") {
        return value;
      }
      if (value !== undefined && value !== null) {
        return String(value);
      }
      return "";
    }

    try {
      const expression = jsonata(trimmed);
      const bindings: Record<string, unknown> = {
        inputs: scope.$inputs || scope.inputs,
        steps: scope.$steps || scope.steps,
        run: scope.$run || scope.run,
      };
      for (const [k, v] of Object.entries(scope)) {
        const cleanKey = k.startsWith("$") ? k.slice(1) : k;
        bindings[cleanKey] = v;
      }

      const result = await expression.evaluate(scope, bindings);
      if (typeof result === "boolean" || typeof result === "string") {
        return result;
      }
      return Boolean(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ConditionEvaluationError(`Failed to evaluate condition '${trimmed}': ${msg}`);
    }
  }
}

export const conditionEvaluator = new JsonataConditionEvaluator();
