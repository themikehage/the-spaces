// SPDX-License-Identifier: MIT
import * as vm from "node:vm";
import { BadRequestError } from "../infra/errors";
import { getNestedValue } from "./variable-interpolator";
import type { IConditionEvaluator } from "../ports/condition-evaluator.port";

export class ConditionEvaluationError extends BadRequestError {
  constructor(message: string) {
    super("CONDITION_EVALUATION_ERROR", message);
  }
}

export class VmConditionEvaluator implements IConditionEvaluator {
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
      const sandbox: Record<string, unknown> = {};

      const registerAlias = (target: Record<string, unknown>, key: string, val: unknown) => {
        if (!target || typeof target !== "object") return;
        target[key] = val;
        const raw = key.startsWith("$") ? key.slice(1) : key;
        target[raw] = val;
        target[`$${raw}`] = val;
        if (raw.includes("-")) {
          const snake = raw.replace(/-/g, "_");
          target[snake] = val;
          target[`$${snake}`] = val;
          const camel = raw.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          target[camel] = val;
          target[`$${camel}`] = val;
          const prefix = raw.split("-")[0];
          if (prefix && !(prefix in target)) target[prefix] = val;
          if (prefix && !(`$${prefix}` in target)) target[`$${prefix}`] = val;
        }
      };

      for (const [k, v] of Object.entries(scope)) {
        registerAlias(sandbox, k, v);
      }

      const vmContext = vm.createContext(sandbox);
      const result = vm.runInContext(trimmed, vmContext, { timeout: 1000 });

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

export const conditionEvaluator = new VmConditionEvaluator();
