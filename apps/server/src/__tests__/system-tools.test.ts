// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BashTool,
  createBashTool,
  createEditTool,
  createFindTool,
  createGrepTool,
  createLsTool,
  createReadTool,
  createWriteTool,
  EditTool,
  FindTool,
  GrepTool,
  LsTool,
  ReadTool,
  WriteTool,
} from "../core/tools";
import { ToolExecutor } from "../core/infra/tool-executor";
import { ToolRegistry } from "../core/infra/tool-registry";

describe("Modular System Tools (ITool)", () => {
  it("should implement ITool contract properties and parameters", () => {
    const cwd = process.cwd();

    const read = createReadTool(cwd);
    expect(read.name).toBe("read");
    expect(read.description).toBeTruthy();
    expect(read.parameters).toBeDefined();

    const write = createWriteTool(cwd);
    expect(write.name).toBe("write");
    expect(write.description).toBeTruthy();
    expect(write.parameters).toBeDefined();

    const edit = createEditTool(cwd);
    expect(edit.name).toBe("edit");
    expect(edit.description).toBeTruthy();
    expect(edit.parameters).toBeDefined();

    const grep = createGrepTool(cwd);
    expect(grep.name).toBe("grep");
    expect(grep.description).toBeTruthy();
    expect(grep.parameters).toBeDefined();

    const find = createFindTool(cwd);
    expect(find.name).toBe("find");
    expect(find.description).toBeTruthy();
    expect(find.parameters).toBeDefined();

    const ls = createLsTool(cwd);
    expect(ls.name).toBe("ls");
    expect(ls.description).toBeTruthy();
    expect(ls.parameters).toBeDefined();

    const bash = createBashTool(cwd);
    expect(bash.name).toBe("bash");
    expect(bash.description).toBeTruthy();
    expect(bash.parameters).toBeDefined();
  });

  it("should execute read, write, edit, ls, grep, find through ToolExecutor in a temp directory", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "spaces-itool-test-"));
    try {
      const readTool = new ReadTool(tempDir);
      const writeTool = new WriteTool(tempDir);
      const editTool = new EditTool(tempDir);
      const lsTool = new LsTool(tempDir);
      const grepTool = new GrepTool(tempDir);
      const findTool = new FindTool(tempDir);

      const registry = new ToolRegistry([
        readTool,
        writeTool,
        editTool,
        lsTool,
        grepTool,
        findTool,
      ]);
      const executor = new ToolExecutor(registry);

      // 1. Write file
      const writeRes = await executor.execute({
        toolCallId: "call_w1",
        toolName: "write",
        args: { path: "test.txt", content: "Hello World\nLine 2\nLine 3" },
      });
      expect(writeRes.content[0].text).toContain("Successfully wrote");

      // 2. Read file
      const readRes = await executor.execute({
        toolCallId: "call_r1",
        toolName: "read",
        args: { path: "test.txt" },
      });
      expect(readRes.content[0].text).toBe("Hello World\nLine 2\nLine 3");

      // 3. Edit file
      const editRes = await executor.execute({
        toolCallId: "call_e1",
        toolName: "edit",
        args: {
          path: "test.txt",
          edits: [{ oldText: "Line 2", newText: "Line Two Replaced" }],
        },
      });
      expect(editRes.content[0].text).toContain("Successfully replaced 1 block");

      // Verify read after edit
      const readRes2 = await executor.execute({
        toolCallId: "call_r2",
        toolName: "read",
        args: { path: "test.txt" },
      });
      expect(readRes2.content[0].text).toBe("Hello World\nLine Two Replaced\nLine 3");

      // 4. Ls directory
      const lsRes = await executor.execute({
        toolCallId: "call_l1",
        toolName: "ls",
        args: { path: "." },
      });
      expect(lsRes.content[0].text).toContain("test.txt");

      // 5. Grep pattern
      const grepRes = await executor.execute({
        toolCallId: "call_g1",
        toolName: "grep",
        args: { pattern: "Replaced" },
      });
      expect(grepRes.content[0].text).toContain("Line Two Replaced");

      // 6. Find glob pattern
      const findRes = await executor.execute({
        toolCallId: "call_f1",
        toolName: "find",
        args: { pattern: "*.txt" },
      });
      expect(findRes.content[0].text).toContain("test.txt");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("should execute bash commands and handle abort signal", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "spaces-bash-test-"));
    try {
      const bashTool = new BashTool(tempDir);
      const registry = new ToolRegistry([bashTool]);
      const executor = new ToolExecutor(registry);

      const echoRes = await executor.execute({
        toolCallId: "call_b1",
        toolName: "bash",
        args: { command: "echo hello_bash" },
      });
      expect(echoRes.output).toContain("hello_bash");

      // Test abort signal
      const controller = new AbortController();
      controller.abort();

      const abortedRes = await executor.execute(
        {
          toolCallId: "call_b2",
          toolName: "bash",
          args: { command: "echo should_cancel" },
        },
        { toolCallId: "call_b2", signal: controller.signal },
      );

      expect(abortedRes.cancelled).toBe(true);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("toLLMFormat should return OpenAI compatible tool schemas", () => {
    const cwd = process.cwd();
    const registry = new ToolRegistry([
      createReadTool(cwd),
      createWriteTool(cwd),
      createEditTool(cwd),
      createBashTool(cwd),
    ]);

    const schemas = registry.toLLMFormat();
    expect(schemas.length).toBe(4);
    expect(schemas.map((s) => s.name)).toEqual(["read", "write", "edit", "bash"]);
    expect(schemas[0].parameters?.type).toBe("object");
  });
});
