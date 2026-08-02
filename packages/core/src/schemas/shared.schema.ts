// SPDX-License-Identifier: MIT
import { z } from "zod";
import { AgentDefinitionSchema } from "./agent.schema";
import { CreateTeamSchema } from "./team.schema";

export const LoginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8),
});

export const PromptSchema = z.object({
  message: z.string().min(1),
});

export const ModelSettingsSchema = z.object({
  provider: z.string(),
  modelId: z.string(),
  thinkingLevel: z.enum(["off", "minimal", "low", "medium", "high", "xhigh"]),
});

export {
  AVAILABLE_TOOLS,
  DEFAULT_ALWAYS_ON_TOOLS,
  TOOL_GROUPS,
  type ToolGroup,
  type ToolName,
} from "../catalogs";

export const ToolPermissionsSchema = z.object({
  tools: z.array(z.string().min(1)),
  executionMode: z.enum(["readonly", "standard", "autonomous"]).optional(),
  autonomyLevel: z.enum(["auto", "propose", "suggest"]).optional(),
});
export type ToolPermissions = z.infer<typeof ToolPermissionsSchema>;

export const SetApiKeySchema = z.object({
  apiKey: z.string().min(1),
});

export const SetEnvVarSchema = z.object({
  key: z
    .string()
    .min(1)
    .regex(
      /^[a-zA-Z_][a-zA-Z0-9_]*$/,
      "Invalid environment variable name. Must start with a letter or underscore and contain only alphanumeric characters or underscores.",
    ),
  value: z.string().min(1),
});

export const TaskStatusSchema = z.enum(["pending", "running", "done", "failed"]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const RunnerStatusSchema = z.enum([
  "idle",
  "decomposing",
  "running",
  "paused",
  "completed",
  "failed",
]);
export type RunnerStatus = z.infer<typeof RunnerStatusSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  prompt: z.string(),
  status: TaskStatusSchema,
  log: z.string(),
  depends_on: z.array(z.string()).optional().default([]),
  estimated_steps: z.number().optional(),
});
export type Task = z.infer<typeof TaskSchema>;

export const TaskRunnerStateSchema = z.object({
  tasks: z.array(TaskSchema),
  currentTaskId: z.string().nullable(),
  status: RunnerStatusSchema,
  error: z.string().optional(),
});
export type TaskRunnerState = z.infer<typeof TaskRunnerStateSchema>;

export const QuickActionSchema = z.object({
  id: z.string(),
  name: z.string(),
  prompt: z.string(),
  description: z.string().optional(),
});
export type QuickAction = z.infer<typeof QuickActionSchema>;

export const IntegrationTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  requiredEnvVars: z.array(z.string()),
  requiredProjectVars: z.array(z.string()),
  actions: z.array(QuickActionSchema),
});
export type IntegrationTemplate = z.infer<typeof IntegrationTemplateSchema>;

export const SaveTemplatesSchema = z.object({
  templates: z.array(IntegrationTemplateSchema),
});
export type SaveTemplates = z.infer<typeof SaveTemplatesSchema>;

export const ProjectBindingsSchema = z.record(z.string(), z.record(z.string(), z.string()));
export type ProjectBindings = z.infer<typeof ProjectBindingsSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});
export type ChangePassword = z.infer<typeof ChangePasswordSchema>;

export const FrameworkPresetSchema = z.enum([
  "auto",
  "vite",
  "next",
  "nuxt",
  "astro",
  "html",
  "custom",
]);
export type FrameworkPreset = z.infer<typeof FrameworkPresetSchema>;

export const PreviewConfigSchema = z.object({
  framework: FrameworkPresetSchema.optional(),
  buildCommand: z.string().optional(),
  outputDir: z.string().optional(),
  autoDetected: z.boolean().optional(),
});
export type PreviewConfig = z.infer<typeof PreviewConfigSchema>;

export const PreviewStatusSchema = z.enum(["idle", "building", "ready", "error"]);
export type PreviewStatus = z.infer<typeof PreviewStatusSchema>;

export const PreviewStateSchema = z.object({
  projectName: z.string(),
  status: PreviewStatusSchema,
  distExists: z.boolean(),
  indexHtmlExists: z.boolean(),
  lastBuildAt: z.number().nullable(),
  error: z.string().optional(),
  config: PreviewConfigSchema.optional(),
});
export type PreviewState = z.infer<typeof PreviewStateSchema>;

export const SavePreviewConfigSchema = z.object({
  framework: FrameworkPresetSchema.optional(),
  buildCommand: z.string().optional(),
  outputDir: z.string().optional(),
});
export type SavePreviewConfig = z.infer<typeof SavePreviewConfigSchema>;

