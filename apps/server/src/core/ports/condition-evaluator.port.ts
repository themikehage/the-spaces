// SPDX-License-Identifier: MIT

export interface IConditionEvaluator {
  evaluate(condition: string, scope: Record<string, unknown>): Promise<boolean | string>;
}
