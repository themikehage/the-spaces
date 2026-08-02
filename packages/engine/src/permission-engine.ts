import type { IPermissionEngine, Rule, RuleContext, RuleResult } from "@spaces/core";

export class PermissionEngine implements IPermissionEngine {
  private rules: Rule[] = [];

  addRule(rule: Rule): void {
    this.rules.push(rule);
  }

  async evaluate(ctx: RuleContext): Promise<RuleResult> {
    for (const rule of this.rules) {
      const result = rule.evaluate(ctx);
      if (!result.allowed) {
        return result;
      }
    }
    return { allowed: true };
  }
}
