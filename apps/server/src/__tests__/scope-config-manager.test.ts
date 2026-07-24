// SPDX-License-Identifier: MIT
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { getScopeConfigPath, getUserDir } from "shared";
import { scopeConfigManager } from "../core/scope/scope-config-manager";

describe("ScopeConfigManager Tests", () => {
  const username = "test_scope_config_user";
  const userDir = getUserDir(username);
  const configPath = getScopeConfigPath(username);

  beforeAll(() => {
    if (existsSync(userDir)) {
      rmSync(userDir, { recursive: true, force: true });
    }
    mkdirSync(userDir, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(userDir)) {
      rmSync(userDir, { recursive: true, force: true });
    }
  });

  it("should parse legacy config with legacy channels key and strip it without throwing TypeError", async () => {
    const legacyConfig = {
      version: 1,
      global: { agents: [], tools: [] },
      channels: { old_chan: { agents: [], tools: [] } },
      projects: {},
      agentTools: {},
    };

    writeFileSync(configPath, JSON.stringify(legacyConfig, null, 2), "utf8");

    const loaded = await scopeConfigManager.load(username);
    expect(loaded).toBeDefined();
    expect((loaded as any).channels).toBeUndefined();
  });
});
