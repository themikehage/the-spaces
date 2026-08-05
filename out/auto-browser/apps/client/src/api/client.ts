export type Session = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

const BASE = "";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export type ModelDefinition = {
  id: string;
  name: string;
};

export type ProviderConfig = {
  id: string;
  name: string;
  type: "openai-compatible";
  baseUrl?: string;
  apiKey?: string;
  models: ModelDefinition[];
  activeModelId: string;
  enabled: boolean;
  isDefault: boolean;
};

export const api = {
  sessions: {
    list: () => apiFetch<Session[]>("/sessions"),
    getMessages: (id: string) => apiFetch<import("./ws.ts").Message[]>(`/sessions/${id}/messages`),
    create: (name?: string) =>
      apiFetch<Session>("/sessions", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    delete: (id: string) => apiFetch<{ ok: boolean }>(`/sessions/${id}`, { method: "DELETE" }),
  },
  providers: {
    list: () => apiFetch<ProviderConfig[]>("/providers"),
    save: (data: Partial<ProviderConfig>) =>
      apiFetch<ProviderConfig>("/providers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (id: string) => apiFetch<{ ok: boolean }>(`/providers/${id}`, { method: "DELETE" }),
    test: (data: { baseUrl?: string; apiKey?: string; modelId: string; providerId?: string }) =>
      apiFetch<{ ok: boolean; status: number; message?: string; error?: string }>(
        "/providers/test",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      ),
  },
};