export const BuildEventSchema = z.object({
  type: z.enum(["preview_status", "preview_error"]),
  projectName: z.string(),
  status: PreviewStatusSchema.optional(),
  error: z.string().optional(),
  lastBuildAt: z.number().optional(),
});

export type Login = z.infer<typeof LoginSchema>;
export type Prompt = z.infer<typeof PromptSchema>;
export type ModelSettings = z.infer<typeof ModelSettingsSchema>;
export type SetApiKey = z.infer<typeof SetApiKeySchema>;
export type SetEnvVar = z.infer<typeof SetEnvVarSchema>;

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  mimeType?: string;
  content?: string;
  children?: FileInfo[];
  lastModified: string;
}

export interface FileUploadResult {
  name: string;
  path: string;
  size: number;
  mimeType: string;
}

export const ReplyModeSchema = z.enum(["user-only", "broadcast", "targeted", "mention-only"]);
export type ReplyMode = z.infer<typeof ReplyModeSchema>;

export const DelegationPatternSchema = z.object({
  token: z.string().default("DELEGATE: @(\\w+) — (.+)"),
  applyToRole: z.string().optional().default("lead"),
});
export type DelegationPattern = z.infer<typeof DelegationPatternSchema>;

export interface GlobalLogEvent {
  timestamp: string;
  sourceType: "session" | "channel";
  sourceId: string;
  sourceName: string;
  eventType:
    | "agent_start"
    | "agent_end"
    | "text_delta"
    | "thinking_delta"
    | "tool_start"
    | "tool_end"
    | "user_message"
    | "agent_message"
    | "error";
  agentName?: string;
  detail?: any;
}

export const AgentExecutionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  messages: z.array(z.any()),
  toolCalls: z.array(z.any()),
  errors: z.array(z.string()),
  durationMs: z.number().optional(),
  tokenUsage: z
    .object({
      promptTokens: z.number(),
      completionTokens: z.number(),
      totalTokens: z.number(),
    })
    .optional(),
  createdAt: z.string(),
});
export type AgentExecution = z.infer<typeof AgentExecutionSchema>;

export const LabStanceSchema = z.object({
  id: z.string(),
  name: z.string(),
  template: z.string(),
  position: z.string(),
  briefing: z.string(),
  icon: z.string(),
  color: z.string(),
});
export type LabStance = z.infer<typeof LabStanceSchema>;

export const LabAgentSchema = AgentDefinitionSchema.omit({ id: true }).extend({
  id: z.string(),
  stance: LabStanceSchema.optional(),
  leader: z.boolean().optional(),
});
export type LabAgent = z.infer<typeof LabAgentSchema>;

export const VariantRunResultSchema = z.object({
  status: z.enum(["completed", "failed"]),
  durationMs: z.number(),
  tokensIn: z.number(),
  tokensOut: z.number(),
  negotiationRounds: z.number().optional(),
  escalationsToLeader: z.number().optional(),
  agreementReached: z.boolean(),
  finalOutput: z.string(),
  divergenceEventsCount: z.number().optional(),
  arbitrationRoundsCount: z.number().optional(),
  protocolActivationRate: z.number().optional(),
  scores: z.object({
    taskQuality: z.number(),
    efficiencyScore: z.number(),
    negotiationScore: z.number().optional(),
    globalScore: z.number(),
    judgeReasoning: z.string().optional(),
    criteriaScores: z.record(z.number()).optional(),
    efficiencyDetail: z
      .object({
        numAgents: z.number(),
        effectiveRounds: z.number(),
        adjustedDuration: z.number(),
        adjustedTokens: z.number(),
      })
      .optional(),
  }),
});
export type VariantRunResult = z.infer<typeof VariantRunResultSchema>;

export const VariantRunSchema = z.object({
  type: z.enum(["single", "multi_no_leader", "multi_with_leader"]),
  channelId: z.string().optional(),
  activeSessionId: z.string().optional(),
  agents: z.array(LabAgentSchema),
  result: VariantRunResultSchema.optional(),
});
export type VariantRun = z.infer<typeof VariantRunSchema>;

export const LabTestCaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  goldAnswer: z
    .object({
      fichas: z.number().optional(),
      dias: z.number().optional(),
    })
    .optional(),
  taskPrompt: z.string().optional(),
});
export type LabTestCase = z.infer<typeof LabTestCaseSchema>;

