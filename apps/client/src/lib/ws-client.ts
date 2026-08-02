// SPDX-License-Identifier: MIT
import type { AgentEvent } from "@spaces/core";

export type WsOutMessage =
  | { type: "prompt"; sessionId: string; message: string }
  | { type: "abort"; sessionId: string }
  | { type: "ping" }
  | Record<string, unknown>;

export type WsInMessage = AgentEvent | { type: string; [key: string]: unknown };

export type ConnectionState =
  "disconnected" | "connecting" | "connected" | "permanently_disconnected";

export type EventHandler = (data: any) => void;
export type StateHandler = (state: ConnectionState) => void;

export class WsClient {
  private static readonly MAX_QUEUE_SIZE = 50;
  private static readonly MAX_RETRIES = 20;
  private ws: WebSocket | null = null;
  private eventHandlers = new Set<EventHandler>();
  private stateHandlers = new Set<StateHandler>();
  private state: ConnectionState = "disconnected";
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private intentionalClose = false;
  private offlineQueue: WsOutMessage[] = [];
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private lastPong = Date.now();
  private activeSessionId: string | null = null;

  constructor(sessionId: string | null = null) {
    this.activeSessionId = sessionId;
  }

  setSessionId(sessionId: string | null): void {
    if (this.activeSessionId === sessionId) return;
    this.activeSessionId = sessionId;
    if (this.state === "connected" || this.state === "connecting") {
      this.reconnect();
    }
  }

  getState(): ConnectionState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === "connected" && this.ws?.readyState === WebSocket.OPEN;
  }

  connect(): void {
    if (this.state !== "disconnected") return;
    this.intentionalClose = false;
    this.doConnect();
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.stopPingTimer();
    this.ws?.close();
    this.ws = null;
    this.offlineQueue = [];
    this.setState("disconnected");
  }

  reconnect(): void {
    this.disconnect();
    this.connect();
  }

  send(data: WsOutMessage): boolean {
    if (this.ws?.readyState === WebSocket.OPEN && this.state === "connected") {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    if (this.offlineQueue.length >= WsClient.MAX_QUEUE_SIZE) {
      this.offlineQueue.shift();
    }
    this.offlineQueue.push(data);
    if (this.state === "disconnected") {
      this.connect();
    }
    return false;
  }

  subscribe(typeOrHandler: string | EventHandler, handler?: EventHandler): () => void {
    let fn: EventHandler;
    if (typeof typeOrHandler === "string") {
      const targetType = typeOrHandler;
      const realHandler = handler!;
      fn = (data: WsInMessage) => {
        if (targetType === "*" || (data && (data as any).type === targetType)) {
          realHandler(data);
        }
      };
    } else {
      fn = typeOrHandler;
    }

    this.eventHandlers.add(fn);
    if (this.state === "disconnected") {
      this.connect();
    }
    return () => {
      this.eventHandlers.delete(fn);
    };
  }

  subscribeAll(handler: EventHandler): () => void {
    return this.subscribe("*", handler);
  }

  onStateChange(handler: StateHandler): () => void {
    this.stateHandlers.add(handler);
    return () => {
      this.stateHandlers.delete(handler);
    };
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.stateHandlers.forEach((h) => h(state));
  }

  private flushOfflineQueue(): void {
    while (
      this.offlineQueue.length > 0 &&
      this.ws?.readyState === WebSocket.OPEN &&
      this.state === "connected"
    ) {
      const data = this.offlineQueue.shift();
      if (data) {
        try {
          this.ws.send(JSON.stringify(data));
        } catch (err) {
          console.error("[WsClient] Failed to flush queued message:", err);
          this.offlineQueue.unshift(data);
          break;
        }
      }
    }
  }

  private startPingTimer(): void {
    this.stopPingTimer();
    this.lastPong = Date.now();
    this.pingInterval = setInterval(() => {
      if (Date.now() - this.lastPong > 45000) {
        console.warn("[WsClient] No response from server in 45s, reconnecting...");
        this.ws?.close();
      }
    }, 15000);
  }

  private stopPingTimer(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private doConnect(): void {
    if (this.state !== "disconnected") return;
    this.setState("connecting");

    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const host = location.host;
    const sessionParam = this.activeSessionId
      ? `?sessionId=${encodeURIComponent(this.activeSessionId)}`
      : "";
    const url = `${protocol}//${host}/ws${sessionParam}`;

    try {
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setState("connected");
        this.startPingTimer();
        this.flushOfflineQueue();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as WsInMessage;
          if (data.type === "ping") {
            this.lastPong = Date.now();
            this.send({ type: "pong" as any });
            return;
          }
          if (data.type === "entity-updated") {
            window.dispatchEvent(
              new CustomEvent("entity-updated", { detail: { type: (data as any).entityType } }),
            );
          }
          this.eventHandlers.forEach((h) => h(data));
        } catch {
          /* noop */
        }
      };

      ws.onclose = () => {
        this.ws = null;
        this.stopPingTimer();
        if (this.intentionalClose) return;
        this.setState("disconnected");
        if (this.reconnectAttempts >= WsClient.MAX_RETRIES) {
          this.setState("permanently_disconnected");
          return;
        }
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000) + Math.random() * 1000;
        this.reconnectAttempts++;
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectTimeout = null;
          this.doConnect();
        }, delay);
      };

      ws.onerror = (err) => {
        console.error("[WsClient] WebSocket error:", err);
        ws.close();
      };
    } catch (err) {
      console.error("[WsClient] Failed to create WebSocket:", err);
      this.setState("disconnected");
    }
  }
}

export const wsClient = new WsClient();
