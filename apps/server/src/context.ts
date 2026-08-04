// SPDX-License-Identifier: MIT
import type {
  IAgentRuntime,
  IModelProvider,
  ISandbox,
  ISessionStore,
  IToolRegistry,
} from "@spaces/core";
import { createAgent } from "@spaces/engine";
import { OpenAICompatibleProvider } from "@spaces/providers";
import { LocalSandbox } from "@spaces/sandbox";
import { FilesystemSessionStore } from "@spaces/storage";
import { createDefaultToolRegistry } from "@spaces/tools";
import { AgentRegistry } from "./agents/agent-registry";
import { loadEngineConfig } from "./config/engine-config";
import { ApprovalManager } from "./core/approvals/approval-manager";
import { CircuitBreakerRegistry } from "./core/circuit-breaker";
import { CascadeConfigLoader } from "./core/config";
import { CustomToolStorage } from "./core/custom-tools/storage";
import { DelegationRegistry } from "./core/delegation-registry";
import { McpRegistry } from "./core/mcp-registry";
import { MemoryRegistry } from "./core/memory/registry";
import { ObservabilityService } from "./core/observability/observability-service";
import { PromptComposer } from "./core/prompts/composer";
import { PromptFragmentRegistry } from "./core/prompts/registry";
import { UserPermissionStore } from "./core/sandbox/user-permission-store";
import { ScheduleRunner, ScheduleService } from "./core/schedules";
import { ScopeConfigManager } from "./core/scope/scope-config-manager";
import { SessionMetadataStore } from "./core/session/metadata-store";
import { SessionLister } from "./core/session/session-lister";
import { UserConfigManager } from "./core/session/user-config";
import { FileWorkspaceConfigLoader } from "./core/session/workspace-config-loader";
import { WebFetchCache } from "./core/tools/web-fetch/cache";
import { RateLimiter } from "./core/tools/web-fetch/rate-limiter";
import { UiApprovalRegistry } from "./core/ui-approval-registry";
import { EventBroker } from "./lib/event-broker";
import { TeamOrchestrator } from "./teams/team-orchestrator";
import { TeamStore } from "./teams/team-store";

export interface AppContext {
  sessionStore: ISessionStore;
  modelProvider: IModelProvider;
  toolRegistry: IToolRegistry;
  sandbox: ISandbox;
  mcpRegistry: McpRegistry;
  agentRegistry: AgentRegistry;
  teamStore: TeamStore;
  teamOrchestrator: TeamOrchestrator;
  sessionMetadataStore: SessionMetadataStore;
  userConfigManager: UserConfigManager;
  scopeConfigManager: ScopeConfigManager;
  userPermissionStore: UserPermissionStore;
  memoryRegistry: MemoryRegistry;
  delegationRegistry: DelegationRegistry;
  approvalManager: ApprovalManager;
  uiApprovalRegistry: UiApprovalRegistry;
  eventBroker: EventBroker;
  scheduleService: ScheduleService;
  scheduleRunner: ScheduleRunner;
  promptComposer: PromptComposer;
  workspaceConfigLoader: FileWorkspaceConfigLoader;
  cascadeConfigLoader: CascadeConfigLoader;
  sessionLister: SessionLister;
  observabilityService: ObservabilityService;
  circuitBreakerRegistry: CircuitBreakerRegistry;
  webFetchCache: WebFetchCache;
  promptFragmentRegistry: PromptFragmentRegistry;
  customToolStorage: CustomToolStorage;
  rateLimiter: RateLimiter;
  agentCache: Map<string, IAgentRuntime>;
  createSessionAgent(sessionId: string): IAgentRuntime;
  dispose(): Promise<void>;
}

