export interface HttpRequestOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  ok: boolean;
}

export interface IHttpClient {
  request(opts: HttpRequestOptions): Promise<HttpResponse>;
}
