import type { HttpRequestOptions, HttpResponse, IHttpClient } from "../ports/http-client.port";

export class FetchHttpClient implements IHttpClient {
  async request(opts: HttpRequestOptions): Promise<HttpResponse> {
    const controller = new AbortController();
    const timeoutMs = opts.timeoutMs ?? 10_000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = { ...(opts.headers ?? {}) };
      let bodyData: BodyInit | undefined = undefined;

      if (opts.body !== undefined && opts.body !== null) {
        if (typeof opts.body === "string" || opts.body instanceof FormData || opts.body instanceof Blob) {
          bodyData = opts.body as BodyInit;
        } else {
          bodyData = JSON.stringify(opts.body);
          if (!Object.keys(headers).some((k) => k.toLowerCase() === "content-type")) {
            headers["Content-Type"] = "application/json";
          }
        }
      }

      const response = await fetch(opts.url, {
        method: opts.method,
        headers,
        body: bodyData,
        signal: controller.signal,
      });

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        responseHeaders[key] = val;
      });

      const contentType = response.headers.get("content-type") || "";
      let parsedBody: unknown;
      if (contentType.includes("application/json")) {
        try {
          parsedBody = await response.json();
        } catch {
          parsedBody = await response.text();
        }
      } else {
        parsedBody = await response.text();
      }

      return {
        status: response.status,
        headers: responseHeaders,
        body: parsedBody,
        ok: response.ok,
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`HTTP request timed out after ${timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

export const fetchHttpClient = new FetchHttpClient();
