// SPDX-License-Identifier: MIT
import type { AgentEvent, IEventBus } from "@spaces/core";
import type { Hono } from "hono";
import type { createBunWebSocket } from "hono/bun";
import type { AppContext } from "../../context";

const AGENT_EVENT_TYPES: Array<AgentEvent["type"]> = [
  "agent_start",
  "agent_end",
  "message_start",
  "message_update",
  "message_end",
  "tool_execution_start",
  "tool_execution_end",
  "agent_error",
];

function subscribeAllEvents(
  events: IEventBus<AgentEvent>,
  ws: { send(data: string): void },
): () => void {
  const unsubs = AGENT_EVENT_TYPES.map((type) =>
    events.on(type, (event) => {
      try {
        ws.send(JSON.stringify(event));
      } catch (err) {
        console.error("[Engine WS] Failed to send event:", err);
      }
    }),
  );
  return () => unsubs.forEach((unsub) => unsub());
}

export function registerEngineWsRoute(
  app: Hono<any>,
  appContext: AppContext,
  upgradeWebSocket: ReturnType<typeof createBunWebSocket>["upgradeWebSocket"],
): void {
  app.get(
    "/ws",
    upgradeWebSocket((c) => {
      let unsub: (() => void) | null = null;
      let currentSessionId: string | null = null;

      return {
        onOpen(_evt, ws) {
          try {
            const url = new URL(c.req.url, "http://localhost");
            const sessionId = url.searchParams.get("sessionId");
            if (sessionId) {
              currentSessionId = sessionId;
              const agent = appContext.createSessionAgent(sessionId);
              unsub = subscribeAllEvents(agent.events, ws);
            }
          } catch (err) {
            console.error("[Engine WS] Error in onOpen:", err);
          }
        },
        async onMessage(evt, ws) {
          try {
            const rawData =
              typeof evt.data === "string"
                ? evt.data
                : new TextDecoder().decode(evt.data as ArrayBuffer);
            const msg = JSON.parse(rawData);

            if (msg.type === "ping") {
              ws.send(JSON.stringify({ type: "pong" }));
              return;
            }

            const targetSessionId = msg.sessionId || currentSessionId;
            if (!targetSessionId) {
              ws.send(JSON.stringify({ type: "agent_error", error: "Missing sessionId" }));
              return;
            }

            const agent = appContext.createSessionAgent(targetSessionId);

            if (!unsub) {
              unsub = subscribeAllEvents(agent.events, ws);
            }

            if (msg.type === "prompt" && typeof msg.message === "string") {
              await agent.prompt(msg.message);
            } else if (msg.type === "abort") {
              await agent.abort();
            }
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            ws.send(JSON.stringify({ type: "agent_error", error: errorMsg }));
          }
        },
        onClose() {
          if (unsub) {
            unsub();
            unsub = null;
          }
        },
      };
    }),
  );
}