export async function createAppContext(): Promise<AppContext> {
  const config = loadEngineConfig();

  const sessionStore = new FilesystemSessionStore(config.sessionsDir);
  const modelProvider = new OpenAICompatibleProvider({
    baseUrl: config.modelBaseUrl,
    apiKey: config.modelApiKey,
    model: config.modelName,
  });
  const toolRegistry = createDefaultToolRegistry();
  const sandbox = new LocalSandbox();
  const mcpRegistry = new McpRegistry();
  const agentRegistry = new AgentRegistry();
  const teamStore = new TeamStore();
  const teamOrchestrator = new TeamOrchestrator();
  const sessionMetadataStore = new SessionMetadataStore();
  const userConfigManager = new UserConfigManager();
  const scopeConfigManager = new ScopeConfigManager();
  const userPermissionStore = new UserPermissionStore();
  const memoryRegistry = new MemoryRegistry();
  const delegationRegistry = new DelegationRegistry();
  const approvalManager = new ApprovalManager();
  const uiApprovalRegistry = new UiApprovalRegistry();
  const eventBroker = new EventBroker();
  const scheduleService = new ScheduleService();
  const scheduleRunner = new ScheduleRunner(scheduleService);
  const promptComposer = new PromptComposer();
  const workspaceConfigLoader = new FileWorkspaceConfigLoader();
  const cascadeConfigLoader = new CascadeConfigLoader(workspaceConfigLoader, scopeConfigManager);

  const sessionLister = new SessionLister();
  const observabilityService = new ObservabilityService();
  const circuitBreakerRegistry = new CircuitBreakerRegistry();
  const webFetchCache = new WebFetchCache();
  const promptFragmentRegistry = new PromptFragmentRegistry();
  const customToolStorage = new CustomToolStorage();
  const rateLimiter = new RateLimiter();
  const agentCache = new Map<string, IAgentRuntime>();

  const createSessionAgent = (sessionId: string): IAgentRuntime => {
    let agent = agentCache.get(sessionId);
    if (!agent) {
      const username = "default";
      const metadata = sessionMetadataStore.getSessionMetadata(username, sessionId);
      const sessionModelStr =
        metadata?.model ||
        (metadata?.provider && metadata?.modelId
          ? `${metadata.provider}/${metadata.modelId}`
          : undefined);

      const { modelRegistry } = userConfigManager.getUserContext(username);
      modelRegistry.refresh();

      let resolvedModel = sessionModelStr
        ? modelRegistry
          .getAvailable()
          .find(
            (m) => m.id === sessionModelStr || `${m.provider}/${m.id}` === sessionModelStr,
          )
        : undefined;

      if (!resolvedModel && metadata?.provider && metadata?.modelId) {
        resolvedModel = modelRegistry.find(metadata.provider, metadata.modelId);
      }

      const activeProvider = resolvedModel
        ? new OpenAICompatibleProvider({
          baseUrl: resolvedModel.baseUrl,
          apiKey: resolvedModel.apiKey,
          model: resolvedModel.id,
        })
        : modelProvider;

      agent = createAgent(sessionId, {
        modelProvider: activeProvider,
        sessionStore,
        toolRegistry,
      });
      agentCache.set(sessionId, agent);
    }
    return agent;
  };

  const dispose = async (): Promise<void> => {
    for (const [, agent] of agentCache) {
      await agent.dispose().catch(() => { });
    }
    agentCache.clear();
  };

  return {
    sessionStore,
    modelProvider,
    toolRegistry,
    sandbox,
    mcpRegistry,
    agentRegistry,
    teamStore,
    teamOrchestrator,
    sessionMetadataStore,
    userConfigManager,
    scopeConfigManager,
    userPermissionStore,
    memoryRegistry,
    delegationRegistry,
    approvalManager,
    uiApprovalRegistry,
    eventBroker,
    scheduleService,
    scheduleRunner,
    promptComposer,
    workspaceConfigLoader,
    cascadeConfigLoader,
    sessionLister,
    observabilityService,
    circuitBreakerRegistry,
    webFetchCache,
    promptFragmentRegistry,
    customToolStorage,
    rateLimiter,
    agentCache,
    createSessionAgent,
    dispose,
  };
}
