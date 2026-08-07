import { TabsNav } from "@/components/ui/TabsNav";
import { MCPCard } from "@/components/mcp/MCPCard";
import { MCPCustomForm } from "@/components/mcp/MCPCustomForm";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useMCPMarketplaceState } from "@/hooks/useMCPMarketplaceState";
import { AnimatePresence, motion } from "framer-motion";
import { Code, Plus } from "lucide-react";
import type { McpServerConfig } from "shared";

export function MCPMarketplacePage() {
  const state = useMCPMarketplaceState();

  const handleTabChange = (id: string) => {
    const tab = id as "gallery" | "custom" | "raw";
    state.setActiveTab(tab);
    if (tab === "custom") {
      state.setIsAddingCustom(false);
      state.setEditingCustomId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-background text-foreground relative">
      <div className="flex items-center border-b border-border/80 px-6 py-3 flex-shrink-0 bg-card/10">
        <TabsNav
          variant="pills"
          tabs={[
            { id: "gallery", label: state.l.tabGallery },
            { id: "custom", label: state.l.tabCustom },
            { id: "raw", label: state.l.rawEditor, icon: Code },
          ]}
          activeTab={state.activeTab}
          onChange={handleTabChange}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        {state.error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-error rounded-xl text-xs font-mono">
            {state.error}
          </div>
        )}

        {state.loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-card/50 border border-input/10 h-48 rounded-xl animate-pulse p-5 space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted/20" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted/20 w-1/2 rounded" />
                    <div className="h-3 bg-muted/20 w-1/4 rounded" />
                  </div>
                </div>
                <div className="h-16 bg-muted/20 w-full rounded" />
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* Gallery Tab */}
            {state.activeTab === "gallery" && (
              <motion.div
                key="gallery"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* Category filters */}
                <div className="flex flex-wrap gap-2">
                  {state.categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => state.setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                        state.selectedCategory === cat
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-card/40 border-input/20 text-muted-foreground hover:text-foreground hover:border-input/40"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {state.filteredCatalog.map((item) => {
                    const activeConfig = state.getServerConfig(item.id);
                    const serverConfig: McpServerConfig = activeConfig || {
                      id: item.id,
                      name: item.name,
                      description: item.description,
                      transport: item.isHttp ? ("http" as const) : ("stdio" as const),
                      command: item.command,
                      args: item.args,
                      env: item.env,
                      url: item.url,
                      installed: false,
                      enabled: false,
                      isBuiltin: true,
                      category: item.category,
                      icon: item.icon,
                      status: "disconnected",
                      tools: [],
                    };

                    const isInstalling = state.installingId === item.id;
                    const isTesting = state.testingId === item.id;

                    return (
                      <div key={item.id} className="relative">
                        <MCPCard
                          server={serverConfig}
                          onInstall={() => state.handleInstallBuiltin(item.id)}
                          onToggleEnabled={(enabled) => state.handleToggleEnabled(item.id, enabled)}
                          onConnect={() => state.handleConnect(item.id)}
                          onDisconnect={() => state.handleDisconnect(item.id)}
                          onDelete={() => state.handleDeleteServer(item.id)}
                          onTest={() => state.handleTestServer(serverConfig)}
                          onEdit={
                            activeConfig
                              ? () => {
                                  state.setEditingCustomId(item.id);
                                  state.setActiveTab("custom");
                                }
                              : undefined
                          }
                        />
                        {isInstalling && (
                          <div className="absolute inset-0 bg-background/60 backdrop-blur-xs flex flex-col items-center justify-center rounded-xl border border-input/25 z-10 space-y-2 animate-fade-in">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                              {state.l.installing}
                            </span>
                          </div>
                        )}
                        {isTesting && (
                          <div className="absolute inset-0 bg-background/60 backdrop-blur-xs flex flex-col items-center justify-center rounded-xl border border-input/25 z-10 space-y-2 animate-fade-in">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                              {state.l.validating}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Custom Tab */}
            {state.activeTab === "custom" && (
              <motion.div
                key="custom"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* Add / Edit Form */}
                {(state.isAddingCustom || state.editingCustomId) && (
                  <MCPCustomForm
                    initialConfig={
                      state.editingCustomId
                        ? state.servers.find((s) => s.id === state.editingCustomId) || null
                        : null
                    }
                    onSubmit={
                      state.editingCustomId ? state.handleEditCustom : state.handleAddCustom
                    }
                    onCancel={state.handleCancelCustom}
                    onTest={state.handleTestConnection}
                  />
                )}

                {/* Custom servers list */}
                {!state.isAddingCustom && !state.editingCustomId && (
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-foreground font-semibold text-sm">
                        {state.l.customServers}
                      </h3>
                      <p className="text-muted-foreground text-[11px] mt-0.5">
                        {state.customServers.length === 1
                          ? "1 servidor personalizado configurado."
                          : `${state.customServers.length} servidores personalizados configurados.`}
                      </p>
                    </div>
                    <button
                      onClick={() => state.setIsAddingCustom(true)}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus size={12} />
                      {state.l.addCustomServer}
                    </button>
                  </div>
                )}

                {state.customServers.length === 0 &&
                  !state.isAddingCustom &&
                  !state.editingCustomId && (
                    <div className="flex flex-col items-center justify-center py-20 bg-card/25 border border-input/10 rounded-2xl p-6 text-center space-y-4">
                      <div className="w-12 h-12 bg-background border border-input/10 flex items-center justify-center text-2xl rounded-2xl shadow-inner select-none">
                        🔌
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">
                          {state.l.noCustomServers}
                        </h4>
                        <p className="text-muted-foreground text-xs max-w-sm mt-1">
                          {state.l.noCustomServersDesc}
                        </p>
                      </div>
                      <button
                        onClick={() => state.setIsAddingCustom(true)}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition-all cursor-pointer"
                      >
                        {state.l.addCustomServer}
                      </button>
                    </div>
                  )}

                {state.customServers.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {state.customServers.map((srv) => {
                      const isTesting = state.testingId === srv.id;
                      const isEditing = state.editingCustomId === srv.id;
                      return (
                        <div
                          key={srv.id}
                          className={`relative ${isEditing ? "ring-2 ring-primary/40 rounded-xl" : ""}`}
                        >
                          <MCPCard
                            server={srv}
                            onToggleEnabled={(enabled) =>
                              state.handleToggleEnabled(srv.id, enabled)
                            }
                            onConnect={() => state.handleConnect(srv.id)}
                            onDisconnect={() => state.handleDisconnect(srv.id)}
                            onDelete={() => state.handleDeleteServer(srv.id)}
                            onEdit={() => state.handleEditCustomServer(srv.id)}
                            onTest={() => state.handleTestServer(srv)}
                          />
                          {isTesting && (
                            <div className="absolute inset-0 bg-background/60 backdrop-blur-xs flex flex-col items-center justify-center rounded-xl border border-input/25 z-10 space-y-2 animate-fade-in">
                              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                                {state.l.validating}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* Raw Config Tab */}
            {state.activeTab === "raw" && (
              <motion.div
                key="raw"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="max-w-2xl"
              >
                <div className="bg-card rounded-xl border border-input/20 p-5 space-y-4">
                  <div>
                    <h3 className="text-foreground font-semibold text-sm">
                      {state.l.rawEditorTitle}
                    </h3>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Edita directamente el archivo mcp-servers.json completo.
                    </p>
                  </div>

                  {state.rawConfigError && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 text-error rounded-lg text-xs font-mono">
                      {state.rawConfigError}
                    </div>
                  )}

                  <textarea
                    value={state.rawConfigStr}
                    onChange={(e) => state.setRawConfigStr(e.target.value)}
                    className="w-full h-72 px-4 py-3 bg-background border border-input/40 rounded-xl text-foreground outline-none focus:border-primary text-xs font-mono resize-y"
                    spellCheck={false}
                  />

                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => {
                        state.setRawConfigStr("{}");
                        state.setRawConfigError("");
                      }}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-card-hover/20 text-muted-foreground hover:text-foreground transition-all cursor-pointer border border-input/20"
                    >
                      Reiniciar
                    </button>
                    <button
                      onClick={state.handleSaveRawConfig}
                      disabled={state.savingRaw}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    >
                      {state.savingRaw && (
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                      )}
                      Guardar Configuración
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
      <ConfirmModal
        open={state.showDeleteConfirm}
        onClose={() => {
          state.setShowDeleteConfirm(false);
          state.setPendingDeleteServerId(null);
        }}
        onConfirm={state.executeDeleteServer}
        title="Uninstall MCP Server"
        message="Are you sure you want to uninstall or delete this MCP server?"
        confirmLabel="Uninstall"
        destructive
        loading={state.deletingServer}
      />
    </div>
  );
}
