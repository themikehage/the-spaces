// SPDX-License-Identifier: MIT
export const SessionPrefix = {
  EXEC: "exec_",
  DELEGATE: "del_",
  SUBAGENT: "sub_",
  TEAM: "team_",
  GENERATE: "generate_",
} as const;

export type SessionPrefixValue = typeof SessionPrefix[keyof typeof SessionPrefix];
