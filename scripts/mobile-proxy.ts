// SPDX-License-Identifier: MIT
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

interface NgrokTunnel {
  name: string;
  public_url: string;
  proto: string;
  config: {
    addr: string;
  };
}

interface NgrokTunnelsResponse {
  tunnels: NgrokTunnel[];
}

const parseArgs = () => {
  const args = process.argv.slice(2);
  let targetPort = parseInt(process.env.TARGET_PORT || "3000", 10);
  let proxyPort = parseInt(process.env.PROXY_PORT || "3001", 10);
  let direct = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--target" && args[i + 1]) {
      targetPort = parseInt(args[++i], 10);
    } else if (args[i] === "--port" && args[i + 1]) {
      proxyPort = parseInt(args[++i], 10);
    } else if (args[i] === "--direct") {
      direct = true;
    }
  }

  return { targetPort, proxyPort, direct };
};

const { targetPort, proxyPort, direct } = parseArgs();
const tunnelPort = direct ? targetPort : proxyPort;

console.log("\n========================================================");
console.log("🚀 Starting Spaces Mobile Proxy (Bun + ngrok)");
console.log(`🎯 Target Backend Server: http://localhost:${targetPort}`);
if (!direct) {
  console.log(`🔌 Local Proxy Server:   http://localhost:${proxyPort}`);
}
console.log("========================================================\n");

let proxyServer: ReturnType<typeof Bun.serve> | null = null;

if (!direct) {
  proxyServer = Bun.serve({
    port: proxyPort,
    async fetch(req, server) {
      const url = new URL(req.url);

      if (server.upgrade(req, { data: { path: url.pathname + url.search } })) {
        return undefined;
      }

      url.port = targetPort.toString();
      url.hostname = "127.0.0.1";
      url.protocol = "http:";

      const headers = new Headers(req.headers);
      headers.set("host", `127.0.0.1:${targetPort}`);
      headers.set("ngrok-skip-browser-warning", "true");

      try {
        const response = await fetch(url.toString(), {
          method: req.method,
          headers,
          body: req.method !== "GET" && req.method !== "HEAD" ? await req.blob() : undefined,
          redirect: "manual",
        });

        const respHeaders = new Headers(response.headers);
        respHeaders.set("Access-Control-Allow-Origin", "*");
        respHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
        respHeaders.set("Access-Control-Allow-Headers", "*");

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: respHeaders,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return new Response(
          JSON.stringify({
            error: "Proxy forwarding error",
            message,
            target: `http://127.0.0.1:${targetPort}`,
          }),
          {
            status: 502,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    },
    websocket: {
      open(ws) {
        const data = ws.data as { path: string; targetWs?: WebSocket };
        const wsUrl = `ws://127.0.0.1:${targetPort}${data.path}`;
        const targetWs = new WebSocket(wsUrl);

        targetWs.onopen = () => {
          data.targetWs = targetWs;
        };

        targetWs.onmessage = (event) => {
          ws.send(event.data);
        };

        targetWs.onclose = () => {
          ws.close();
        };

        targetWs.onerror = () => {
          ws.close();
        };

        data.targetWs = targetWs;
      },
      message(ws, message) {
        const data = ws.data as { path: string; targetWs?: WebSocket };
        if (data.targetWs && data.targetWs.readyState === WebSocket.OPEN) {
          data.targetWs.send(message);
        }
      },
      close(ws) {
        const data = ws.data as { path: string; targetWs?: WebSocket };
        if (data.targetWs) {
          data.targetWs.close();
        }
      },
    },
  });
}

console.log(`📡 Spawning ngrok tunnel for port ${tunnelPort}...`);

const ngrokProcess = spawn("ngrok", ["http", tunnelPort.toString(), "--log=stdout"], {
  stdio: ["ignore", "pipe", "pipe"],
  shell: true,
});

const cleanup = () => {
  console.log("\n🛑 Stopping proxy and ngrok tunnel...");
  if (proxyServer) {
    proxyServer.stop();
  }
  ngrokProcess.kill();
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

async function fetchNgrokUrl(retries = 15, delayMs = 800): Promise<string | null> {
  for (let i = 0; i < retries; i++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    try {
      const res = await fetch("http://127.0.0.1:4040/api/tunnels");
      if (res.ok) {
        const data = (await res.json()) as NgrokTunnelsResponse;
        const httpsTunnel = data.tunnels.find((t) => t.proto === "https" || t.public_url.startsWith("https://"));
        if (httpsTunnel) {
          return httpsTunnel.public_url;
        }
        if (data.tunnels.length > 0) {
          return data.tunnels[0].public_url;
        }
      }
    } catch {
      // ngrok API not ready yet
    }
  }
  return null;
}

fetchNgrokUrl().then((publicUrl) => {
  if (publicUrl) {
    const httpsUrl = publicUrl.startsWith("http://") ? publicUrl.replace("http://", "https://") : publicUrl;
    const wssUrl = httpsUrl.replace(/^https?:\/\//, "wss://");

    console.log("\n========================================================");
    console.log("✨ NGROK TUNNEL ONLINE ✨");
    console.log("========================================================");
    console.log(`🌐 Public HTTPS API:       ${httpsUrl}`);
    console.log(`⚡ Public WSS WebSocket:   ${wssUrl}`);
    console.log("========================================================");
    console.log("\n📱 Run Flutter with this tunnel:");
    console.log(
      `flutter run --dart-define=SPACES_API_URL=${httpsUrl} --dart-define=SPACES_WS_URL=${wssUrl}\n`,
    );

    const envContent = `# Auto-generated by mobile-proxy
SPACES_API_URL=${httpsUrl}
SPACES_WS_URL=${wssUrl}
`;
    const envPath = path.resolve(import.meta.dir, "../apps/mobile/.env.local");
    try {
      fs.writeFileSync(envPath, envContent, "utf-8");
      console.log(`💾 Saved config to: apps/mobile/.env.local`);
    } catch {
      // ignore write error
    }
    console.log("========================================================\n");
  } else {
    console.warn("\n⚠️  Could not retrieve public URL from ngrok API (http://127.0.0.1:4040/api/tunnels).");
    console.warn("Please check if ngrok requires authentication or is blocked.");
  }
});
