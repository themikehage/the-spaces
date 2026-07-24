// SPDX-License-Identifier: MIT
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { getUserDir } from "shared";
import { sessionMetadataStore } from "../core/session/metadata-store";
import { sessionCrudRouter } from "../routes/sessions/session-crud";

describe("Session CRUD Router Tests", () => {
  const username = "test_user_session_crud";
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

  it("should save metadata correctly using saveSessionMetadata and persistSessionMetadata alias", () => {
    const sId = "test_s_123";
    sessionMetadataStore.saveSessionMetadata(username, sId, { name: "Test Session" });
    const meta = sessionMetadataStore.getSessionMetadata(username, sId);
    expect(meta).toBeDefined();
    expect(meta?.name).toBe("Test Session");

    sessionMetadataStore.persistSessionMetadata(username, sId, { name: "Updated Name" });
    const updatedMeta = sessionMetadataStore.getSessionMetadata(username, sId);
    expect(updatedMeta?.name).toBe("Updated Name");
  });

  it("should persist projectId, agentId, and teamId to session metadata on disk", () => {
    const projSessionId = "test_proj_s_456";
    sessionMetadataStore.saveSessionMetadata(username, projSessionId, {
      name: "Project Session",
      projectId: "my-project",
      agentId: "my-agent",
      teamId: "my-team",
    });

    const meta = sessionMetadataStore.getSessionMetadata(username, projSessionId);
    expect(meta).toBeDefined();
    expect(meta?.projectId).toBe("my-project");
    expect(meta?.agentId).toBe("my-agent");
    expect(meta?.teamId).toBe("my-team");
  });
});
