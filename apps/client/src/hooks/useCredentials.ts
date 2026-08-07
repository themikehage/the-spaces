import { credentialsService } from "@/lib/api/credentials.service";
import { useCallback, useEffect, useState } from "react";
import type { CredentialCreate, CredentialListItem } from "shared";

export function useCredentials() {
  const [credentials, setCredentials] = useState<CredentialListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await credentialsService.fetchCredentials();
      setCredentials(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load credentials";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const createCredential = useCallback(async (data: CredentialCreate) => {
    setLoading(true);
    setError("");
    try {
      const created = await credentialsService.createCredential(data);
      setCredentials((prev) => [created, ...prev]);
      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create credential";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCredential = useCallback(async (id: string) => {
    setLoading(true);
    setError("");
    try {
      await credentialsService.deleteCredential(id);
      setCredentials((prev) => prev.filter((c) => c.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete credential";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    credentials,
    loading,
    error,
    refresh,
    createCredential,
    deleteCredential,
  };
}