export const LabBlueprintSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  agents: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      role: z.string(),
      systemPromptTemplate: z.string(),
      leader: z.boolean().optional(),
      replyMode: ReplyModeSchema.optional(),
    }),
  ),
  channelConfig: z
    .object({
      name: z.string(),
      negotiationProtocol: z
        .object({
          agreementPattern: z.string(),
          counterPattern: z.string().optional(),
          rejectPattern: z.string().optional(),
          maxRounds: z.number().int().min(1).max(20).default(3),
          arbiterAgentId: z.string().optional(),
        })
        .optional(),
      delegationPattern: DelegationPatternSchema.optional(),
      context: z
        .array(
          z.object({
            key: z.string(),
            value: z.string(),
          }),
        )
        .optional(),
    })
    .optional(),
  testCases: z.array(LabTestCaseSchema),
  scoringConfig: z
    .object({
      metrics: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          weight: z.number(),
          type: z.enum(["numeric-deviation", "llm-judge", "custom-script"]),
        }),
      ),
    })
    .optional(),
});
export type LabBlueprint = z.infer<typeof LabBlueprintSchema>;

export const MaxChainDepthSchema = z.object({
  single: z.number().int().min(1).max(50).default(3),
  multiNoLeader: z.number().int().min(1).max(50).default(8),
  multiWithLeader: z.number().int().min(1).max(50).default(15),
});
export type MaxChainDepth = z.infer<typeof MaxChainDepthSchema>;

export const LabExperimentSchema = z.object({
  id: z.string(),
  name: z.string(),
  taskPrompt: z.string(),
  status: z.enum(["designing", "generating", "running", "completed", "failed"]),
  positions: z.array(LabStanceSchema),
  judge: z.object({
    criteria: z.array(z.string()),
    autoEvaluate: z.boolean(),
  }),
  variants: z.object({
    single: VariantRunSchema,
    multiNoLeader: VariantRunSchema,
    multiWithLeader: VariantRunSchema,
  }),
  maxChainDepth: MaxChainDepthSchema.optional(),
  createdAt: z.string(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  blueprintId: z.string().optional(),
  activeRunIndex: z.number().optional(),
  activeRunId: z.string().optional(),
  activeVariant: z
    .enum(["single", "multiNoLeader", "multiWithLeader", "judging"])
    .nullable()
    .optional(),
});
export type LabExperiment = z.infer<typeof LabExperimentSchema>;

export const McpTransportTypeSchema = z.enum(["stdio", "http"]);
export type McpTransportType = z.infer<typeof McpTransportTypeSchema>;

export const McpServerConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  transport: McpTransportTypeSchema,
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  url: z.string().optional(),
  installed: z.boolean().default(false),
  enabled: z.boolean().default(false),
  isBuiltin: z.boolean().default(false),
  category: z.string().optional(),
  icon: z.string().optional(),
  tools: z.array(z.string()).optional(),
  status: z.enum(["disconnected", "connecting", "connected", "error"]).default("disconnected"),
  error: z.string().optional(),
  lastConnected: z.string().optional(),
});
export type McpServerConfig = z.infer<typeof McpServerConfigSchema>;

export const McpCatalogItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  icon: z.string(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  url: z.string().optional(),
  homepage: z.string().optional(),
  source: z.string().optional(),
  isHttp: z.boolean().default(false),
});
export type McpCatalogItem = z.infer<typeof McpCatalogItemSchema>;

export const McpConfigSchema = z.object({
  mcpServers: z.record(McpServerConfigSchema),
});
export type McpConfig = z.infer<typeof McpConfigSchema>;

export const UiComponentSchema = z.object({
  type: z.literal("ui_component"),
  sessionId: z.string(),
  componentId: z.string(),
  componentType: z.enum(["approval", "chart", "form"]),
  props: z.record(z.unknown()),
  blocking: z.boolean().optional(),
  persist: z.boolean().optional(),
});
export type UiComponent = z.infer<typeof UiComponentSchema>;

export const UiActionSchema = z.object({
  type: z.literal("ui_action"),
  sessionId: z.string(),
  componentId: z.string(),
  action: z.string(),
  payload: z.record(z.unknown()).optional(),
});
export type UiAction = z.infer<typeof UiActionSchema>;

export const GalleryMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
  author: z.string(),
  avatar: z.string().optional(),
  rating: z.number().optional(),
  downloads: z.number().optional(),
  tags: z.array(z.string()).default([]),
  created: z.string().optional(),
  updated: z.string().optional(),
  version: z.string(),
  compatibility: z.string().optional(),
});
export type GalleryMetadata = z.infer<typeof GalleryMetadataSchema>;

