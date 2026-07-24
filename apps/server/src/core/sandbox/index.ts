// SPDX-License-Identifier: MIT
export { permissionEngine } from "./permission-engine";
export type { PermissionRule, PermissionVerdict } from "./permission-engine";
export { buildSubagentRules, evaluateSubagentRules, extractSubject } from "./subagent-permissions";
export type { ToolPermissionRule } from "./subagent-permissions";
export { userPermissionStore } from "./user-permission-store";
