// SPDX-License-Identifier: MIT

export interface RunResult {
  text: string;
  toolCalls: Array<{
    id: string;
    name: string;
    arguments?: any;
    result?: any;
  }>;
  sessionId: string;
  messages: any[];
}

export interface StreamEvent {
  type: string;
  content?: string;
  toolCall?: {
    id: string;
    name: string;
    arguments?: any;
    result?: any;
  };
  message?: any;
  error?: string;
}
