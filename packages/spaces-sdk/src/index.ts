// SPDX-License-Identifier: MIT

// Core Contracts & Ports
export type {
  AgentContext,
  AgentEvent,
  AgentMessage,
  IAgentRuntime,
  IEventBus,
  IHookRunner,
  IMemoryProvider,
  IModelProvider,
  IPermissionEngine,
  IPromptBuilder,
  ISandbox,
  ISessionStore,
  ITool,
  IToolExecutor,
  IToolRegistry,
  IWorkspaceProvider,
  LLMMessage,
  MessageDelta,
  MessageRecord,
  PromptContext,
  PromptSection,
  RuleContext,
  SessionData,
  ToolCall,
  ToolCallContext,
  ToolContext,
  ToolResult,
} from "@spaces/core";

// Schemas & Utilities
export {
  AgentDefinitionSchema,
  AgentStatusSchema,
  CreateSessionSchema,
  MessageSchema,
  ProjectSchema,
  ScheduleJobSchema,
  SessionSchema,
  TeamSchema,
  ToolCallSchema,
  zodToJsonSchema,
} from "@spaces/core";

// Engine Implementation & Factories
export {
  AgentRuntime,
  EventBus,
  HookRunner,
  PermissionEngine,
  PromptBuilder,
  createAgent,
} from "@spaces/engine";
