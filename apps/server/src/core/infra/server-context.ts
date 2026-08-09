// SPDX-License-Identifier: MIT
import { agentRegistry as defaultAgentRegistry } from "../../agents/agent-registry";
import { uiApprovalRegistry as defaultUiApprovalRegistry } from "../approvals/ui-approval-registry";
import { delegationRegistry as defaultDelegationRegistry } from "../delegation/delegation-registry";
import { mcpRegistry as defaultMcpRegistry } from "../mcp/mcp-registry";
import { memoryRegistry as defaultMemoryRegistry } from "../memory/registry";
import type { IAgentRegistry } from "../ports/agent-registry.port";
import {
  type IDelegationRegistry,
  type IMcpRegistry,
  type IMemoryRegistry,
  type ISessionManager,
  type IUiApprovalRegistry,
} from "../ports/core-services.port";
import type { IPermissionEngine } from "../ports/permission.port";
import type { ISandbox } from "../ports/sandbox.port";
import { type SpacesHost } from "../ports/spaces-host.port";
import type { WorkspaceConfigPort } from "../ports/workspace-config.port";
import type { IWorkspaceResolver } from "../ports/workspace-resolver.port";
import { LocalSandbox } from "../sandbox/local.sandbox";
import { sessionManager as defaultSessionManager } from "../session/session-manager";
import { FileWorkspaceConfigLoader } from "../session/workspace-config-loader";
import * as defaultWorkspaceResolver from "../session/workspace-resolver";
import { PermissionEngine } from "./permission-engine";
import { serverSpacesHost as defaultServerSpacesHost } from "./spaces-host";

export interface ServerContext {
  sessionManager: ISessionManager;
  agentRegistry: IAgentRegistry;
  workspaceResolver: IWorkspaceResolver;
  workspaceConfig: WorkspaceConfigPort;
  mcpRegistry: IMcpRegistry;
  delegationRegistry: IDelegationRegistry;
  memoryRegistry: IMemoryRegistry;
  uiApprovalRegistry: IUiApprovalRegistry;
  spacesHost: SpacesHost;
  sandbox: ISandbox;
  permissionEngine: IPermissionEngine;
}

export interface ServerContextOptions {
  sessionManager?: ISessionManager;
  agentRegistry?: IAgentRegistry;
  workspaceResolver?: IWorkspaceResolver;
  workspaceConfig?: WorkspaceConfigPort;
  mcpRegistry?: IMcpRegistry;
  delegationRegistry?: IDelegationRegistry;
  memoryRegistry?: IMemoryRegistry;
  uiApprovalRegistry?: IUiApprovalRegistry;
  spacesHost?: SpacesHost;
  sandbox?: ISandbox;
  permissionEngine?: IPermissionEngine;
}

export function createServerContext(options?: ServerContextOptions): ServerContext {
  return {
    sessionManager: options?.sessionManager ?? defaultSessionManager,
    agentRegistry: options?.agentRegistry ?? (defaultAgentRegistry as unknown as IAgentRegistry),
    workspaceResolver: options?.workspaceResolver ?? defaultWorkspaceResolver,
    workspaceConfig: options?.workspaceConfig ?? new FileWorkspaceConfigLoader(),
    mcpRegistry: options?.mcpRegistry ?? defaultMcpRegistry,
    delegationRegistry: options?.delegationRegistry ?? defaultDelegationRegistry,
    memoryRegistry: options?.memoryRegistry ?? defaultMemoryRegistry,
    uiApprovalRegistry: options?.uiApprovalRegistry ?? defaultUiApprovalRegistry,
    spacesHost: options?.spacesHost ?? defaultServerSpacesHost,
    sandbox: options?.sandbox ?? new LocalSandbox(),
    permissionEngine: options?.permissionEngine ?? new PermissionEngine(),
  };
}
