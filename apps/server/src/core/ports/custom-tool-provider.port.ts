// SPDX-License-Identifier: MIT
import type { EntityType } from "shared";
import type { CustomToolDefinition } from "../custom-tools/schemas";

export interface EntityRef {
  type: EntityType;
  id?: string;
}

export interface FolderCustomTool {
  definition: CustomToolDefinition;
  instructionsMd?: string;
  scriptContent?: string;
  uiHtml?: string;
  hasUi: boolean;
  hasScripts: boolean;
  toolDir: string;
}

export interface CustomToolStorageOptions {
  workspaceDir?: string;
}

export interface ICustomToolProvider {
  loadAll(username: string, options?: CustomToolStorageOptions): FolderCustomTool[];
  get(username: string, name: string, options?: CustomToolStorageOptions): FolderCustomTool | null;
  upsert(username: string, tool: FolderCustomTool, options?: CustomToolStorageOptions): void;
  delete(username: string, name: string, options?: CustomToolStorageOptions): void;
}
