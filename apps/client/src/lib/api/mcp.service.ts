// SPDX-License-Identifier: MIT
import { apiFetch } from "@/lib/api";

async function fetchMcpCatalog(): Promise<any[]> {
  const res = await apiFetch("/api/mcp/catalog");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.catalog || data;
}

async function fetchMcpServers(): Promise<any[]> {
  const res = await apiFetch("/api/mcp/servers");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.servers || data;
}

async function installMcpCatalogItem(catalogId: string): Promise<any> {
  const res = await apiFetch(`/api/mcp/catalog/${catalogId}/install`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function createMcpServer(server: any): Promise<any> {
  const res = await apiFetch("/api/mcp/servers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(server),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function updateMcpServer(id: string, updates: any): Promise<any> {
  const res = await apiFetch(`/api/mcp/servers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function deleteMcpServer(id: string): Promise<void> {
  const res = await apiFetch(`/api/mcp/servers/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

async function connectMcpServer(id: string): Promise<any> {
  const res = await apiFetch(`/api/mcp/servers/${id}/connect`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function disconnectMcpServer(id: string): Promise<any> {
  const res = await apiFetch(`/api/mcp/servers/${id}/disconnect`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function testMcpConnection(serverConfig: any): Promise<any> {
  const res = await apiFetch("/api/mcp/servers/test-connection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(serverConfig),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function fetchMcpState(): Promise<any> {
  const res = await apiFetch("/api/mcp");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function updateMcpConfig(config: any): Promise<any> {
  const res = await apiFetch("/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const mcpService = {
  fetchMcpCatalog,
  fetchMcpServers,
  installMcpCatalogItem,
  createMcpServer,
  updateMcpServer,
  deleteMcpServer,
  connectMcpServer,
  disconnectMcpServer,
  testMcpConnection,
  fetchMcpState,
  updateMcpConfig,
};
