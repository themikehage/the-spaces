// SPDX-License-Identifier: MIT
import { apiFetch } from "@/lib/api";

async function fetchEnvVars(): Promise<Record<string, string>> {
  const res = await apiFetch("/api/env");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.env || data;
}

async function updateEnvVars(vars: Record<string, string>): Promise<void> {
  const res = await apiFetch("/api/env", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vars),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export const envService = {
  fetchEnvVars,
  updateEnvVars,
};
