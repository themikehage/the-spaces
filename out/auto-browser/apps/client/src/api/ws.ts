export type AgentEvent =
  | { type: "agent_start" }
  | { type: "agent_end"; messages: unknown[] }
  | { type: "turn_start" }
  | { type: "turn_end" }
  | { type: "message_start"; message: Message }
  | { type: "message_update"; message: Message; delta: unknown }
  | { type: "message_end"; message: Message }
  | { type: "tool_execution_start"; toolCallId: string; toolName: string; args: unknown }
  | { type: "tool_execution_update"; toolCallId: string; toolName: string; partialResult: unknown }
  | {
      type: "tool_execution_end";
      toolCallId: string;
      toolName: string;
      result: unknown;
      isError: boolean;
    }
  | { type: "agent_error"; error: string }
  | { type: "error"; error: string };

export interface Message {
  role: "user" | "assistant" | "toolResult";
  content: Array<{ type: string; text?: string }>;
  timestamp?: number;
  stopReason?: string;
  errorMessage?: string;
  toolCallId?: string;
  toolName?: string;
  isError?: boolean;
  agentName?: string;
}

export type ConnectionState = "connecting" | "open" | "closed" | "error";

type EventHandler = (event: AgentEvent) => void;
type StateHandler = (state: ConnectionState) => void;

type ClientWsMessage = { type: "prompt"; message: string } | { type: "abort" };

export class WsClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<EventHandler>();
  private stateHandlers = new Set<StateHandler>();
  private sessionId: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private pendingMessages: ClientWsMessage[] = [];
  private state: ConnectionState = "closed";

  getState(): ConnectionState {
    return this.state;
  }

  onStateChange(handler: StateHandler): () => void {
    this.stateHandlers.add(handler);
    handler(this.state);
    return () => this.stateHandlers.delete(handler);
  }

  private setState(newState: ConnectionState): void {
    if (this.state === newState) return;
    this.state = newState;
    for (const h of this.stateHandlers) h(newState);
  }

  connect(sessionId: string): void {
    if (this.sessionId === sessionId && this.ws?.readyState === WebSocket.OPEN) return;

    this.disconnect();
    this.sessionId = sessionId;
    this.reconnectAttempts = 0;
    this.openConnection();
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.sessionId = null;
    this.pendingMessages = [];
    this.setState("closed");
  }

  send(message: ClientWsMessage): void {
    console.log("[wsClient] Sending message:", message, "State:", this.state);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("[wsClient] WS not open. Queueing message until connected.");
      this.pendingMessages.push(message);
    }
  }

  onEvent(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private openConnection(): void {
    const sessionId = this.sessionId;
    if (!sessionId) return;

    this.setState("connecting");

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/ws?sessionId=${sessionId}`;

    console.log(`[wsClient] Connecting to ${url}...`);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log(`[wsClient] WebSocket OPEN for session ${sessionId}`);
      this.setState("open");
      const pending = this.pendingMessages.splice(0);
      for (const msg of pending) {
        if (this.ws?.readyState === WebSocket.OPEN) {
          console.log("[wsClient] Flushing pending message:", msg);
          this.ws.send(JSON.stringify(msg));
        }
      }
    };

    this.ws.onmessage = (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data as string) as AgentEvent;
        for (const handler of this.handlers) handler(event);
      } catch (err) {
        console.error("[wsClient] Failed to parse WebSocket message:", e.data, err);
      }
    };

    this.ws.onclose = (e: CloseEvent) => {
      console.warn("[wsClient] WebSocket closed", { code: e.code, reason: e.reason });
      this.setState("closed");
      if (this.sessionId && this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000);
        this.reconnectTimer = setTimeout(() => {
          this.reconnectAttempts++;
          this.openConnection();
        }, delay);
      }
    };

    this.ws.onerror = (err) => {
      console.error("[wsClient] WebSocket error:", err);
      this.setState("error");
      this.ws?.close();
    };
  }
}

export const wsClient = new WsClient();
