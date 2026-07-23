import { resolve, normalize, sep, extname, join } from "node:path";
import { existsSync } from "node:fs";
import { getProjectWorkspaceDir } from "shared";
import { resolveProjectDir } from "./core/session/workspace-resolver";

const MIME_MAP: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".cjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".wasm": "application/wasm",
  ".map": "application/json",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".webmanifest": "application/manifest+json",
};

function lookupMime(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return MIME_MAP[ext] || "application/octet-stream";
}

function isAsset(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return ext !== "" && MIME_MAP[ext] !== undefined && !ext.match(/\.(html?)/);
}

const BUILD_DIRS = ["dist", "build", ".output", "public", "out"] as const;

function resolveBuildDir(username: string, project: string): string {
  const resolved = resolveProjectDir(username, project);
  const projectDir = resolved ? join(resolved, "workspace") : getProjectWorkspaceDir(username, project);
  for (const dir of BUILD_DIRS) {
    const candidate = resolve(projectDir, dir);
    if (existsSync(candidate)) return candidate;
  }
  if (existsSync(join(projectDir, "index.html"))) {
    return projectDir;
  }
  return resolve(projectDir, "dist");
}

/**
 * Rewrites the HTML for iframe rendering:
 * 1. Injects <base href="/{username}/{repo}/"> so relative asset paths resolve correctly
 * 2. Strips `crossorigin` attribute (not needed when preview server is origin-isolated)
 * 3. Rewrites absolute paths (/assets/...) to the scoped preview path
 */
function rewriteHtml(html: string, username: string, project: string): string {
  const prefix = `/${encodeURIComponent(username)}/${encodeURIComponent(project)}/`;

  let result = html.replace(
    /<head[^>]*>/i,
    (m) => `${m}<base href="${prefix}">`
  );

  result = result.replace(/\s+crossorigin(?:="[^"]*"|='[^']*'|(?=[>\s]))?/gi, "");

  result = result.replace(
    /(<(?:script|link|img|source|iframe|video|audio)\s[^>]*?)(src|href|action)\s*=\s*"(\/(?!\/)[^"]*?)"/gi,
    (_, tag, attr, path) => {
      if (path.startsWith(prefix) || path.startsWith("//") || path.startsWith("http")) {
        return `${tag}${attr}="${path}"`;
      }
      return `${tag}${attr}="${prefix}${path.replace(/^\//, "")}"`;
    }
  );

  result = result.replace(
    /(<(?:script|link|img|source|iframe|video|audio)\s[^>]*?)(src|href|action)\s*=\s*'(\/(?!\/)[^']*?)'/gi,
    (_, tag, attr, path) => {
      if (path.startsWith(prefix) || path.startsWith("//") || path.startsWith("http")) {
        return `${tag}${attr}='${path}'`;
      }
      return `${tag}${attr}='${prefix}${path.replace(/^\//, "")}'`;
    }
  );

  return result;
}

function htmlHeaders(contentType: string): Record<string, string> {
  return {
    "Content-Type": contentType,
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Access-Control-Allow-Origin": "*",
    "Referrer-Policy": "same-origin",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https: http:; img-src * data: blob:; font-src 'self' data: https: http:; connect-src *; frame-src *;",
  };
}

function assetHeaders(contentType: string): Record<string, string> {
  return {
    "Content-Type": contentType,
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Access-Control-Allow-Origin": "*",
  };
}

function renderNoBuildHtml(projectName: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>No build output yet</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #090d16; color: #94a3b8; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
    .card { background: #131b2e; padding: 2rem; border-radius: 12px; max-width: 420px; border: 1px solid #1e293b; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
    h2 { color: #f8fafc; margin-top: 0; font-size: 1.25rem; }
    p { font-size: 0.875rem; line-height: 1.6; color: #cbd5e1; }
    code { background: #1e293b; color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.85em; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Sin salida de Build todavía</h2>
    <p>El proyecto <strong>${projectName}</strong> aún no tiene un resultado compilado en su carpeta de salida.</p>
    <p>Haz clic en <strong>Build Now</strong> en la barra superior del Preview o asegúrate de que exista un archivo <code>index.html</code>.</p>
  </div>
</body>
</html>`;
}

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);

  let username: string;
  let project: string;
  let filePath: string;

  if (parts.length >= 2) {
    username = decodeURIComponent(parts[0]);
    project = decodeURIComponent(parts[1]);
    filePath = parts.slice(2).join("/") || "index.html";
  } else {
    // Absolute-path asset request (e.g. /assets/logo-xxx.png) emitted by Vite bundles.
    const referer = req.headers.get("referer") || req.headers.get("Referer") || "";
    let refUsername = "";
    let refProject = "";
    if (referer) {
      try {
        const refUrl = new URL(referer);
        const refParts = refUrl.pathname.split("/").filter(Boolean);
        if (refParts.length >= 2) {
          refUsername = decodeURIComponent(refParts[0]);
          refProject = decodeURIComponent(refParts[1]);
        }
      } catch {}
    }
    if (!refUsername || !refProject) {
      return new Response("Not Found", { status: 404 });
    }
    username = refUsername;
    project = refProject;
    filePath = parts.join("/") || "index.html";
  }

  if (username.includes("..") || project.includes("..") || filePath.includes("..")) {
    return new Response("Bad Request", { status: 400 });
  }

  const buildDir = resolveBuildDir(username, project);
  const cleanFilePath = filePath.replace(/^[/\\]+/, "");
  const normalized = normalize(cleanFilePath);
  let fullPath = resolve(buildDir, normalized);

  if (!existsSync(fullPath)) {
    const resolved = resolveProjectDir(username, project);
    const workspaceDir = resolved ? join(resolved, "workspace") : getProjectWorkspaceDir(username, project);
    const rawPath = resolve(workspaceDir, normalized);
    if (existsSync(rawPath) && (rawPath === workspaceDir || rawPath.startsWith(workspaceDir + sep))) {
      fullPath = rawPath;
    }
  }

  if (existsSync(fullPath)) {
    const file = Bun.file(fullPath);
    if (await file.exists()) {
      const mime = lookupMime(fullPath);
      if (mime.startsWith("text/html")) {
        const rewritten = rewriteHtml(await file.text(), username, project);
        return new Response(rewritten, { headers: htmlHeaders(mime) });
      }
      return new Response(await file.arrayBuffer(), { headers: assetHeaders(mime) });
    }
  }

  if (!isAsset(filePath)) {
    const indexPath = resolve(buildDir, "index.html");
    if (existsSync(indexPath)) {
      const file = Bun.file(indexPath);
      if (await file.exists()) {
        const rewritten = rewriteHtml(await file.text(), username, project);
        return new Response(rewritten, {
          headers: htmlHeaders("text/html; charset=utf-8"),
        });
      }
    }
    return new Response(renderNoBuildHtml(project), {
      headers: htmlHeaders("text/html; charset=utf-8"),
      status: 200,
    });
  }

  return new Response("Not Found", { status: 404 });
}

export function startPreviewServer(): void {
  const port = parseInt(process.env.PREVIEW_PORT ?? "3001");

  Bun.serve({
    port,
    async fetch(req) {
      if (req.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
          },
        });
      }
      try {
        return await handleRequest(req);
      } catch {
        return new Response("Internal Server Error", { status: 500 });
      }
    },
  });

  console.log(`Preview server running at http://0.0.0.0:${port}`);
}
