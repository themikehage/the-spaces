import type { ServerWebSocket } from "bun";
import type { AppContext } from "../context.ts";
import { ClientWsMessageSchema } from "@auto-browser/core";
import { createAgent, ToolExecutor } from "@auto-browser/engine";
import { registerStreamPort } from "./stream-proxy.ts";

export interface WsData {
  sessionId: string;
  ctx: AppContext;
  unsubscribe?: () => void;
}

const initializingAgents = new Map<string, Promise<void>>();

export const wsHandler = {
  async open(ws: ServerWebSocket<WsData>) {
    const { sessionId, ctx } = ws.data;
    console.log(`[ws/handler] Connection opened for session: "${sessionId}"`);

    let agent = ctx.agents.get(sessionId);

    if (!agent) {
      console.log(`[ws/handler] Agent for session "${sessionId}" not in memory. Initializing...`);
      let initPromise = initializingAgents.get(sessionId);

      if (!initPromise) {
        initPromise = (async () => {
          const session = await ctx.sessionStore
            .listSessions()
            .then((s) => s.find((s) => s.id === sessionId));

          if (!session) {
            console.warn(`[ws/handler] Session "${sessionId}" not found in sessionStore.`);
            ws.send(JSON.stringify({ type: "error", error: `Session "${sessionId}" not found` }));
            ws.close();
            return;
          }

          const newAgent = await createAgent({
            id: sessionId,
            modelProvider: ctx.modelProvider,
            sessionStore: ctx.sessionStore,
            toolExecutor: new ToolExecutor(ctx.toolRegistry),
            systemPrompt: ctx.config.SYSTEM_PROMPT,
          });
          ctx.agents.set(sessionId, newAgent);
          console.log(`[ws/handler] Agent for session "${sessionId}" created successfully.`);
        })();

        initializingAgents.set(sessionId, initPromise);
      }

      try {
        await initPromise;
      } finally {
        initializingAgents.delete(sessionId);
      }

      agent = ctx.agents.get(sessionId);
      if (!agent) return;
    }

    const unsubscribe = agent.events.onAny((event: any) => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify(event));
      }

      if (
        event.type === "tool_execution_end" &&
        event.toolCall?.name === "browser_navigate" &&
        event.result?.details?.streamPort
      ) {
        const port = event.result.details.streamPort as number;
        console.log(
          `[ws/handler] Registering browser stream port ${port} for session "${sessionId}"`,
        );
        registerStreamPort(sessionId, port);
      }
    });

    ws.data.unsubscribe = unsubscribe;
  },

  async message(ws: ServerWebSocket<WsData>, raw: string | Buffer) {
    const { sessionId, ctx } = ws.data;

    const pendingInit = initializingAgents.get(sessionId);
    if (pendingInit) {
      await pendingInit;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(typeof raw === "string" ? raw : raw.toString("utf-8"));
    } catch (err) {
      console.error("[ws/handler] Invalid JSON payload received:", raw);
      ws.send(JSON.stringify({ type: "error", error: "Invalid JSON" }));
      return;
    }

    const result = ClientWsMessageSchema.safeParse(parsed);
    if (!result.success) {
      console.error("[ws/handler] Invalid message schema:", result.error.issues);
      ws.send(JSON.stringify({ type: "error", error: "Invalid message schema" }));
      return;
    }

    const msg = result.data;
    const agent = ctx.agents.get(sessionId);
    if (!agent) {
      console.error(`[ws/handler] Agent for session "${sessionId}" not found`);
      ws.send(JSON.stringify({ type: "error", error: "Agent not found" }));
      return;
    }

    if (msg.type === "prompt") {
      console.log(
        `[ws/handler] Received prompt for session "${sessionId}": "${msg.message.slice(0, 80)}"`,
      );
      agent.prompt(msg.message).catch((err) => {
        console.error(`[ws/handler] Error processing prompt for session "${sessionId}":`, err);
        if (ws.readyState === 1) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          ws.send(JSON.stringify({ type: "error", error: errorMessage }));
        }
      });
    } else if (msg.type === "abort") {
      console.log(`[ws/handler] Received abort signal for session "${sessionId}"`);
      await agent.abort().catch((err) => {
        console.error(`[ws/handler] Error aborting agent for session "${sessionId}":`, err);
      });
    }
  },

  close(ws: ServerWebSocket<WsData>) {
    console.log(`[ws/handler] Connection closed for session: "${ws.data.sessionId}"`);
    ws.data.unsubscribe?.();
  },
};
