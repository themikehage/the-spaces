// SPDX-License-Identifier: MIT
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type AgentDefinition, getAgentDir } from "shared";
import { mcpRegistry } from "../core/mcp-registry";
import { memoryRegistry } from "../core/memory/registry";
import type { AgentServer } from "./types";

function ensureAgentWorkspace(username: string, id: string): string {
  const dir = getAgentDir(username, id);
  const subdirs = [join(dir, "sessions"), join(dir, "workspace")];
  for (const d of subdirs) {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  }
  // Crear workspace del agente
  return dir;
}

export async function createAgentServer(
  definition: AgentDefinition,
  username: string,
): Promise<AgentServer> {
  const { createAgentRuntime } = await import("../core/session/agent-runtime");
  const { DEFAULT_ALWAYS_ON_TOOLS } = await import("../core/session/tool-groups");

  const runtime = await createAgentRuntime({
    username,
    sessionId: `agent_server_${definition.id}`,
    agentId: definition.id,
    agentDef: definition,
    toolProfile: "agent-server",
  });

  const session = runtime.session;
  const memory = await memoryRegistry.get(
    `agent:${definition.id}`,
    runtime.context.memoryDbPath,
    runtime.context.memoryEnabled,
  );

  const activeToolNames = [
    ...DEFAULT_ALWAYS_ON_TOOLS,
    "read",
    "write",
    "edit",
    "bash",
    "grep",
    "find",
    "ls",
  ];
  if (runtime.context.memoryEnabled) {
    activeToolNames.push("memory_store", "memory_recall", "memory_forget");
  }
  if (runtime.context.projectName) {
    activeToolNames.push("manage_preview");
  }
  session.setActiveToolsByName(activeToolNames);

  (async () => {
    try {
      const mcpTools = await mcpRegistry.getSessionMcpTools(username, definition.id);
      if (mcpTools.length > 0) {
        if (session._customTools) {
          session._customTools.push(...mcpTools);
          session._refreshToolRegistry();
        }
        console.log(`[AgentServer:${definition.id}] Loaded ${mcpTools.length} MCP tools`);
      }
    } catch (err) {
      console.error(`[AgentServer:${definition.id}] Failed to load MCP tools:`, err);
    }
  })();

  const originalPrompt = session.prompt.bind(session);
  session.prompt = async (message: string) => {
    const memCtx = await memory.buildContext(message);
    if (memCtx) session.injectMemoryContext(memCtx);
    return originalPrompt(message);
  };

  const app = new Hono();
  let activeObservers = 0;

  app.get("/health", (c) =>
    c.json({
      id: definition.id,
      name: definition.name,
      role: definition.role,
      streaming: session.isStreaming,
      activeObservers,
    }),
  );

  app.get("/messages", (c) => {
    return c.json({ messages: session.messages });
  });

  app.get("/observe", async (c) => {
    activeObservers++;
    return streamSSE(c, async (sse) => {
      const unsub = session.subscribe((event) => {
        sse.writeSSE({ data: JSON.stringify(event), event: event.type }).catch(() => {});
      });
      c.req.raw.signal.addEventListener("abort", () => {
        activeObservers = Math.max(0, activeObservers - 1);
        unsub();
      });
      while (!c.req.raw.signal.aborted) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    });
  });

  app.get("/executions", (c) => {
    const execsDir = join(agentDir, "executions");
    if (!existsSync(execsDir)) return c.json({ executions: [] });

    const folders = readdirSync(execsDir);
    const executions: any[] = [];
    for (const f of folders) {
      try {
        const summaryPath = join(execsDir, f, "summary.json");
        if (existsSync(summaryPath)) {
          executions.push(JSON.parse(readFileSync(summaryPath, "utf-8")));
        }
      } catch {}
    }
    executions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ executions });
  });

  app.get("/executions/:execId", (c) => {
    const execId = c.req.param("execId");
    const execDir = join(agentDir, "executions", execId);
    if (!existsSync(execDir)) return c.json({ error: "Execution not found" }, 404);

    try {
      const prompt = JSON.parse(readFileSync(join(execDir, "prompt.json"), "utf-8")).prompt;

      let messages: any[] = [];
      const msgFile = join(execDir, "messages.jsonl");
      if (existsSync(msgFile)) {
        messages = readFileSync(msgFile, "utf-8")
          .split("\n")
          .filter(Boolean)
          .map((line) => JSON.parse(line));
      }

      const toolCalls = existsSync(join(execDir, "tool-calls.json"))
        ? JSON.parse(readFileSync(join(execDir, "tool-calls.json"), "utf-8"))
        : [];

      const errors = existsSync(join(execDir, "errors.json"))
        ? JSON.parse(readFileSync(join(execDir, "errors.json"), "utf-8"))
        : [];

      const summary = existsSync(join(execDir, "summary.json"))
        ? JSON.parse(readFileSync(join(execDir, "summary.json"), "utf-8"))
        : {};

      return c.json({
        id: execId,
        prompt,
        messages,
        toolCalls,
        errors,
        ...summary,
      });
    } catch (e) {
      return c.json({ error: String(e) }, 500);
    }
  });

  app.post("/prompt", async (c) => {
    const body = await c.req.json<{ message: string; stream?: boolean }>();
    const { message, stream = true } = body;

    if (!message || typeof message !== "string") {
      return c.json({ error: "message is required" }, 400);
    }

    const execId = crypto.randomUUID();
    const execsDir = join(agentDir, "executions");
    if (!existsSync(execsDir)) mkdirSync(execsDir, { recursive: true });

    const execDir = join(execsDir, execId);
    mkdirSync(execDir, { recursive: true });

    writeFileSync(
      join(execDir, "prompt.json"),
      JSON.stringify({ prompt: message, createdAt: new Date().toISOString() }, null, 2),
    );

    const toolCalls: any[] = [];
    const errors: string[] = [];
    const startTime = Date.now();

    const unsubLog = session.subscribe((event: any) => {
      if (event.type === "tool_execution_start") {
        toolCalls.push({
          id: event.toolCall.id,
          name: event.toolCall.name,
          args: event.toolCall.arguments,
          startedAt: new Date().toISOString(),
        });
      } else if (event.type === "tool_execution_end") {
        const tc = toolCalls.find((t) => t.id === event.toolCall.id);
        if (tc) {
          tc.result = event.result;
          tc.isError = event.isError;
          tc.endedAt = new Date().toISOString();
        }
      } else if (event.type === "agent_error") {
        errors.push(event.error || "Unknown agent error");
      }
    });

    const finalize = () => {
      unsubLog();
      const durationMs = Date.now() - startTime;
      try {
        const msgs = session.messages;
        writeFileSync(
          join(execDir, "messages.jsonl"),
          msgs.map((m) => JSON.stringify(m)).join("\n"),
        );
        writeFileSync(join(execDir, "tool-calls.json"), JSON.stringify(toolCalls, null, 2));
        writeFileSync(join(execDir, "errors.json"), JSON.stringify(errors, null, 2));
        writeFileSync(
          join(execDir, "summary.json"),
          JSON.stringify(
            {
              id: execId,
              prompt: message,
              durationMs,
              errors,
              createdAt: new Date().toISOString(),
            },
            null,
            2,
          ),
        );
      } catch (e) {
        console.error(`[AgentServer:${definition.id}] Failed to save execution log:`, e);
      }
    };

    if (!stream) {
      try {
        await session.prompt(message);
        const msgs = session.messages;
        return c.json({ messages: msgs });
      } catch (err) {
        errors.push(String(err));
        return c.json({ error: String(err) }, 500);
      } finally {
        finalize();
      }
    }

    return streamSSE(c, async (sse) => {
      const unsub = session.subscribe((event) => {
        sse.writeSSE({ data: JSON.stringify(event), event: event.type }).catch(() => {});
      });

      try {
        await session.prompt(message);
      } catch (err) {
        errors.push(String(err));
        await sse.writeSSE({
          data: JSON.stringify({ type: "agent_error", error: String(err) }),
          event: "agent_error",
        });
      } finally {
        unsub();
        finalize();
        await sse.writeSSE({ data: "{}", event: "done" });
      }
    });
  });

  app.post("/abort", async (c) => {
    if (session.isStreaming) {
      await session.abort();
    }
    return c.json({ aborted: true });
  });

  let bunServer: ReturnType<typeof Bun.serve> | null = null;

  const agentServer: AgentServer = {
    definition,
    session,
    app,
    memory,
    getActiveObservers() {
      return activeObservers;
    },
    async start() {
      if (!definition.port) throw new Error("No port defined for standalone start");
      bunServer = Bun.serve({
        port: definition.port,
        fetch: app.fetch,
      });
      console.log(`Agent [${definition.id}] running on port ${definition.port}`);
    },
    async stop() {
      if (session.isStreaming) await session.abort();
      await session.dispose();
      await memory.shutdown();
      if (bunServer) {
        bunServer.stop(true);
        bunServer = null;
      }
    },
  };

  return agentServer;
}
