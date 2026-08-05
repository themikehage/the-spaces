// SPDX-License-Identifier: MIT

export interface RuleContext {
  sessionId?: string;
  toolName: string;
  args?: unknown;
  [key: string]: unknown;
}

export interface RuleEvaluationResult {
  allowed: boolean;
  reason?: string;
}

export interface Rule {
  id: string;
  description?: string;
  evaluate(ctx: RuleContext): RuleEvaluationResult | Promise<RuleEvaluationResult>;
}

export interface IPermissionEngine {
  registerRule(rule: Rule): void;
  unregisterRule(ruleId: string): void;
  evaluate(ctx: RuleContext): Promise<RuleEvaluationResult>;
}
