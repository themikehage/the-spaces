// SPDX-License-Identifier: MIT
import { type EntityType } from "shared";
import { cascadeConfigLoader } from "../config";
import type { ICustomToolProvider } from "../ports/custom-tool-provider.port";
import { folderCustomToolStorage } from "./folder-storage";
import { createCustomToolRuntime, type CustomToolContext } from "./runtime";

export interface ResolveCustomToolsParams {
  username: string;
  context: CustomToolContext;
  entityType?: EntityType;
  entityId?: string;
  provider?: ICustomToolProvider;
}

export async function resolveCustomToolsForSession(
  params: ResolveCustomToolsParams,
): Promise<ReturnType<typeof createCustomToolRuntime>[]> {
  const { username, context, entityType = "global", entityId = "", provider = folderCustomToolStorage } = params;

  const resolvedConfig = await cascadeConfigLoader.load(username, { type: entityType as any, id: entityId });
  const addList = resolvedConfig.toolOverrides?.add ?? [];
  const removeSet = new Set(resolvedConfig.toolOverrides?.remove ?? []);

  const workspaceDir = context.cwd || (typeof context.workspaceDir === "string" ? context.workspaceDir : undefined);
  const allFolderTools = provider.loadAll(username, { workspaceDir });

  const activeTools = allFolderTools.filter((t) => {
    if (t.definition.enabled === false) return false;
    if (removeSet.has(t.definition.name)) return false;
    if (addList.length > 0 && !addList.includes(t.definition.name)) return false;
    return true;
  });

  return activeTools.map((t) => createCustomToolRuntime(t.definition, context, t.toolDir));
}
