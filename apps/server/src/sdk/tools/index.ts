// SPDX-License-Identifier: MIT
import { legacyToolToBaseTool, type BaseTool } from "@spaces/core";
import {
  createBashToolDefinition,
  createEditToolDefinition,
  createFindToolDefinition,
  createGrepToolDefinition,
  createLsToolDefinition,
  createReadToolDefinition,
  createWriteToolDefinition,
} from "../../ai";
import { createWebFetchTool } from "../../core/tools/web-fetch";

export function createBashTool(workspaceDir: string): BaseTool {
  return legacyToolToBaseTool(createBashToolDefinition(workspaceDir));
}

export function createReadTool(workspaceDir: string): BaseTool {
  return legacyToolToBaseTool(createReadToolDefinition(workspaceDir));
}

export function createWriteTool(workspaceDir: string): BaseTool {
  return legacyToolToBaseTool(createWriteToolDefinition(workspaceDir));
}

export function createEditTool(workspaceDir: string): BaseTool {
  return legacyToolToBaseTool(createEditToolDefinition(workspaceDir));
}

export function createGrepTool(workspaceDir: string): BaseTool {
  return legacyToolToBaseTool(createGrepToolDefinition(workspaceDir));
}

export function createFindTool(workspaceDir: string): BaseTool {
  return legacyToolToBaseTool(createFindToolDefinition(workspaceDir));
}

export function createLsTool(workspaceDir: string): BaseTool {
  return legacyToolToBaseTool(createLsToolDefinition(workspaceDir));
}

export function createWebFetchSdkTool(username = "default"): BaseTool {
  return legacyToolToBaseTool(createWebFetchTool({ username }));
}
