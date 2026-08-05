import type { RuleContext } from "../types.ts";

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
  registerRule(rule: Rule): void;
  evaluate(ctx: RuleContext): Promise<RuleResult>;
}
