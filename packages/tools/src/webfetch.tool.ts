import type { ITool, ToolContext, ToolResult } from "@spaces/core";
import { z } from "zod";

const WebFetchParametersSchema = z.object({
  url: z.string().url().describe("HTTP/HTTPS URL to fetch"),
  method: z.enum(["GET", "POST"]).optional().default("GET").describe("HTTP method (default GET)"),
  body: z.string().optional().describe("Request body string for POST requests"),
});

export const webfetchTool: ITool = {
  name: "webfetch",
  description: "Fetch web content or send POST requests to a URL.",
  parameters: WebFetchParametersSchema,
  category: "network",
  async execute(args: unknown, _ctx: ToolContext): Promise<ToolResult> {
    const { url, method, body } = WebFetchParametersSchema.parse(args);

    try {
      const response = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: method === "POST" ? body : undefined,
      });

      const text = await response.text();
      const statusText = `HTTP ${response.status} ${response.statusText}`;

      return {
        toolCallId: "",
        output: `${statusText}\n\n${text.slice(0, 50000)}`,
        isError: !response.ok,
      };
    } catch (err) {
      return {
        toolCallId: "",
        output: err instanceof Error ? err.message : String(err),
        isError: true,
      };
    }
  },
};
