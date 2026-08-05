// SPDX-License-Identifier: MIT
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { FilesystemSessionStore } from "../core/stores/filesystem-session-store";

const TEST_DIR = join(process.cwd(), "tmp-test-filesystem-session-store");

describe("FilesystemSessionStore", () => {
  let store: FilesystemSessionStore;

  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
    store = new FilesystemSessionStore(TEST_DIR);
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("should create a session with metadata and initial messages", async () => {
    const sessionId = "sess-1";
    await store.create({
      id: sessionId,
      username: "testuser",
      metadata: {
        name: "Test Session",
        projectId: "proj-123",
        agentId: "agent-abc",
      },
      messages: [
        { role: "user", content: "Hello world" },
        { role: "assistant", content: "Hi there!" },
      ],
    });

    const exists = await store.exists(sessionId);
    expect(exists).toBe(true);

    const msgs = await store.getMessages(sessionId);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].content).toBe("Hello world");
    expect(msgs[1].content).toBe("Hi there!");
  });

  it("should append messages concurrently without file corruption", async () => {
    const sessionId = "sess-concurrent";
    await store.create({
      id: sessionId,
      username: "testuser",
      metadata: { name: "Concurrent Test" },
    });

    const appends = Array.from({ length: 10 }, (_, i) =>
      store.appendMessage(sessionId, { role: "user", content: `Message ${i + 1}` }),
    );

    await Promise.all(appends);

    const msgs = await store.getMessages(sessionId);
    expect(msgs).toHaveLength(10);

    const summaries = await store.listUserSessions("testuser");
    const session = summaries.find((s) => s.id === sessionId);
    expect(session).toBeDefined();
    expect(session?.messageCount).toBe(10);
  });

  it("should support pagination with offset and limit in getMessages", async () => {
    const sessionId = "sess-page";
    await store.create({
      id: sessionId,
      username: "testuser",
      messages: [
        { role: "user", content: "Msg 1" },
        { role: "assistant", content: "Msg 2" },
        { role: "user", content: "Msg 3" },
        { role: "assistant", content: "Msg 4" },
      ],
    });

    const page1 = await store.getMessages(sessionId, { offset: 0, limit: 2 });
    expect(page1).toHaveLength(2);
    expect(page1[0].content).toBe("Msg 1");
    expect(page1[1].content).toBe("Msg 2");

    const page2 = await store.getMessages(sessionId, { offset: 2, limit: 2 });
    expect(page2).toHaveLength(2);
    expect(page2[0].content).toBe("Msg 3");
    expect(page2[1].content).toBe("Msg 4");
  });

  it("should list user sessions and apply filters", async () => {
    await store.create({
      id: "sess-alpha",
      username: "testuser",
      metadata: { name: "Alpha Session", projectId: "p-1", agentId: "a-1", status: "active" },
    });

    await store.create({
      id: "sess-beta",
      username: "testuser",
      metadata: { name: "Beta Session", projectId: "p-2", agentId: "a-1", status: "sleeping" },
    });

    const all = await store.listUserSessions("testuser");
    expect(all).toHaveLength(2);

    const filteredProj = await store.listUserSessions("testuser", { projectId: "p-1" });
    expect(filteredProj).toHaveLength(1);
    expect(filteredProj[0].id).toBe("sess-alpha");

    const searchFiltered = await store.listUserSessions("testuser", { search: "beta" });
    expect(searchFiltered).toHaveLength(1);
    expect(searchFiltered[0].id).toBe("sess-beta");
  });

  it("should delete a session directory", async () => {
    const sessionId = "sess-del";
    await store.create({
      id: sessionId,
      username: "testuser",
      metadata: { name: "Delete Test" },
    });

    expect(await store.exists(sessionId)).toBe(true);

    await store.delete(sessionId);
    expect(await store.exists(sessionId)).toBe(false);
  });
});
