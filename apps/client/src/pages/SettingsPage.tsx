// SPDX-License-Identifier: MIT
import { EnvVarsTab } from "@/components/settings/EnvVarsTab";
import { GeneralTab } from "@/components/settings/GeneralTab";
import { ProvidersTab } from "@/components/settings/ProvidersTab";
import { TabsNav } from "@/components/ui/TabsNav";
import { useLiterals } from "@/lib";
import { envService } from "@/lib/api/env.service";
import { storage } from "@/lib/storage";
import { MCPMarketplacePage } from "@/pages/MCPMarketplacePage";
import { useCallback, useEffect, useState } from "react";
import { literals as u } from "./SettingsPage.literals";

interface EnvVar {
  key: string;
  value: string;
}

export function SettingsPage() {
  const l = useLiterals(u);
  const [activeTab, setActiveTab] = useState<"general" | "providers" | "env" | "mcp">(
    () => (storage.get("settingsActiveTab") as any) || "general",
  );
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [envLoading, setEnvLoading] = useState(true);
  const [envError, setEnvError] = useState("");

  const fetchEnvVars = useCallback(async () => {
    try {
      const data = await envService.fetchEnvVars();
      setEnvVars((data as any).env ?? data ?? []);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Error loading environment variables";
      setEnvError(errMsg);
    } finally {
      setEnvLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnvVars();
  }, [fetchEnvVars]);

  const handleTabChange = (tabId: string) => {
    const valid = tabId as "general" | "providers" | "env" | "mcp";
    setActiveTab(valid);
    storage.set("settingsActiveTab", valid);
  };

  const tabs = [
    { id: "general", label: l.tabGeneral },
    { id: "providers", label: l.tabProviders },
    { id: "env", label: l.tabEnv },
    { id: "mcp", label: l.tabMcp || "MCP Servers" },
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="max-w-2xl mx-auto px-3 sm:px-6 pt-3 sm:pt-6 pb-4 flex-shrink-0">
          <TabsNav
            tabs={tabs}
            activeTab={activeTab}
            onChange={handleTabChange}
            variant="line"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {activeTab === "mcp" ? (
            <MCPMarketplacePage />
          ) : (
            <div className="max-w-2xl mx-auto px-3 sm:px-6 pb-6 space-y-6">
              {activeTab === "general" && <GeneralTab />}
              {activeTab === "providers" && <ProvidersTab />}
              {activeTab === "env" && (
                <EnvVarsTab
                  envVars={envVars}
                  envLoading={envLoading}
                  envError={envError}
                  setEnvError={setEnvError}
                  fetchEnvVars={fetchEnvVars}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
