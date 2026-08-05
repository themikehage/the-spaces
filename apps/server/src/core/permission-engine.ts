// SPDX-License-Identifier: MIT
import type {
  IPermissionEngine,
  Rule,
  RuleContext,
  RuleEvaluationResult,
} from "./ports/permission.port";

export class PermissionEngine implements IPermissionEngine {
  private rules: Rule[] = [];

  registerRule(rule: Rule): void {
    this.rules = this.rules.filter((r) => r.id !== rule.id);
    this.rules.push(rule);
  }

  unregisterRule(ruleId: string): void {
    this.rules = this.rules.filter((r) => r.id !== ruleId);
  }

  async evaluate(ctx: RuleContext): Promise<RuleEvaluationResult> {
    for (const rule of this.rules) {
      const result = await rule.evaluate(ctx);
      if (!result.allowed) {
        return result;
      }
    }
    return { allowed: true };
  }
}
