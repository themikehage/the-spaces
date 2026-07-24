// SPDX-License-Identifier: MIT

// Service Abstraction
export type {
  ISessionStore,
  IArtifactStore,
  IMemoryStore,
  SessionData,
  SessionSummary,
  MessageRecord,
  ArtifactMetadata,
  RecalledMemory,
  RecallOptions,
} from "shared";

// Tool Abstraction
export type {
  BaseTool,
  ToolDeclaration,
  ToolResult,
  ToolResultMetadata,
} from "shared";
export { FunctionTool, legacyToolToBaseTool, ToolRegistry } from "shared";

// Model Providers Abstraction
export type {
  BaseLlmProvider,
  ProviderCapabilities,
  ProviderModelInfo,
} from "shared";
export { LLMRegistry } from "shared";

// Plugin System Abstraction
export type {
  ToolCallContext,
  ModelCallContext,
  SessionContext,
} from "shared";
export { BasePlugin, PluginManager } from "shared";
