// SPDX-License-Identifier: MIT
import { useEntityCustomTools } from "@/hooks/useEntityCustomTools";
import { Check, RefreshCw, Save, Wrench } from "lucide-react";
import type { EntityType } from "shared";

interface Props {
  entityType: EntityType;
  entityId?: string;
  title?: string;
}

export function EntityCustomToolsEditor({ entityType, entityId = "", title }: Props) {
  const {
    availableTools,
    scopeConfig,
    toolsList,
    agentAdd,
    agentRemove,
    isDirty,
    isLoading,
    isSaving,
    error,
    toggleTool,
    saveChanges,
    refresh,
  } = useEntityCustomTools(entityType, entityId);

  if (entityType !== "global" && !entityId) return null;

  return (
    <div className="space-y-3 bg-bg border border-input rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accent/10 text-accent">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              {title || "Custom Tools Configuration"}
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Enable or disable custom tools for this entity or manage inheritance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {scopeConfig && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-accent/15 text-accent border border-accent/20">
              {scopeConfig.resolved.length} active
            </span>
          )}

          <button
            type="button"
            onClick={refresh}
            disabled={isLoading || isSaving}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-md hover:bg-surface-hover"
            title="Refresh custom tools"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          {isDirty && (
            <button
              type="button"
              onClick={() => saveChanges()}
              disabled={isSaving}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-2 bg-error/10 border border-error/20 text-error rounded-xl text-xs font-medium">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
          Loading custom tools configuration...
        </div>
      ) : availableTools.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-input rounded-xl bg-card/30">
          <Wrench className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-xs font-semibold text-foreground">No custom tools registered</p>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto">
            Create custom tools in chat using{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-[10px]">manage_custom_tools</code>.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
          {availableTools.map((tool) => {
            let isActive = false;
            let sourceBadge: {
              label: string;
              variant: "global" | "team" | "project" | "agent" | "removed" | "none";
            } = {
              label: "",
              variant: "none",
            };

            if (entityType !== "agent") {
              isActive = toolsList.includes(tool.name);
              const isGlobalInherited =
                entityType !== "global" && (scopeConfig?.global || []).includes(tool.name);
              if (isGlobalInherited) {
                sourceBadge = { label: "Global", variant: "global" };
              }
            } else {
              const isGlobal = (scopeConfig?.global || []).includes(tool.name);
              const isTeam = (scopeConfig?.team || []).includes(tool.name);
              const isProject = (scopeConfig?.project || []).includes(tool.name);

              const isInherited = isGlobal || isTeam || isProject;
              const isRemoved = agentRemove.includes(tool.name);
              const isAdded = agentAdd.includes(tool.name);

              isActive = (isInherited && !isRemoved) || (!isInherited && isAdded);

              if (isRemoved) {
                sourceBadge = { label: "Disabled Override", variant: "removed" };
              } else if (isAdded) {
                sourceBadge = { label: "Agent Add", variant: "agent" };
              } else if (isProject) {
                sourceBadge = { label: "Inherited (Project)", variant: "project" };
              } else if (isTeam) {
                sourceBadge = { label: "Inherited (Team)", variant: "team" };
              } else if (isGlobal) {
                sourceBadge = { label: "Inherited (Global)", variant: "global" };
              }
            }

            return (
              <div
                key={tool.name}
                className={`flex items-start justify-between p-2.5 rounded-xl border transition-all ${
                  isActive
                    ? "bg-accent/5 border-accent/30"
                    : "bg-card/40 hover:bg-card border-input/40 opacity-75"
                }`}
              >
                <div className="flex items-start gap-2.5 flex-1 min-w-0 pr-2">
                  <button
                    type="button"
                    onClick={() => toggleTool(tool.name)}
                    disabled={isSaving}
                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 ${
                      isActive
                        ? "bg-accent border-accent text-white"
                        : "border-input bg-bg hover:border-accent/50"
                    }`}
                  >
                    {isActive && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-foreground truncate">
                        {tool.label || tool.name}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        ({tool.name})
                      </span>

                      <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase bg-muted text-muted-foreground border border-input/30">
                        {tool.executeType}
                      </span>

                      {sourceBadge.variant !== "none" && (
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                            sourceBadge.variant === "removed"
                              ? "bg-error/15 text-error border border-error/20"
                              : sourceBadge.variant === "agent"
                                ? "bg-primary/15 text-primary border border-primary/20"
                                : "bg-accent/15 text-accent border border-accent/20"
                          }`}
                        >
                          {sourceBadge.label}
                        </span>
                      )}

                      {!tool.enabled && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase bg-warning/15 text-warning border border-warning/20">
                          Globally Disabled
                        </span>
                      )}
                    </div>

                    {tool.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 leading-normal">
                        {tool.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
