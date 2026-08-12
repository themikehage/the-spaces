// SPDX-License-Identifier: MIT
import type { AutonomyMode } from "shared";

export interface EntityConfig {
  defaultModel?: string;
  autonomyMode?: AutonomyMode;
  executionMode?: AutonomyMode;
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

