import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { permissionEngine } from "../core/sandbox/permission-engine";
import { resolveSessionAllowedWriteDir } from "../core/session/workspace-resolver";
import { sessionMetadataStore } from "../core/session/metadata-store";
import { existsSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { getUserDir, getAgentWorkspaceDir, getProjectWorkspaceDir } from "shared";

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
    expect(permissionEngine.isSubpath("c:\\users\\mike\\workspace", "C:\\Users\\Mike\\Workspace\\src\\index.ts")).toBe(true);
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

  it("should check permissions dynamically based on allowedWriteDir", () => {
    const allowedDir = join(userDir, "agents", "my-agent", "workspace");

    // Escribir dentro de allowedWriteDir (ruta absoluta)
    const verdictInside = permissionEngine.evaluate("write", { path: join(allowedDir, "src", "index.ts") }, {
      allowedWriteDir: allowedDir,
      executionMode: "standard",
    });
    expect(verdictInside.allow).toBe(true);

    // Escribir dentro de allowedWriteDir (ruta relativa como "src/App.jsx")
    const verdictRelativeInside = permissionEngine.evaluate("edit", { path: "src/App.jsx" }, {
      allowedWriteDir: allowedDir,
      executionMode: "standard",
    });
    expect(verdictRelativeInside.allow).toBe(true);

    // Escribir en temp (/tmp)
    const verdictTemp = permissionEngine.evaluate("edit", { path: "/tmp/somefile.txt" }, {
      allowedWriteDir: allowedDir,
      executionMode: "standard",
    });
    expect(verdictTemp.allow).toBe(true);

    // Escribir fuera de allowedWriteDir en modo standard (debe pedir confirmación)
    const verdictOutside = permissionEngine.evaluate("write", { path: join(userDir, "other-agent", "index.ts") }, {
      allowedWriteDir: allowedDir,
      executionMode: "standard",
    });
    expect(verdictOutside.allow).toBe("ask");

    // Escribir fuera de allowedWriteDir con ruta relativa traversal ("../outside.ts")
    const verdictRelativeOutside = permissionEngine.evaluate("write", { path: "../outside.ts" }, {
      allowedWriteDir: allowedDir,
      executionMode: "standard",
    });
    expect(verdictRelativeOutside.allow).toBe("ask");

    // Escribir fuera de allowedWriteDir en modo autonomous (debe permitir autónomamente)
    const verdictOutsideAuto = permissionEngine.evaluate("write", { path: join(userDir, "other-agent", "index.ts") }, {
      allowedWriteDir: allowedDir,
      executionMode: "autonomous",
    });
    expect(verdictOutsideAuto.allow).toBe(true);
  });
});
