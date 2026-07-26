// SPDX-License-Identifier: MIT
import type { AvailableModel, ModelRegistry } from "../../ai/model-registry";
import type { ModelResolutionContext, ModelResolver } from "../ports/model-resolver";

export class DefaultModelResolver implements ModelResolver {
  constructor(private modelRegistry: ModelRegistry) {}

  resolve(ctx: ModelResolutionContext): AvailableModel | undefined {
    const chain = [
      ctx.sessionModel,
      ctx.agentModel,
      ctx.projectModel,
      ctx.teamModel,
      ctx.userDefaultModel,
      ctx.workspaceConfigModel,
    ].filter((m): m is string => Boolean(m));

    const available = this.modelRegistry.getAvailable();
    if (available.length === 0) {
      return undefined;
    }

    for (const modelCandidate of chain) {
      const found = available.find(
        (m) => m.id === modelCandidate || `${m.provider}/${m.id}` === modelCandidate,
      );
      if (found) {
        return found;
      }
    }

    return available[0];
  }
}
