// SPDX-License-Identifier: MIT

// Service Abstraction
export type {
  ArtifactMetadata,
  IArtifactStore,
  IMemoryStore,
  ISessionStore,
  MessageRecord,
  RecallOptions,
  RecalledMemory,
  SessionData,
  SessionSummary,
} from "shared";

// Tool Abstraction
export { FunctionTool, ToolRegistry, legacyToolToBaseTool } from "shared";
export type { BaseTool, ToolDeclaration, ToolResult, ToolResultMetadata } from "shared";

// Model Providers Abstraction
export { LLMRegistry } from "shared";
export type { BaseLlmProvider, ProviderCapabilities, ProviderModelInfo } from "shared";

// Plugin System Abstraction
export { BasePlugin, PluginManager } from "shared";
export type { ModelCallContext, SessionContext, ToolCallContext } from "shared";

// Declarative Agent Config Schema
export { SpacesAgentConfigSchema } from "shared";
export type { SpacesAgentConfig } from "shared";
