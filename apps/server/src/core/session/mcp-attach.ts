// SPDX-License-Identifier: MIT
import type { AgentSession } from "..";
import { mcpRegistry } from "../mcp/mcp-registry";

/**
 * Internal helper to attach MCP tools dynamically to an active session.
 */
export async function attachSessionMcpTools(
  session: AgentSession,
  username: string,
  key: string,
): Promise<void> {
  try {
    const mcpTools = await mcpRegistry.getSessionMcpTools(username, key);
    if (mcpTools.length > 0) {
      const sessionAny = session as any;
      if (sessionAny._customTools) {
        sessionAny._customTools.push(...mcpTools);
        if (typeof sessionAny._refreshToolRegistry === "function") {
          sessionAny._refreshToolRegistry();
        }
      }
    }
  } catch (err) {
    console.error(`[attachSessionMcpTools] Failed to load MCP tools for ${key}:`, err);
  }
}
