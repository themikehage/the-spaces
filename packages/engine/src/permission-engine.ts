// SPDX-License-Identifier: MIT
import type { IPermissionEngine, Rule, RuleContext, RuleResult } from "@spaces/core";
import { isAbsolute, resolve, sep } from "node:path";

export interface PermissionRule {
  tool: string;
  pattern?: RegExp;
  allow: boolean | "ask";
  reason: string;
}

export const DENY_RULES: PermissionRule[] = [
  {
    tool: "bash",
    pattern: /\brm\s+-[rRfF]{1,4}\s+(\/(?!tmp|workspace)[a-zA-Z0-9_\-*]+)/,
    allow: false,
    reason: "Recursive deletion of critical system directories is blocked.",
  },
  {
    tool: "bash",
    pattern: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/,
    allow: false,
    reason: "Fork bomb patterns are blocked.",
  },
  {
    tool: "read",
    pattern: /(\bssh\b|\.ssh\b|\bpasswd\b|\bshadow\b|\bcredentials\b|\bsecrets\b)/i,
    allow: false,
    reason: "Access to system credentials or sensitive keys is blocked.",
  },
  {
    tool: "bash",
    pattern: /(cat|less|more|grep|find)\s+.*(\.ssh\/|passwd|shadow)/i,
    allow: false,
    reason: "Inspecting system credential files is blocked.",
  },
  {
    tool: "bash",
    pattern: /\b(curl|wget)\b[^|]*\|\s*(ba)?sh\b/,
    allow: false,
    reason: "Piping remote network scripts directly into a shell execution is blocked.",
  },
  {
    tool: "bash",
    pattern: /\b(mkfs|dd\b.*\/dev\/(sd|nvme|vd))/,
    allow: false,
    reason: "Disk formatting or direct writing to raw devices is blocked.",
  },
];

export const ASK_RULES: PermissionRule[] = [
  {
    tool: "bash",
    pattern: /\brm\s+-[rRfF]{1,4}/,
    allow: "ask",
    reason: "Recursive directory deletion requires explicit user confirmation.",
  },
  {
    tool: "bash",
    pattern: /\b(chmod|chown)\b.*-R/,
    allow: "ask",
    reason: "Recursive permission or ownership modification requires confirmation.",
  },
];

export class PermissionEngine implements IPermissionEngine {
  private rules: Rule[] = [];

  addRule(rule: Rule): void {
    this.rules.push(rule);
  }

  isSubpath(parent: string, child: string): boolean {
    try {
      const parentResolved = resolve(parent);
      const parentNormalized =
        parentResolved.toLowerCase() + (parentResolved.endsWith(sep) ? "" : sep);
      const resolvedChild = isAbsolute(child) ? resolve(child) : resolve(parentResolved, child);
      const childNormalized =
        resolvedChild.toLowerCase() + (resolvedChild.endsWith(sep) ? "" : sep);
      return childNormalized.startsWith(parentNormalized);
    } catch {
      return false;
    }
  }

  async evaluate(
    ctxOrTool: RuleContext | string,
    args?: Record<string, unknown>,
    opts?: Record<string, unknown>,
  ): Promise<RuleResult> {
    let toolName = "";
    let argString = "";

    if (typeof ctxOrTool === "string") {
      toolName = ctxOrTool;
      argString = typeof args === "string" ? args : JSON.stringify(args ?? "");
    } else {
      toolName = ctxOrTool.toolCall?.name ?? "";
      argString =
        typeof ctxOrTool.toolCall?.arguments === "string"
          ? ctxOrTool.toolCall.arguments
          : JSON.stringify(ctxOrTool.toolCall?.arguments ?? "");
    }

    for (const rule of DENY_RULES) {
      if (rule.tool === "*" || rule.tool === toolName) {
        if (rule.pattern && rule.pattern.test(argString)) {
          return { allowed: false, reason: rule.reason };
        }
      }
    }

    if (typeof ctxOrTool !== "string") {
      for (const rule of this.rules) {
        const result = rule.evaluate(ctxOrTool);
        if (!result.allowed) {
          return result;
        }
      }
    }

    return { allowed: true };
  }
}
