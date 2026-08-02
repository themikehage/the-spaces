import type { RuleContext } from "../types.js";

export interface RuleResult {
  allowed: boolean;
  reason?: string;
}

export interface Rule {
  readonly id: string;
  readonly description: string;
  evaluate(ctx: RuleContext): RuleResult;
}

export interface IPermissionEngine {
  addRule(rule: Rule): void;
  evaluate(ctx: RuleContext): Promise<RuleResult>;
}
