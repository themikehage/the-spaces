import type { IToolRegistry } from "@auto-browser/core";
import { bashTool } from "./bash.tool.ts";
import { readTool } from "./read.tool.ts";
import { writeTool } from "./write.tool.ts";
import { editTool } from "./edit.tool.ts";
import { globTool } from "./glob.tool.ts";
import { grepTool } from "./grep.tool.ts";
import { webfetchTool } from "./webfetch.tool.ts";
import { browserNavigateTool } from "./browser-navigate.tool.ts";

export const ALL_TOOLS = [
  bashTool,
  readTool,
  writeTool,
  editTool,
  globTool,
  grepTool,
  webfetchTool,
  browserNavigateTool,
];

export function registerDefaultTools(registry: IToolRegistry): void {
  for (const tool of ALL_TOOLS) {
    registry.register(tool);
  }
}

export { bashTool, type BashDetails } from "./bash.tool.ts";
export { readTool } from "./read.tool.ts";
export { writeTool } from "./write.tool.ts";
export { editTool } from "./edit.tool.ts";
export { globTool } from "./glob.tool.ts";
export { grepTool } from "./grep.tool.ts";
export { webfetchTool } from "./webfetch.tool.ts";
export { browserNavigateTool, type BrowserNavigateDetails } from "./browser-navigate.tool.ts";
export { LocalSandbox } from "./sandbox/local-sandbox.ts";
