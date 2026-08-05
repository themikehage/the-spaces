import { useState, useCallback, useEffect } from "react";
import { api, type ProviderConfig } from "../api/client.ts";

export function useProviders() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.providers.list();
      setProviders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load providers");
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(
    async (data: Partial<ProviderConfig>): Promise<ProviderConfig | null> => {
      try {
        const updated = await api.providers.save(data);
        setProviders((prev) => {
          const idx = prev.findIndex((p) => p.id === updated.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = updated;
            return next;
          }
          return [...prev, updated];
        });
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save provider");
        return null;
      }
    },
    [],
  );

  const remove = useCallback(async (id: string): Promise<void> => {
    try {
      await api.providers.delete(id);
      setProviders((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete provider");
    }
  }, []);

  const testConnection = useCallback(
    async (data: { baseUrl?: string; apiKey?: string; modelId: string; providerId?: string }) => {
      try {
        return await api.providers.test(data);
      } catch (err) {
        return { ok: false, status: 500, error: err instanceof Error ? err.message : String(err) };
      }
    },
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const activeProvider =
    providers.find((p) => p.isDefault && p.enabled) ??
    providers.find((p) => p.enabled) ??
    providers[0];

  return { providers, activeProvider, loading, error, load, save, remove, testConnection };
}
