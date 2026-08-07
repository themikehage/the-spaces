// SPDX-License-Identifier: MIT
import { AgentCard, AgentConfigModal } from "@/components/agents/AgentCard";
import { BlueprintDetailModal } from "@/components/agents/BlueprintDetailModal";
import { ExecutionsModal } from "@/components/agents/ExecutionsModal";
import { RegisterModal } from "@/components/agents/RegisterModal";
import { AuthenticatedImage } from "@/components/chat/ImageGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FilterBar } from "@/components/ui/FilterBar";
import { HeaderWithActions } from "@/components/ui/HeaderWithActions";
import { LoadingState } from "@/components/ui/LoadingState";
import { TabsNav } from "@/components/ui/TabsNav";
import { useAgentsPageState } from "@/hooks/useAgentsPageState";
import { AnimatePresence } from "framer-motion";
import { Bot, Plus, Users } from "lucide-react";

interface AgentsPageProps {
  onSelectAgent?: (agent: { id: string; name: string; avatarUrl?: string }) => void;
}

export function AgentsPage({ onSelectAgent }: AgentsPageProps) {
  const state = useAgentsPageState();

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <HeaderWithActions
        title={state.l.pageTitle}
        subtitle={state.l.pageSubtitle}
        icon={Bot}
        count={state.activeTab === "my-agents" ? state.agents.length : undefined}
        tabs={[
          { id: "my-agents", label: state.l.tabMyAgents },
          { id: "gallery", label: state.l.tabGallery },
        ]}
        activeTab={state.activeTab}
        onTabChange={(tab) => state.setActiveTab(tab as "my-agents" | "gallery")}
        onRefresh={state.activeTab === "my-agents" ? state.fetchAgents : state.fetchBlueprints}
        isRefreshing={state.loading}
        primaryAction={
          state.activeTab === "my-agents"
            ? {
                label: "Register Agent",
                icon: Plus,
                onClick: () => state.setShowRegister(true),
              }
            : undefined
        }
      />

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {state.activeTab === "my-agents" ? (
          <>
            {state.loading && <LoadingState size="sm" fullPage={false} className="h-32" />}

            {!state.loading && state.error && (
              <ErrorState error={state.error} onRetry={state.fetchAgents} fullPage={false} className="h-32" />
            )}

            {!state.loading && !state.error && state.agents.length === 0 && (
              <EmptyState
                icon={Users}
                title={state.l.emptyTitle}
                description={state.l.emptyDescription}
                actionLabel="Register Agent"
                onAction={() => state.setShowRegister(true)}
                actionIcon={Plus}
                className="h-48"
              />
            )}

            {!state.loading && !state.error && state.agents.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <AnimatePresence mode="popLayout">
                  {state.agents.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      onDelete={state.stopAgent}
                      onChat={(agentObj) => onSelectAgent?.(agentObj)}
                      onExecutions={(agentObj) => state.setSelectedAgentForExecutions(agentObj)}
                      onConfig={(agentObj) => state.setSelectedAgentForConfig(agentObj)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        ) : (
          /* Gallery tab view */
          <div className="space-y-4">
            <FilterBar
              searchValue={state.gallerySearch}
              onSearchChange={state.setGallerySearch}
              searchPlaceholder={state.l.searchPlaceholder}
            >
              <TabsNav
                variant="pills"
                size="sm"
                tabs={[
                  { id: "all", label: state.l.filterAll },
                  { id: "agent", label: "Agents" },
                  { id: "team", label: "Teams" },
                ]}
                activeTab={state.galleryFilter}
                onChange={(id) => state.setGalleryFilter(id as "all" | "agent" | "team")}
              />
            </FilterBar>

            {/* Blueprints Grid */}
            {state.loadingBlueprints && (
              <LoadingState size="sm" fullPage={false} className="h-32" />
            )}

            {!state.loadingBlueprints && state.filteredBlueprints.length === 0 && (
              <EmptyState
                icon={Users}
                title={state.l.noBlueprintsFound}
                description="Try adjusting your search query or category filter."
                className="h-32"
              />
            )}

            {!state.loadingBlueprints && state.filteredBlueprints.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {state.filteredBlueprints.map((bp) => {
                  const isInstalled = state.agents.some((a) => a.blueprintId === bp.id);
                  const isInstalling = state.installingId === bp.id;

                  return (
                    <div
                      key={bp.id}
                      className="p-4 rounded-xl border border-input bg-card hover:border-primary/30 transition-all flex flex-col justify-between group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          {bp.metadata?.avatarUrl ? (
                            <AuthenticatedImage
                              src={bp.metadata.avatarUrl}
                              alt={bp.metadata?.title || bp.id}
                              className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-input"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                              {(bp.metadata?.title || bp.id)[0]?.toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h3 className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {bp.metadata?.title || bp.id}
                            </h3>
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-muted text-muted-foreground mt-0.5 capitalize">
                              {bp.type}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {bp.metadata?.description}
                        </p>

                        {bp.metadata?.tags && bp.metadata.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {bp.metadata.tags.slice(0, 3).map((tag: string) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 rounded text-[9px] bg-primary/5 text-primary border border-primary/10"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-3 mt-3 border-t border-input/40">
                        <button
                          onClick={() => state.setSelectedBlueprint(bp)}
                          className="flex-1 py-1.5 px-2 text-[10px] font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors cursor-pointer text-center"
                        >
                          {state.l.viewDetails}
                        </button>
                        <button
                          onClick={() => state.handleInstall(bp.id)}
                          disabled={isInstalling || isInstalled}
                          className="flex-1 py-1.5 px-2 text-[10px] font-medium text-background bg-primary hover:bg-primary/90 rounded-lg transition-colors cursor-pointer text-center disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          {isInstalling ? (
                            <span>{state.l.creating}</span>
                          ) : isInstalled ? (
                            <span>Installed</span>
                          ) : (
                            <span>{state.l.useBlueprint}</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {state.showRegister && (
        <RegisterModal
          onClose={() => state.setShowRegister(false)}
          onSubmit={state.handleRegisterOrUpdate}
        />
      )}

      {state.selectedAgentForExecutions && (
        <ExecutionsModal
          agent={state.selectedAgentForExecutions}
          onClose={() => state.setSelectedAgentForExecutions(null)}
        />
      )}

      {state.selectedAgentForConfig && (
        <AgentConfigModal
          agent={state.selectedAgentForConfig}
          onClose={() => state.setSelectedAgentForConfig(null)}
        />
      )}

      {state.selectedBlueprint && (
        <BlueprintDetailModal
          blueprint={state.selectedBlueprint}
          onClose={() => state.setSelectedBlueprint(null)}
          onInstall={state.handleInstall}
          isInstalled={state.agents.some((a) => a.blueprintId === state.selectedBlueprint?.id)}
          installing={state.installingId === state.selectedBlueprint?.id}
        />
      )}
    </div>
  );
}
