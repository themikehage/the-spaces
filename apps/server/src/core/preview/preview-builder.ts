import { join } from "node:path";
import { type PreviewConfig, getProjectWorkspaceDir } from "shared";
import { broadcastToUser } from "../../ws/handler";
import type { ISandbox } from "../ports/sandbox.port";
import { LocalSandbox } from "../sandbox/local.sandbox";
import * as defaultWorkspaceResolver from "../session/workspace-resolver";
import { getBuildCommand } from "./preview-config";

const activeBuilds = new Map<string, AbortController>();

function buildKey(username: string, projectName: string): string {
  return `${username}:${projectName}`;
}

export function isBuilding(username: string, projectName: string): boolean {
  return activeBuilds.has(buildKey(username, projectName));
}

export async function runBuild(
  username: string,
  projectName: string,
  config: PreviewConfig,
  sandbox: ISandbox = new LocalSandbox(),
): Promise<{ success: boolean; exitCode: number | null }> {
  const key = buildKey(username, projectName);

  // Prevent concurrent builds
  if (activeBuilds.has(key)) {
    broadcastToUser(username, {
      type: "preview_build_log",
      projectName,
      line: "A build is already running. Please wait for it to complete.",
    });
    return { success: false, exitCode: null };
  }

  const resolved = defaultWorkspaceResolver.resolveProjectDir(username, projectName);
  const projectDir = resolved
    ? join(resolved, "workspace")
    : getProjectWorkspaceDir(username, projectName);
  const command = getBuildCommand(config, username, projectName);

  if (!command) {
    broadcastToUser(username, {
      type: "preview_build_log",
      projectName,
      line: "No build command configured. Set a build command in the preview settings.",
    });
    return { success: false, exitCode: null };
  }

  const abortController = new AbortController();
  activeBuilds.set(key, abortController);

  broadcastToUser(username, {
    type: "preview_status",
    projectName,
    status: "building",
  });

  broadcastToUser(username, {
    type: "preview_build_log",
    projectName,
    line: `$ ${command}`,
  });

  const onData = (chunk: string) => {
    const lines = chunk.split("\n").filter(Boolean);
    for (const line of lines) {
      broadcastToUser(username, {
        type: "preview_build_log",
        projectName,
        line: line.replace(/\r$/, ""),
      });
    }
  };

  try {
    const result = await sandbox.execute(command, {
      cwd: projectDir,
      signal: abortController.signal,
      onStdout: onData,
      onStderr: onData,
    });

    activeBuilds.delete(key);
    const success = result.exitCode === 0;

    broadcastToUser(username, {
      type: "preview_build_log",
      projectName,
      line: success
        ? `Build completed successfully (exit code 0)`
        : `Build failed (exit code ${result.exitCode})`,
    });

    broadcastToUser(username, {
      type: "preview_status",
      projectName,
      status: success ? "ready" : "error",
    });

    return { success, exitCode: result.exitCode };
  } catch (err: any) {
    activeBuilds.delete(key);
    const isAborted = abortController.signal.aborted;
    const msg = isAborted ? "Build aborted by user" : (err?.message || "Build execution failed");

    broadcastToUser(username, {
      type: "preview_build_log",
      projectName,
      line: msg,
    });

    broadcastToUser(username, {
      type: "preview_status",
      projectName,
      status: "error",
    });

    return { success: false, exitCode: null };
  }
}

export function abortBuild(username: string, projectName: string) {
  const key = buildKey(username, projectName);
  const controller = activeBuilds.get(key);
  if (controller) {
    controller.abort();
    activeBuilds.delete(key);

    broadcastToUser(username, {
      type: "preview_build_log",
      projectName,
      line: "Build cancelled.",
    });

    broadcastToUser(username, {
      type: "preview_status",
      projectName,
      status: "idle",
    });
  }
}