export const TeamMessageRoleSchema = z.enum(["user", "agent", "system"]);
export type TeamMessageRole = z.infer<typeof TeamMessageRoleSchema>;

export const TeamMessageSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  sessionId: z.string().optional(),
  role: TeamMessageRoleSchema,
  agentId: z.string().optional(),
  agentName: z.string().optional(),
  content: z.string(),
  thinking: z.string().optional(),
  toolCalls: z.array(z.any()).optional(),
  mentions: z.array(z.string()).optional(),
  tokensIn: z.number().optional(),
  tokensOut: z.number().optional(),
  round: z.number().optional(),
  createdAt: z.string(),
});
export type TeamMessage = z.infer<typeof TeamMessageSchema>;

export const BlueprintTypeSchema = z.enum(["agent", "team"]);
export type BlueprintType = z.infer<typeof BlueprintTypeSchema>;

export const GalleryItemSchema = z.object({
  id: z.string(),
  type: BlueprintTypeSchema,
  definition: z.union([AgentDefinitionSchema, CreateTeamSchema]),
  metadata: GalleryMetadataSchema,
  hasIcon: z.boolean().optional(),
});
export type GalleryItem = z.infer<typeof GalleryItemSchema>;

export const PendingDelegationSchema = z.object({
  toolCallId: z.string(),
  parentSessionId: z.string(),
  targetType: z.enum(["spawn", "delegate"]),
  targetLabel: z.string(),
  task: z.string(),
  status: z.enum(["running", "success", "error", "blocked"]),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  result: z.any().optional(),
  subagentSessionId: z.string(),
});
export type PendingDelegation = z.infer<typeof PendingDelegationSchema>;

export const OutputFieldSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "json"]),
  description: z.string(),
});
export type OutputField = z.infer<typeof OutputFieldSchema>;

export const ScriptStageSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.literal("script"),
  script: z.string(),
  outputSchema: z.array(OutputFieldSchema).optional(),
  timeoutMs: z.number().optional(),
});
export type ScriptStage = z.infer<typeof ScriptStageSchema>;

export const AgentStageSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.literal("agent"),
  agentId: z.string().optional(),
  prompt: z.string(),
  outputSchema: z.array(OutputFieldSchema).optional(),
  timeoutMs: z.number().optional(),
});
export type AgentStage = z.infer<typeof AgentStageSchema>;

export const PipelineStageSchema = z.discriminatedUnion("type", [
  ScriptStageSchema,
  AgentStageSchema,
]);
export type PipelineStage = z.infer<typeof PipelineStageSchema>;

export const PipelineDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().default(""),
  version: z.number().default(1),
  stages: z.array(PipelineStageSchema),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type PipelineDefinition = z.infer<typeof PipelineDefinitionSchema>;

export const StageResultSchema = z.object({
  stageId: z.string(),
  status: z.enum(["pending", "running", "completed", "failed"]),
  sessionId: z.string().optional(),
  output: z.record(z.string(), z.any()),
  rawOutput: z.string().default(""),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
  tokensIn: z.number().optional(),
  tokensOut: z.number().optional(),
});
export type StageResult = z.infer<typeof StageResultSchema>;

export const PipelineRunSchema = z.object({
  id: z.string(),
  pipelineId: z.string(),
  status: z.enum(["running", "completed", "failed"]),
  triggeredBy: z.enum(["manual", "agent"]),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  stageResults: z.array(StageResultSchema),
  error: z
    .object({
      stageId: z.string(),
      message: z.string(),
    })
    .optional(),
});
export type PipelineRun = z.infer<typeof PipelineRunSchema>;

export const BenchmarkVariantResultSchema = z.object({
  status: z.enum(["completed", "failed"]),
  durationMs: z.number(),
  tokensIn: z.number(),
  tokensOut: z.number(),
  negotiationRounds: z.number().optional(),
  escalationsToLeader: z.number().optional(),
  agreementReached: z.boolean(),
  finalOutput: z.string(),
  divergenceEventsCount: z.number().optional(),
  arbitrationRoundsCount: z.number().optional(),
  protocolActivationRate: z.number().optional(),
  scores: z
    .object({
      taskQuality: z.number(),
      efficiencyScore: z.number(),
      globalScore: z.number(),
      judgeReasoning: z.string().optional(),
      criteriaScores: z.record(z.number()).optional(),
    })
    .optional(),
});
export type BenchmarkVariantResult = z.infer<typeof BenchmarkVariantResultSchema>;

