import { Type, type Static } from "typebox";
import type { ITool, ToolContext, ToolResult } from "@auto-browser/core";

const Parameters = Type.Object({
  url: Type.String({ description: "URL to fetch" }),
  method: Type.Optional(
    Type.Union(
      [
        Type.Literal("GET"),
        Type.Literal("POST"),
        Type.Literal("PUT"),
        Type.Literal("DELETE"),
        Type.Literal("PATCH"),
      ],
      { description: "HTTP method (default GET)" },
    ),
  ),
  headers: Type.Optional(
    Type.Record(Type.String(), Type.String(), { description: "Request headers" }),
  ),
  body: Type.Optional(Type.String({ description: "Request body (for POST/PUT/PATCH)" })),
});

type Params = Static<typeof Parameters>;

export const webfetchTool: ITool<typeof Parameters> = {
  name: "webfetch",
  label: "HTTP Request",
  description: "Make an HTTP request and return the response body",
  parameters: Parameters,
  category: "network",

  async execute(_toolCallId: string, params: Params, ctx: ToolContext): Promise<ToolResult> {
    const init: RequestInit = {
      method: params.method ?? "GET",
    };
    if (ctx.signal) init.signal = ctx.signal;
    if (params.headers) init.headers = params.headers;
    if (params.body !== undefined) init.body = params.body;

    const response = await fetch(params.url, init);

    const text = await response.text();
    const truncated = text.length > 50_000 ? text.slice(0, 50_000) + "\n...[truncated]" : text;

    return {
      content: [
        { type: "text", text: `HTTP ${response.status} ${response.statusText}\n\n${truncated}` },
      ],
      details: {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        contentType: response.headers.get("content-type"),
      },
    };
  },
};
