// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";
import type { IHookRunner } from "../core/ports/hook.port";
import type { IPermissionEngine } from "../core/ports/permission.port";
import type { ITool, ToolContext } from "../core/ports/tool.port";
import { ToolExecutor } from "../core/infra/tool-executor";
import { ToolRegistry } from "../core/infra/tool-registry";

class MockTool implements ITool {
  constructor(
    public name: string,
    public description: string = "Mock Tool Description",
  ) {}

  async execute(toolCallId: string, params: any, ctx?: ToolContext): Promise<any> {
    return { status: "executed", toolCallId, params };
  }
}

describe("ToolExecutor (Core Tool Executor)", () => {
  it("should execute registered tool and return result", async () => {
    const registry = new ToolRegistry([new MockTool("echo", "Echoes input")]);
    const executor = new ToolExecutor(registry);

    const result = await executor.execute({
      toolCallId: "call_1",
      toolName: "echo",
      args: { message: "hello" },
    });

    expect(result.status).toBe("executed");
    expect(result.params).toEqual({ message: "hello" });
  });

  it("should throw an error if tool is not found in registry", async () => {
    const registry = new ToolRegistry();
    const executor = new ToolExecutor(registry);

    expect(
      executor.execute({
        toolCallId: "call_1",
        toolName: "non_existent",
        args: {},
      }),
    ).rejects.toThrow("Tool not found: non_existent");
  });

  it("should block execution when permission engine denies access", async () => {
    const registry = new ToolRegistry([new MockTool("restricted_tool")]);
    const permissionEngine: IPermissionEngine = {
      registerRule: () => {},
      unregisterRule: () => {},
      evaluate: async () => ({
        allowed: false,
        reason: "Access denied by security policy",
      }),
    };

    const executor = new ToolExecutor(registry, undefined, permissionEngine);

    expect(
      executor.execute({
        toolCallId: "call_1",
        toolName: "restricted_tool",
        args: {},
      }),
    ).rejects.toThrow("Tool execution blocked: Access denied by security policy");
  });

  it("should block execution when beforeToolCall hook blocks", async () => {
    const registry = new ToolRegistry([new MockTool("guarded_tool")]);
    const hookRunner: IHookRunner = {
      register: () => {},
      unregister: () => {},
      runBeforeToolCall: async () => ({
        block: true,
        reason: "Blocked by safety hook",
      }),
      runAfterToolCall: async () => undefined,
      runOnError: async () => {},
    };

    const executor = new ToolExecutor(registry, hookRunner);

    expect(
      executor.execute({
        toolCallId: "call_1",
        toolName: "guarded_tool",
        args: {},
      }),
    ).rejects.toThrow("Tool execution blocked by hook: Blocked by safety hook");
  });

  it("should modify output when afterToolCall hook replaces content", async () => {
    const registry = new ToolRegistry([new MockTool("transform_tool")]);
    const hookRunner: IHookRunner = {
      register: () => {},
      unregister: () => {},
      runBeforeToolCall: async () => undefined,
      runAfterToolCall: async () => ({
        content: [{ type: "text", text: "Transformed result" }] as unknown[],
      }),
      runOnError: async () => {},
    };

    const executor = new ToolExecutor(registry, hookRunner);

    const result = await executor.execute({
      toolCallId: "call_1",
      toolName: "transform_tool",
      args: {},
    });

    expect(result).toEqual([{ type: "text", text: "Transformed result" }]);
  });
});
