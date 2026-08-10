// SPDX-License-Identifier: MIT
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Handlebars from "handlebars";

// Register standard comparison & logic helpers for Handlebars templates
Handlebars.registerHelper("eq", (a, b) => a === b);
Handlebars.registerHelper("ne", (a, b) => a !== b);
Handlebars.registerHelper("gt", (a, b) => a > b);
Handlebars.registerHelper("gte", (a, b) => a >= b);
Handlebars.registerHelper("lt", (a, b) => a < b);
Handlebars.registerHelper("lte", (a, b) => a <= b);
Handlebars.registerHelper("and", (...args) => args.slice(0, -1).every(Boolean));
Handlebars.registerHelper("or", (...args) => args.slice(0, -1).some(Boolean));
Handlebars.registerHelper("not", (val) => !val);
Handlebars.registerHelper("concat", (...args) => args.slice(0, -1).join(""));
Handlebars.registerHelper("json", (val) => JSON.stringify(val, null, 2));
Handlebars.registerHelper("includes", (arr, item) => {
  if (Array.isArray(arr) || typeof arr === "string") {
    return arr.includes(item);
  }
  return false;
});

export interface UiLoadResult {
  html?: string;
  error?: string;
}

export function loadToolUi(toolDir: string, contextData: Record<string, unknown>): UiLoadResult {
  const uiPath = join(toolDir, "ui", "index.html");
  if (!existsSync(uiPath)) {
    return {};
  }

  try {
    const rawTemplate = readFileSync(uiPath, "utf8");
    const template = Handlebars.compile(rawTemplate);
    const html = template(contextData);
    return { html };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[UiLoader] Failed to render UI for ${toolDir}: ${errorMsg}`);
    return {
      error: `UI template rendering error in ui/index.html: ${errorMsg}`,
    };
  }
}
