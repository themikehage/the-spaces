// SPDX-License-Identifier: MIT
import type { AvailableModel } from "../../ai/model-registry";

export interface ModelResolutionContext {
  sessionModel?: string;
  agentModel?: string;
  projectModel?: string;
  teamModel?: string;
  userDefaultModel?: string;
  workspaceConfigModel?: string;
}

export interface ModelResolver {
  resolve(ctx: ModelResolutionContext): AvailableModel | undefined;
}
