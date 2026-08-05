// SPDX-License-Identifier: MIT
import { AgentCard, AgentConfigModal } from "@/components/agents/AgentCard";
import { BlueprintDetailModal } from "@/components/agents/BlueprintDetailModal";
import { ExecutionsModal } from "@/components/agents/ExecutionsModal";
import { RegisterModal } from "@/components/agents/RegisterModal";
import { AuthenticatedImage } from "@/components/chat/ImageGrid";
import { useAgentsPageState } from "@/hooks/useAgentsPageState";
import { AnimatePresence } from "framer-motion";
import { AlertCircle, Plus, RefreshCw, Search, Users } from "lucide-react";

interface AgentsPageProps {
  onSelectAgent?: (agent: { id: string; name: string; avatarUrl?: string }) => void;
}

export function AgentsPage({ onSelectAgent }: AgentsPageProps) {
  const state = useAgentsPageState();

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
        <div>
          <h1 className="text-base font-semibold text-foreground">{state.l.pageTitle}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{state.l.pageSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {state.activeTab === "my-agents" ? (
            <>
              <button
                onClick={state.fetchAgents}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-card-hover rounded-lg transition-colors"
                title={state.l.refresh}
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={() => {
                  state.setShowRegister(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-background rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus size={12} />
                Register Agent
              </button>
            </>
          ) : (
            <button
              onClick={state.fetchBlueprints}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-card-hover rounded-lg transition-colors"
              title={state.l.refresh}
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-border px-6 flex-shrink-0 bg-card/10">
        <button
          onClick={() => state.setActiveTab("my-agents")}
          className={`px-4 py-3 text-xs font-medium border-b-2 transition-all cursor-pointer ${
            state.activeTab === "my-agents"
              ? "border-primary text-foreground animate-none"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {state.l.tabMyAgents}
        </button>
        <button
          onClick={() => state.setActiveTab("gallery")}
          className={`px-4 py-3 text-xs font-medium border-b-2 transition-all cursor-pointer ${
            state.activeTab === "gallery"
              ? "border-primary text-foreground animate-none"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {state.l.tabGallery}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {state.activeTab === "my-agents" ? (
          <>
            {state.loading && (
              <div className="flex items-center justify-center h-32">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!state.loading && state.error && (
              <div className="flex flex-col items-center justify-center h-32 text-destructive text-sm gap-2">
                <AlertCircle size={20} className="opacity-60" />
                {state.error}
              </div>
            )}

            {!state.loading && !state.error && state.agents.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                <div className="w-12 h-12 rounded-2xl bg-card border border-input flex items-center justify-center">
                  <Users size={20} className="text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">{state.l.emptyTitle}</p>
                  <p className="text-xs mt-1">{state.l.emptyDescription}</p>
                </div>
                <button
                  onClick={() => {
                    state.setShowRegister(true);
                  }}
                  className="px-4 py-2 text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors"
                >
                  Register Agent
                </button>
              </div>
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
            {/* Search & Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder={state.l.searchPlaceholder}
                  value={state.gallerySearch}
                  onChange={(e) => state.setGallerySearch(e.target.value)}
                  className="w-full bg-card border border-input rounded-xl pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
                <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
              </div>
              <div className="flex gap-1.5 border border-input rounded-xl p-1 bg-card/40 flex-shrink-0 self-start">
                <button
                  onClick={() => state.setGalleryFilter("all")}
                  className={`px-3 py-1 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                    state.galleryFilter === "all"
                      ? "bg-primary text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {state.l.filterAll}
                </button>
                <button
                  onClick={() => state.setGalleryFilter("agent")}
                  className={`px-3 py-1 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                    state.galleryFilter === "agent"
                      ? "bg-primary text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {state.l.filterAgents}
                </button>
                <button
                  onClick={() => state.setGalleryFilter("team")}
                  className={`px-3 py-1 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                    state.galleryFilter === "team"
                      ? "bg-primary text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {state.l.filterChannels}
                </button>
              </div>
            </div>

            {state.loadingBlueprints && state.blueprints.length === 0 ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : state.blueprintsError && state.blueprints.length === 0 ? (
              <div className="text-center py-10 text-destructive text-sm bg-card border border-input rounded-xl p-4">
                {state.blueprintsError}
              </div>
            ) : state.filteredBlueprints.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground text-xs bg-card border border-input rounded-xl">
                No templates found.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {state.filteredBlueprints.map((item) => {
                  const isInstalled =
                    item.type === "agent"
                      ? state.agents.some((a) => a.blueprintId === item.id || a.id === item.id)
                      : state.teams.some((c) => c.blueprintId === item.id || c.id === item.id);

                  return (
                    <div
                      key={item.id}
                      className="bg-card border border-input rounded-xl p-4 flex flex-col gap-3 justify-between hover:border-primary/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {item.hasIcon ? (
                            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-background/50 flex items-center justify-center border border-input">
                              <AuthenticatedImage
                                src={`/api/gallery/blueprints/${item.id}/icon`}
                                alt={item.metadata.title}
                                className="w-10 h-10 object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg flex-shrink-0 bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20">
                              {item.metadata.title.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground text-sm truncate">
                              {item.metadata.title}
                            </h3>
                            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mt-0.5">
                              {item.type === "agent"
                                ? state.l.filterAgents
                                : state.l.filterChannels}
                            </p>
                          </div>
                        </div>
                        {isInstalled && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary flex-shrink-0">
                            {state.l.installed}
                          </span>
                        )}
                      </div>

                      <p className="text-muted-foreground text-xs line-clamp-2 h-8 leading-normal">
                        {item.metadata.description}
                      </p>

                      <div className="flex flex-wrap gap-1">
                        {item.metadata.tags.slice(0, 3).map((t: string) => (
                          <span
                            key={t}
                            className="text-[9px] bg-background/50 border border-input px-1.5 py-0.5 rounded-md text-muted-foreground font-medium"
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between border-t border-input pt-3 mt-1 gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {state.l.author}:{" "}
                          <strong className="text-foreground">{item.metadata.author}</strong>
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => state.setSelectedBlueprint(item)}
                            className="px-2.5 py-1 text-[10px] font-medium bg-card-hover hover:bg-card-hover/80 text-foreground border border-input rounded-lg transition-colors cursor-pointer"
                          >
                            {state.l.viewDetail}
                          </button>
                          <button
                            disabled={isInstalled || state.installingId === item.id}
                            onClick={() => state.handleInstall(item.id)}
                            className={`px-2.5 py-1 text-[10px] font-medium rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              isInstalled
                                ? "bg-background text-muted-foreground border border-input cursor-not-allowed"
                                : "bg-primary text-background hover:bg-primary/90"
                            }`}
                          >
                            {state.installingId === item.id ? (
                              <div className="w-2.5 h-2.5 border border-background border-t-transparent rounded-full animate-spin" />
                            ) : isInstalled ? (
                              state.l.installed
                            ) : (
                              state.l.install
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {state.showRegister && (
          <RegisterModal
            onClose={() => {
              state.setShowRegister(false);
            }}
            onSubmit={state.handleRegisterOrUpdate}
            onUploadAvatar={state.uploadAvatar}
            onDeleteAvatar={state.deleteAvatar}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.selectedAgentForExecutions && (
          <ExecutionsModal
            agent={state.selectedAgentForExecutions}
            onClose={() => state.setSelectedAgentForExecutions(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.selectedAgentForConfig && (
          <AgentConfigModal
            agent={state.selectedAgentForConfig}
            onClose={() => state.setSelectedAgentForConfig(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.selectedBlueprint && (
          <BlueprintDetailModal
            blueprint={state.selectedBlueprint}
            onClose={() => state.setSelectedBlueprint(null)}
            onInstall={state.handleInstall}
            isInstalled={
              state.selectedBlueprint.type === "agent"
                ? state.agents.some(
                    (a) =>
                      a.blueprintId === state.selectedBlueprint.id ||
                      a.id === state.selectedBlueprint.id,
                  )
                : state.teams.some(
                    (c) =>
                      c.blueprintId === state.selectedBlueprint.id ||
                      c.id === state.selectedBlueprint.id,
                  )
            }
            installing={state.installingId === state.selectedBlueprint.id}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
