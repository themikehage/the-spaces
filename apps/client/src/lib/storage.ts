// SPDX-License-Identifier: MIT

export const STORAGE_KEYS = {
  token: "token",
  activeProjectId: "active-project-id",
  activeProjectName: "active-project-name",
  activeProject: "active-project",
  activeAgent: "active-agent",
  activeTeam: "active-team",
  activeChannel: "active-channel",
  hasContext: "has-context",
  settingsActiveTab: "settings-active-tab",
  theme: "theme",
  navStackMobile: "nav-stack-mobile",
  selectedModel: "crewfy-selected-model",
  recentModels: "pi-recent-models",
  exaSearchActive: "exa-search-global-active",
  locale: "locale",
} as const;

export type KnownStorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
export type DynamicStorageKey = `pending-prompt-${string}` | `pending-images-${string}`;
export type StorageKey = KnownStorageKey | DynamicStorageKey | (string & {});

export const storage = {
  get(key: StorageKey): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  set(key: StorageKey, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      console.error(`Failed to save key "${key}" to storage:`, err);
    }
  },

  remove(key: StorageKey): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },

  getJSON<T>(key: StorageKey): T | null {
    try {
      const value = localStorage.getItem(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  },

  setJSON<T>(key: StorageKey, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`Failed to save JSON key "${key}" to storage:`, err);
    }
  },
};
