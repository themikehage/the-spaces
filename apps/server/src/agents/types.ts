// SPDX-License-Identifier: MIT
import type { AgentDefinition, AgentStatus } from "@spaces/core";
import type { Hono } from "hono";
import type { MemoryProvider } from "../core/memory/types";

export interface AgentServer {
  definition: AgentDefinition;
  session: any;
  app: Hono;
  memory: MemoryProvider;
  start(): Promise<void>;
  stop(): Promise<void>;
  getActiveObservers?(): number;
}

export interface AgentEntry {
  username: string;
  server: AgentServer;
  status: AgentStatus;
  createdAt: string;
}
