// SPDX-License-Identifier: MIT
import { scopeConfigManager } from "../scope/scope-config-manager";
import { workspaceConfigLoader } from "../session/workspace-config-loader";
import { CascadeConfigLoader } from "./cascade-config-loader";

export * from "./cascade-config-loader";
export * from "./config-merger";
export * from "./entity-config";

export const cascadeConfigLoader = new CascadeConfigLoader(
  workspaceConfigLoader,
  scopeConfigManager,
);
