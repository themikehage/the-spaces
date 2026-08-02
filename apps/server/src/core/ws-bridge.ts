// SPDX-License-Identifier: MIT
/**
 * ws-bridge.ts
 * Application-level bridge for session and user event broadcasting.
 */
import { EventBroker } from "../lib/event-broker";

const eventBroker = new EventBroker();

export function broadcastToUser(username: string, data: unknown): void {
  try {
    eventBroker.publishEvent(username, {
      sourceType: "session",
      sourceId: username,
      sourceName: username,
      eventType: "agent_start",
      detail: data,
    });
  } catch (err) {
    console.error("[WS Bridge] broadcastToUser error:", err);
  }
}

export function broadcastToSession(sessionId: string, data: unknown): void {
  try {
    console.log(
      `[WS Bridge] Event broadcasted to session ${sessionId}:`,
      typeof data === "object" && data !== null && "type" in data ? (data as any).type : data,
    );
  } catch (err) {
    console.error("[WS Bridge] broadcastToSession error:", err);
  }
}
