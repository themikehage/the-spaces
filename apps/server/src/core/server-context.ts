// SPDX-License-Identifier: MIT
import { delegationRegistry as defaultDelegationRegistry } from "./delegation-registry";
import { mcpRegistry as defaultMcpRegistry } from "./mcp-registry";
import { memoryRegistry as defaultMemoryRegistry } from "./memory/registry";
import {
  type IDelegationRegistry,
  type IMcpRegistry,
  type IMemoryRegistry,
  type ISessionManager,
  type IUiApprovalRegistry,
} from "./ports/core-services.port";
import { type SpacesHost } from "./ports/spaces-host.port";
import { sessionManager as defaultSessionManager } from "./session-manager";
import { serverSpacesHost as defaultServerSpacesHost } from "./spaces-host";
import { uiApprovalRegistry as defaultUiApprovalRegistry } from "./ui-approval-registry";

export interface ServerContext {
  sessionManager: ISessionManager;
  mcpRegistry: IMcpRegistry;
  delegationRegistry: IDelegationRegistry;
  memoryRegistry: IMemoryRegistry;
  uiApprovalRegistry: IUiApprovalRegistry;
  spacesHost: SpacesHost;
}

export interface ServerContextOptions {
  sessionManager?: ISessionManager;
  mcpRegistry?: IMcpRegistry;
  delegationRegistry?: IDelegationRegistry;
  memoryRegistry?: IMemoryRegistry;
  uiApprovalRegistry?: IUiApprovalRegistry;
  spacesHost?: SpacesHost;
}

/**
 * Factory function creating a ServerContext with dependency injection.
 * Defaults to singleton instances for backward compatibility while enabling isolated testing contexts.
 */
export function createServerContext(options?: ServerContextOptions): ServerContext {
  return {
    sessionManager: options?.sessionManager ?? defaultSessionManager,
    mcpRegistry: options?.mcpRegistry ?? defaultMcpRegistry,
    delegationRegistry: options?.delegationRegistry ?? defaultDelegationRegistry,
    memoryRegistry: options?.memoryRegistry ?? defaultMemoryRegistry,
    uiApprovalRegistry: options?.uiApprovalRegistry ?? defaultUiApprovalRegistry,
    spacesHost: options?.spacesHost ?? defaultServerSpacesHost,
  };
}
