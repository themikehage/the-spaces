// SPDX-License-Identifier: MIT
import { useToast } from "@/contexts/ToastContext";
import { useLiterals } from "@/lib";
import { mcpService } from "@/lib/api/mcp.service";
import { literals } from "@/pages/MCPMarketplacePage.literals";
import { useCallback, useEffect, useState } from "react";
import type { McpCatalogItem, McpServerConfig } from "shared";

export function useMCPMarketplaceState() {
  const { addToast } = useToast();
  const l = useLiterals(literals);
  const [activeTab, setActiveTab] = useState<"gallery" | "custom" | "raw">("gallery");
  const [catalog, setCatalog] = useState<McpCatalogItem[]>([]);
  const [servers, setServers] = useState<McpServerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const [installingId, setInstallingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteServerId, setPendingDeleteServerId] = useState<string | null>(null);
  const [deletingServer, setDeletingServer] = useState(false);

  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);

  const [rawConfigStr, setRawConfigStr] = useState("");
  const [rawConfigError, setRawConfigError] = useState("");
  const [savingRaw, setSavingRaw] = useState(false);
  const [rawLoaded, setRawLoaded] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [catalogData, serversData] = await Promise.all([
        mcpService.fetchMcpCatalog(),
        mcpService.fetchMcpServers(),
      ]);

      setCatalog((catalogData as any)?.catalog || catalogData || []);
      setServers((serversData as any)?.servers || serversData || []);
    } catch (err: any) {
      setError(err.message || "Failed to load MCP Marketplace data");
      addToast("error", err.message || "Fallo al inicializar datos de MCP");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const hasConnecting = servers.some((s) => s.status === "connecting");
    if (!hasConnecting) return;

    const interval = setInterval(async () => {
      try {
        const data = await mcpService.fetchMcpServers();
        setServers((data as any)?.servers || data || []);
      } catch (e) {
        console.error("Failed to pool servers status:", e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [servers]);

  const categories = ["All", ...Array.from(new Set(catalog.map((item) => item.category)))];
  const customServers = servers.filter((s) => !s.isBuiltin);

  const getServerConfig = (catalogId: string) => {
    return servers.find((s) => s.id === catalogId);
  };

  const handleInstallBuiltin = async (catalogId: string) => {
    if (installingId) return;
    setInstallingId(catalogId);
    try {
      const data = await mcpService.installMcpCatalogItem(catalogId);

      setServers((prev) => {
        const filtered = prev.filter((s) => s.id !== catalogId);
        return [...filtered, data.server];
      });

      addToast("success", `${data.server.name} instalado con éxito. Iniciando conexión...`);
    } catch (err: any) {
      addToast("error", err.message || "Fallo en la instalación");
    } finally {
      setInstallingId(null);
    }
  };

  const handleToggleEnabled = async (serverId: string, enabled: boolean) => {
    const srv = servers.find((s) => s.id === serverId);
    if (!srv) return;

    setServers((prev) => prev.map((s) => (s.id === serverId ? { ...s, enabled } : s)));

    try {
      const data = await mcpService.updateMcpServer(serverId, { ...srv, enabled });
      setServers((prev) => prev.map((s) => (s.id === serverId ? data.server : s)));
      addToast("info", `${srv.name} ha sido ${enabled ? "habilitado" : "deshabilitado"}.`);
    } catch (err: any) {
      setServers((prev) => prev.map((s) => (s.id === serverId ? { ...s, enabled: !enabled } : s)));
      addToast("error", err.message || "Error al actualizar estado");
    }
  };

  const handleConnect = async (serverId: string) => {
    const srv = servers.find((s) => s.id === serverId);
    try {
      const data = await mcpService.connectMcpServer(serverId);
      setServers((prev) => prev.map((s) => (s.id === serverId ? data.server : s)));
      addToast("info", `Conectando con ${srv?.name || serverId}...`);
    } catch (err: any) {
      addToast("error", err.message || "Error de conexión");
    }
  };

  const handleDisconnect = async (serverId: string) => {
    const srv = servers.find((s) => s.id === serverId);
    try {
      const data = await mcpService.disconnectMcpServer(serverId);
      setServers((prev) => prev.map((s) => (s.id === serverId ? data.server : s)));
      addToast("info", `${srv?.name || serverId} desconectado.`);
    } catch (err: any) {
      addToast("error", err.message || "Error al desconectar");
    }
  };

  const executeDeleteServer = async () => {
    if (!pendingDeleteServerId) return;
    setDeletingServer(true);
    try {
      await mcpService.deleteMcpServer(pendingDeleteServerId);

      const srv = servers.find((s) => s.id === pendingDeleteServerId);
      if (srv && srv.isBuiltin) {
        setServers((prev) =>
          prev.map((s) =>
            s.id === pendingDeleteServerId
              ? { ...s, installed: false, enabled: false, status: "disconnected" }
              : s,
          ),
        );
      } else {
        setServers((prev) => prev.filter((s) => s.id !== pendingDeleteServerId));
      }
      addToast("success", `${srv?.name || pendingDeleteServerId} desinstalado.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast("error", msg || "Error al eliminar servidor");
    } finally {
      setDeletingServer(false);
      setShowDeleteConfirm(false);
      setPendingDeleteServerId(null);
    }
  };

  const handleDeleteServer = (serverId: string) => {
    setPendingDeleteServerId(serverId);
    setShowDeleteConfirm(true);
  };

  const handleTestConnection = async (config: McpServerConfig) => {
    return await mcpService.testMcpConnection(config);
  };

  const handleTestServer = async (server: McpServerConfig) => {
    if (testingId) return;
    setTestingId(server.id);
    addToast("info", `Validando herramientas de ${server.name}...`);
    try {
      const data = await handleTestConnection(server);
      if (data.success) {
        addToast("success", `${l.validationSuccess} ${data.tools.join(", ")}`);
        fetchData();
      } else {
        addToast(
          "error",
          `${l.validationFailed} ${server.name}: ${data.error || "El proceso no respondió."}`,
        );
      }
    } catch (err: any) {
      addToast("error", err.message || "Fallo en la prueba de conexión");
    } finally {
      setTestingId(null);
    }
  };

  const handleAddCustom = async (config: McpServerConfig) => {
    try {
      const data = await mcpService.createMcpServer(config);
      setServers((prev) => [...prev.filter((s) => s.id !== data.server.id), data.server]);
      setIsAddingCustom(false);
      setEditingCustomId(null);
      addToast("success", `${data.server.name} agregado.`);
    } catch (err: any) {
      addToast("error", err.message || "Error al agregar servidor");
    }
  };

  const handleEditCustom = async (config: McpServerConfig) => {
    const targetId = editingCustomId || config.id;
    if (!targetId) return;
    try {
      const data = await mcpService.updateMcpServer(targetId, { ...config, id: targetId });
      setServers((prev) => prev.map((s) => (s.id === targetId ? data.server : s)));
      setEditingCustomId(null);
      addToast("success", `${data.server.name} actualizado.`);
    } catch (err: any) {
      addToast("error", err.message || "Error al actualizar servidor");
    }
  };

  const handleCancelCustom = () => {
    setIsAddingCustom(false);
    setEditingCustomId(null);
  };

  const handleEditCustomServer = (serverId: string) => {
    setEditingCustomId(serverId);
    setIsAddingCustom(false);
  };

  const loadRawConfig = useCallback(async () => {
    if (rawLoaded) return;
    setRawConfigError("");
    try {
      const data = await mcpService.fetchMcpState();
      setRawConfigStr(JSON.stringify(data, null, 2));
    } catch {
      setRawConfigError("Error al cargar la configuración");
      setRawConfigStr("{}");
    }
    setRawLoaded(true);
  }, [rawLoaded]);

  useEffect(() => {
    if (activeTab === "raw") {
      loadRawConfig();
    }
  }, [activeTab, loadRawConfig]);

  const handleSaveRawConfig = async () => {
    setSavingRaw(true);
    setRawConfigError("");
    try {
      const parsed = JSON.parse(rawConfigStr);
      if (!parsed.mcpServers || typeof parsed.mcpServers !== "object") {
        throw new Error("La configuración debe tener un objeto 'mcpServers'");
      }
      for (const [key, val] of Object.entries(parsed.mcpServers)) {
        if (typeof val !== "object" || val === null) {
          throw new Error(`Entrada inválida para el servidor "${key}"`);
        }
      }
      await mcpService.updateMcpConfig(parsed);
      addToast("success", "Configuración guardada.");
      setRawLoaded(false);
      fetchData();
    } catch (err: any) {
      setRawConfigError(err.message || "Error al guardar");
    } finally {
      setSavingRaw(false);
    }
  };

  const filteredCatalog = catalog.filter(
    (item) => selectedCategory === "All" || item.category === selectedCategory,
  );

  return {
    l,
    activeTab,
    setActiveTab,
    catalog,
    servers,
    loading,
    error,
    selectedCategory,
    setSelectedCategory,
    installingId,
    testingId,
    showDeleteConfirm,
    setShowDeleteConfirm,
    setPendingDeleteServerId,
    deletingServer,
    isAddingCustom,
    setIsAddingCustom,
    editingCustomId,
    setEditingCustomId,
    rawConfigStr,
    setRawConfigStr,
    rawConfigError,
    setRawConfigError,
    savingRaw,
    categories,
    customServers,
    getServerConfig,
    handleInstallBuiltin,
    handleToggleEnabled,
    handleConnect,
    handleDisconnect,
    executeDeleteServer,
    handleDeleteServer,
    handleTestConnection,
    handleTestServer,
    handleAddCustom,
    handleEditCustom,
    handleCancelCustom,
    handleEditCustomServer,
    handleSaveRawConfig,
    filteredCatalog,
  };
}
