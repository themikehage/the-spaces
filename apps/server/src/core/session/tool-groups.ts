// SPDX-License-Identifier: MIT
import {
  DEFAULT_ALWAYS_ON_TOOLS as SHARED_ALWAYS_ON,
  TOOL_GROUPS as SHARED_TOOL_GROUPS,
  TOOL_GROUPS_LEGACY,
} from "@spaces/core";

export const TOOL_GROUPS = SHARED_TOOL_GROUPS;
export type ToolGroupName = keyof typeof TOOL_GROUPS;

export const DEFAULT_ALWAYS_ON_TOOLS: string[] = [...SHARED_ALWAYS_ON];
export { TOOL_GROUPS_LEGACY };
