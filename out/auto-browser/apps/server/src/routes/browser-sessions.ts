import { Hono } from "hono";
import { join } from "node:path";
import { homedir } from "node:os";
import { readdir, readFile } from "node:fs/promises";

export const browserSessionsRouter = new Hono();

interface BrowserSessionInfo {
  session: string;
  port: number;
  pid: number;
}

async function readNumericFile(path: string): Promise<number | null> {
  try {
    const content = await readFile(path, "utf-8");
    const n = parseInt(content.trim(), 10);
    return isNaN(n) ? null : n;
  } catch {
    return null;
  }
}

async function isPidAlive(pid: number): Promise<boolean> {
  try {
    // On Windows and Unix: sending signal 0 checks if process exists
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function getActiveBrowserSessions(): Promise<BrowserSessionInfo[]> {
  const dir = join(homedir(), ".agent-browser");
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }

  const streamFiles = entries.filter((f) => f.endsWith(".stream"));
  const sessions: BrowserSessionInfo[] = [];

  for (const file of streamFiles) {
    const name = file.replace(/\.stream$/, "");
    const pidFile = join(dir, `${name}.pid`);
    const streamFile = join(dir, file);

    const [port, pid] = await Promise.all([readNumericFile(streamFile), readNumericFile(pidFile)]);

    if (!port || !pid) continue;

    const alive = await isPidAlive(pid);
    if (!alive) continue;

    sessions.push({ session: name, port, pid });
  }

  return sessions;
}

browserSessionsRouter.get("/", async (c) => {
  const sessions = await getActiveBrowserSessions();
  return c.json(sessions);
});

// Also register stream ports for active sessions into the proxy on demand
import { registerStreamPort } from "../ws/stream-proxy.ts";

browserSessionsRouter.get("/register", async (c) => {
  const sessions = await getActiveBrowserSessions();
  for (const s of sessions) {
    registerStreamPort(s.session, s.port);
  }
  return c.json({ registered: sessions.length, sessions });
});
