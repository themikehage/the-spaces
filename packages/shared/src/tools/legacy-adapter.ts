// SPDX-License-Identifier: MIT
import { type BaseTool } from "./base-tool";
import { FunctionTool } from "./function-tool";

export function legacyToolToBaseTool(obj: any): BaseTool {
  if (obj && typeof obj === "object" && typeof obj.execute === "function" && "declaration" in obj) {
    return obj as BaseTool;
  }

  const name = obj.name || "unnamed_tool";
  const description = obj.description || "";
  const schema = obj.schema || obj.parameters;
  const executeFn = obj.execute;

  return new FunctionTool({
    name,
    description,
    schema,
    execute: async (args: any, signal?: AbortSignal) => {
      if (typeof executeFn === "function") {
        if (executeFn.length >= 2) {
          return await executeFn("call_legacy", args, signal);
        }
        return await executeFn(args, signal);
      }
      return "";
    },
  });
}