export const BenchmarkJudgeResultSchema = z.object({
  winner: z.enum(["multi", "single", "tie"]),
  scores: z.object({
    multi: z.number(),
    single: z.number(),
  }),
  reasoning: z.string(),
  criteriaScores: z.object({
    multi: z.record(z.number()),
    single: z.record(z.number()),
  }),
});
export type BenchmarkJudgeResult = z.infer<typeof BenchmarkJudgeResultSchema>;

export const AutonomyLevelSchema = z.enum(["auto", "propose", "suggest"]);
export type AutonomyLevel = z.infer<typeof AutonomyLevelSchema>;

export const PromptPreviewEntityTypeSchema = z.enum([
  "global",
  "agent",
  "project",
  "team",
  "subagent",
]);
export type PromptPreviewEntityType = z.infer<typeof PromptPreviewEntityTypeSchema>;

export const PromptPreviewRequestSchema = z.object({
  entityType: PromptPreviewEntityTypeSchema,
  agentId: z.string().optional(),
  projectId: z.string().optional(),
  teamId: z.string().optional(),
  subagentId: z.string().optional(),
});
export type PromptPreviewRequest = z.infer<typeof PromptPreviewRequestSchema>;

export const PromptPreviewSectionSchema = z.object({
  title: z.string(),
  content: z.string(),
});
export type PromptPreviewSection = z.infer<typeof PromptPreviewSectionSchema>;

export const PromptPreviewResponseSchema = z.object({
  sections: z.array(PromptPreviewSectionSchema),
  fullPrompt: z.string(),
  estimatedTokens: z.number(),
});
export type PromptPreviewResponse = z.infer<typeof PromptPreviewResponseSchema>;

export const EntityTypeSchema = z.enum(["global", "agent", "project", "team"]);
export type EntityType = z.infer<typeof EntityTypeSchema>;

export const EntityConfigSchema = z
  .object({
    defaultModel: z.string().optional(),
    toolOverrides: z
      .object({
        add: z.array(z.string()).optional(),
        remove: z.array(z.string()).optional(),
      })
      .optional(),
    permissionOverrides: z.record(z.string(), z.enum(["allow", "deny", "ask"])).optional(),
    skills: z.array(z.string()).optional(),
    rules: z.array(z.string()).optional(),
    workflows: z.array(z.string()).optional(),
    hooks: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
export type EntityConfigType = z.infer<typeof EntityConfigSchema>;

export const SpacesAgentConfigSchema = z.object({
  name: z.string(),
  model: z.string().optional(),
  instruction: z.string(),
  description: z.string().optional(),
  tools: z.array(z.any()).optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().int().optional(),
  thinkingLevel: z.enum(["off", "minimal", "low", "medium", "high"]).optional(),
  executionMode: z.enum(["readonly", "standard", "autonomous"]).optional(),
  skills: z.array(z.string()).optional(),
  memory: z.boolean().optional().default(true),
  workspaceDir: z.string().optional(),
  plugins: z.array(z.any()).optional(),
});
export type SpacesAgentConfig = z.input<typeof SpacesAgentConfigSchema>;
export type ResolvedSpacesAgentConfig = z.output<typeof SpacesAgentConfigSchema>;

export const ToolScopeTargetSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("global") }),
  z.object({ type: z.literal("project"), id: z.string() }),
  z.object({ type: z.literal("team"), id: z.string() }),
  z.object({ type: z.literal("agent"), id: z.string() }),
]);
export type ToolScopeTarget = z.infer<typeof ToolScopeTargetSchema>;

export const PatchScopeToolsSchema = z.object({
  target: ToolScopeTargetSchema,
  add: z.array(z.string()),
  remove: z.array(z.string()).optional().default([]),
});
export type PatchScopeToolsPayload = z.infer<typeof PatchScopeToolsSchema>;

export const AgentToolsConfigSchema = z.object({
  add: z.array(z.string()),
  remove: z.array(z.string()),
});
export type AgentToolsConfig = z.infer<typeof AgentToolsConfigSchema>;

export const EntityToolsScopeResponseSchema = z.object({
  global: z.array(z.string()),
  team: z.array(z.string()).optional(),
  project: z.array(z.string()).optional(),
  agent: AgentToolsConfigSchema.optional(),
  resolved: z.array(z.string()),
});
export type EntityToolsScopeResponse = z.infer<typeof EntityToolsScopeResponseSchema>;

export const CustomToolSummarySchema = z.object({
  name: z.string(),
  label: z.string().optional(),
  description: z.string(),
  enabled: z.boolean(),
  executeType: z.enum(["pipeline", "ui"]),
  dependencies: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type CustomToolSummary = z.infer<typeof CustomToolSummarySchema>;
