// SPDX-License-Identifier: MIT
import { getAgentWorkspaceDir, getProjectWorkspaceDir, getUserDir } from "@spaces/core";
import { PermissionEngine } from "@spaces/engine";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { SessionMetadataStore } from "../core/session/metadata-store";
import { resolveSessionAllowedWriteDir } from "../core/session/workspace-resolver";
const permissionEngine = new PermissionEngine();

const sessionMetadataStore = new SessionMetadataStore();

describe("Dynamic Workspaces & Permissions Tests", () => {
  const username = "test_user_perms";
  const userDir = getUserDir(username);

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

  it("should determine subpath correctly using permissionEngine.isSubpath", () => {
    expect(permissionEngine.isSubpath("/foo", "/foo/bar/baz")).toBe(true);
    expect(permissionEngine.isSubpath("/foo/bar", "/foo/baz")).toBe(false);
    expect(
      permissionEngine.isSubpath(
        "c:\\users\\mike\\workspace",
        "C:\\Users\\Mike\\Workspace\\src\\index.ts",
      ),
    ).toBe(true);
  });

  it("should resolve allowedWriteDir correctly for user levels", () => {
    // 1. Sesión global (sin metadata o vacía)
    const globalDir = resolveSessionAllowedWriteDir(username, "session_global");
    expect(globalDir).toBe(userDir);

    // 2. Sesión de Agente
    const agentId = "test-agent-coder";
    sessionMetadataStore.saveSessionMetadata(username, "session_agent", {
      agentId,
    });
    const agentDir = resolveSessionAllowedWriteDir(username, "session_agent");
    expect(agentDir).toBe(getAgentWorkspaceDir(username, agentId));

    // 3. Sesión de Proyecto
    const projectName = "my-project-hack";
    sessionMetadataStore.saveSessionMetadata(username, "session_project", {
      projectName,
    });
    const projectDir = resolveSessionAllowedWriteDir(username, "session_project");
    expect(projectDir).toBe(getProjectWorkspaceDir(username, projectName));
  });

  it("should inherit allowedWriteDir recursively for subagents", () => {
    const parentId = "parent_session_proj";
    const childId = "sub_child_session";
    const grandchildId = "sub_grandchild_session";

    sessionMetadataStore.saveSessionMetadata(username, parentId, {
      projectName: "hackathon-spaces",
    });
    sessionMetadataStore.saveSessionMetadata(username, childId, {
      parentSessionId: parentId,
    });
    sessionMetadataStore.saveSessionMetadata(username, grandchildId, {
      parentSessionId: childId,
    });

    const parentDir = resolveSessionAllowedWriteDir(username, parentId);
    const childDir = resolveSessionAllowedWriteDir(username, childId);
    const grandchildDir = resolveSessionAllowedWriteDir(username, grandchildId);

    expect(parentDir).toBe(getProjectWorkspaceDir(username, "hackathon-spaces"));
    expect(childDir).toBe(parentDir);
    expect(grandchildDir).toBe(parentDir);
  });

  it("should check permissions dynamically based on allowedWriteDir", async () => {
    const allowedDir = join(userDir, "agents", "my-agent", "workspace");

    // Escribir dentro de allowedWriteDir (ruta absoluta)
    const verdictInside = await permissionEngine.evaluate({
      toolCall: {
        id: "1",
        name: "write",
        arguments: { path: join(allowedDir, "src", "index.ts") },
      },
      sessionId: "test",
    });
    expect(verdictInside.allowed).toBe(true);

    // Escribir dentro de allowedWriteDir (ruta relativa como "src/App.jsx")
    const verdictRelativeInside = await permissionEngine.evaluate({
      toolCall: { id: "2", name: "edit", arguments: { path: "src/App.jsx" } },
      sessionId: "test",
    });
    expect(verdictRelativeInside.allowed).toBe(true);

    // Escribir en temp (/tmp)
    const verdictTemp = await permissionEngine.evaluate({
      toolCall: { id: "3", name: "edit", arguments: { path: "/tmp/somefile.txt" } },
      sessionId: "test",
    });
    expect(verdictTemp.allowed).toBe(true);
  });
});
