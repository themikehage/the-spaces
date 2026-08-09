// SPDX-License-Identifier: MIT
import { FileWorkspaceConfigLoader } from "../session/workspace-config-loader";
import { CascadeConfigLoader } from "./cascade-config-loader";

export * from "./cascade-config-loader";
export * from "./config-merger";
export * from "./entity-config";
export * from "./entity-membership";

export const cascadeConfigLoader = new CascadeConfigLoader(new FileWorkspaceConfigLoader());
