import type { IToolRegistry } from "@spaces/core";
import { bashTool } from "./bash.tool.js";
import { editTool } from "./edit.tool.js";
import { globTool } from "./glob.tool.js";
import { grepTool } from "./grep.tool.js";
import { readTool } from "./read.tool.js";
import { DefaultToolRegistry } from "./tool-registry.js";
import { webfetchTool } from "./webfetch.tool.js";
import { writeTool } from "./write.tool.js";

export * from "./bash.tool.js";
export * from "./custom/index.js";
export * from "./edit.tool.js";

export * from "./glob.tool.js";
export * from "./grep.tool.js";
export * from "./mcp/index.js";
export * from "./path-safety.js";
export * from "./read.tool.js";
export * from "./tool-registry.js";
export * from "./webfetch.tool.js";
export * from "./write.tool.js";

export function createDefaultToolRegistry(): IToolRegistry {
  const registry = new DefaultToolRegistry();
  registry.register(bashTool);
  registry.register(readTool);
  registry.register(writeTool);
  registry.register(editTool);
  registry.register(globTool);
  registry.register(grepTool);
  registry.register(webfetchTool);
  return registry;
}
