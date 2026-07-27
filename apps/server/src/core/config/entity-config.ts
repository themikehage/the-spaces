// SPDX-License-Identifier: MIT
export interface EntityConfig {
  defaultModel?: string;
  autonomyLevel?: "auto" | "propose" | "suggest";
  executionMode?: string;
  toolOverrides?: {
    add?: string[];
    remove?: string[];
  };
  permissionOverrides?: Record<string, "allow" | "deny" | "ask">;
  skills?: string[];
  rules?: string[];
  workflows?: string[];
  hooks?: Record<string, unknown>;
  [key: string]: unknown;
}
