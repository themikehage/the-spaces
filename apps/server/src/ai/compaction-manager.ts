import type { AvailableModel, ModelRegistry } from "./model-registry";

function prepareCompaction(entries: any[], settings: any): any {
  return { ok: false, error: "Legacy compaction disabled" };
}
async function compact(...args: any[]): Promise<any> {
  return { ok: false, error: "Legacy compaction disabled" };
}
function completeSimple(...args: any[]): any {}

export class CompactionManager {
  constructor(
    private sessionStore: any,
    private modelRegistry: ModelRegistry,
  ) {}

  async compactSession(
    model: AvailableModel | null,
    thinkingLevel: string,
    customInstructions?: string,
  ): Promise<{ summary: string; firstKeptEntryId: string; tokensBefore: number } | null> {
    if (!model) {
      throw new Error("No model configured for compaction");
    }
    if (!model.contextWindow) {
      throw new Error(
        `Model ${model.id} missing contextWindow - fetch mandatory, run POST /api/providers/${model.provider}/refresh`,
      );
    }

    const modelObj = {
      id: model.id,
      name: model.name,
      provider: model.provider,
      api: model.api,
      baseUrl: model.baseUrl,
      apiKey: model.apiKey,
      reasoning: !!model.reasoning,
      contextWindow: model.contextWindow!,
      maxTokens: model.maxTokens ?? 0,
      compat: model.compat,
      input: (model as any).input || [],
      cost: (model as any).cost || {},
    };

    const entries = this.sessionStore.getEntries();
    const settings = {
      enabled: true,
      reserveTokens: 16384,
      keepRecentTokens: 20000,
    };

    const prepResult = prepareCompaction(entries as any[], settings);
    if (!prepResult.ok) {
      console.error("[CompactionManager] Preparation failed:", prepResult.error);
      return null;
    }

    const preparation = prepResult.value;
    if (!preparation) {
      console.log("[CompactionManager] Nothing to compact");
      return null;
    }

    const dummyModels = {
      completeSimple: async (m: any, ctx: any, opts?: any) => {
        const result = await this.modelRegistry.getApiKeyAndHeaders({
          provider: m.provider,
          apiKey: model.apiKey,
        } as any);
        const apiKey = result.ok ? result.apiKey : undefined;
        return completeSimple(m, ctx, { ...opts, apiKey });
      },
    } as any;

    const compactResult = await compact(
      preparation,
      dummyModels,
      modelObj,
      customInstructions,
      undefined,
      thinkingLevel as any,
    );

    if (!compactResult.ok) {
      console.error("[CompactionManager] Execution failed:", compactResult.error);
      return null;
    }

    const { summary, firstKeptEntryId, tokensBefore } = compactResult.value;
    this.sessionStore.appendCompaction(summary, tokensBefore, firstKeptEntryId);
    console.log("[CompactionManager] Successfully compacted session context");
    return { summary, firstKeptEntryId, tokensBefore };
  }
}
