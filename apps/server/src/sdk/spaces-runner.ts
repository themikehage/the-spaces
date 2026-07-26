// SPDX-License-Identifier: MIT
import type { AgentRuntimeInstance } from "../core/session/agent-runtime";
import { SpacesAgent } from "./spaces-agent";
import type { RunResult, StreamEvent } from "./types";

export interface RunnerOptions {
  username?: string;
  sessionId?: string;
}

export class SpacesRunner {
  private agent: SpacesAgent;
  private username: string;
  readonly sessionId: string;
  private _runtime?: AgentRuntimeInstance;

  constructor(agent: SpacesAgent, options?: RunnerOptions) {
    this.agent = agent;
    this.username = options?.username ?? "default";
    this.sessionId = options?.sessionId ?? crypto.randomUUID();
  }

  async getRuntime(): Promise<AgentRuntimeInstance> {
    if (!this._runtime) {
      this._runtime = await this.agent.createRuntime(this.username, this.sessionId);
    }
    return this._runtime;
  }

  async run(input: string): Promise<RunResult> {
    const runtime = await this.getRuntime();
    const session = runtime.session;

    let fullText = "";
    const toolCallsMap = new Map<string, { id: string; name: string; arguments?: any; result?: any }>();

    const unsubscribe = session.subscribe((evt: any) => {
      if (evt.type === "message_update") {
        if (evt.assistantMessageEvent?.type === "text_delta" && evt.assistantMessageEvent.delta) {
          fullText += evt.assistantMessageEvent.delta;
        }
      } else if (evt.type === "tool_execution_start") {
        toolCallsMap.set(evt.toolCallId, {
          id: evt.toolCallId,
          name: evt.toolName,
          arguments: evt.args,
        });
      } else if (evt.type === "tool_execution_end") {
        const existing = toolCallsMap.get(evt.toolCallId);
        if (existing) {
          existing.result = evt.result;
        } else {
          toolCallsMap.set(evt.toolCallId, {
            id: evt.toolCallId,
            name: evt.toolName,
            result: evt.result,
          });
        }
      }
    });

    try {
      await session.prompt(input);
    } finally {
      unsubscribe();
    }

    const messages = session.messages || [];
    // If fullText is empty from deltas, extract last assistant message text
    if (!fullText && messages.length > 0) {
      const lastAssistant = [...messages].reverse().find((m: any) => m.role === "assistant");
      if (lastAssistant) {
        if (typeof lastAssistant.content === "string") {
          fullText = lastAssistant.content;
        } else if (Array.isArray(lastAssistant.content)) {
          fullText = lastAssistant.content
            .filter((c: any) => c.type === "text")
            .map((c: any) => c.text)
            .join("\n");
        }
      }
    }

    return {
      text: fullText,
      toolCalls: Array.from(toolCallsMap.values()),
      sessionId: this.sessionId,
      messages,
    };
  }

  async *stream(input: string): AsyncGenerator<StreamEvent> {
    const runtime = await this.getRuntime();
    const session = runtime.session;

    const queue: StreamEvent[] = [];
    let resolveNext: (() => void) | null = null;
    let isDone = false;

    const pushEvent = (event: StreamEvent) => {
      queue.push(event);
      if (resolveNext) {
        const notify = resolveNext;
        resolveNext = null;
        notify();
      }
    };

    const unsubscribe = session.subscribe((evt: any) => {
      if (evt.type === "message_update") {
        if (evt.assistantMessageEvent?.type === "text_delta" && evt.assistantMessageEvent.delta) {
          pushEvent({
            type: "text_delta",
            content: evt.assistantMessageEvent.delta,
          });
        }
      } else if (evt.type === "tool_execution_start") {
        pushEvent({
          type: "tool_execution_start",
          toolCall: {
            id: evt.toolCallId,
            name: evt.toolName,
            arguments: evt.args,
          },
        });
      } else if (evt.type === "tool_execution_end") {
        pushEvent({
          type: "tool_execution_end",
          toolCall: {
            id: evt.toolCallId,
            name: evt.toolName,
            result: evt.result,
          },
        });
      } else if (evt.type === "agent_error") {
        pushEvent({
          type: "error",
          error: evt.error,
        });
      } else if (evt.type === "agent_end") {
        pushEvent({
          type: "agent_end",
        });
      }
    });

    const promptPromise = session.prompt(input).finally(() => {
      isDone = true;
      if (resolveNext) {
        const notify = resolveNext;
        resolveNext = null;
        notify();
      }
    });

    try {
      while (true) {
        while (queue.length > 0) {
          yield queue.shift()!;
        }
        if (isDone) {
          break;
        }
        await new Promise<void>((r) => {
          resolveNext = r;
        });
      }
      await promptPromise;
    } finally {
      unsubscribe();
    }
  }

  get messages(): any[] {
    return this._runtime?.session?.messages || [];
  }
}
