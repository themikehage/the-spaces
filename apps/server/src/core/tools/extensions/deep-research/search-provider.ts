// SPDX-License-Identifier: MIT
import type { SearchResult } from "shared";
import { sessionManager } from "../../../session/session-manager";

export interface ISearchProvider {
  readonly name: string;
  search(query: string, maxResults: number, signal?: AbortSignal): Promise<SearchResult[]>;
}

export class ExaSearchProvider implements ISearchProvider {
  readonly name = "exa";

  constructor(private username: string) {}

  async search(query: string, maxResults: number, signal?: AbortSignal): Promise<SearchResult[]> {
    const apiKey = getExaApiKey(this.username);
    if (!apiKey) return [];

    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        query,
        type: "auto",
        numResults: Math.min(maxResults, 25),
        contents: { highlights: true },
      }),
      signal,
    });

    if (!response.ok) return [];

    const data = (await response.json()) as {
      results?: Array<{
        title?: string;
        url: string;
        publishedDate?: string;
        highlights?: string[];
        text?: string;
      }>;
    };

    if (!data.results) return [];

    return data.results.map((r) => ({
      title: r.title || "Untitled",
      url: r.url,
      snippet: (r.highlights && r.highlights.join(" ")) || r.text?.substring(0, 300) || "",
      publishedDate: r.publishedDate,
      provider: "exa",
    }));
  }
}

export class SearXNGSearchProvider implements ISearchProvider {
  readonly name = "searxng";

  constructor(private username: string) {}

  async search(query: string, maxResults: number, signal?: AbortSignal): Promise<SearchResult[]> {
    const searxngUrl = getSearxngUrl(this.username);
    if (!searxngUrl) return [];

    const url = new URL("/search", searxngUrl);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("pageno", "1");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    if (!response.ok) return [];

    const data = (await response.json()) as {
      results?: Array<{
        title?: string;
        url: string;
        content?: string;
        publishedDate?: string;
      }>;
    };

    if (!data.results) return [];

    return data.results.slice(0, maxResults).map((r) => ({
      title: r.title || "Untitled",
      url: r.url,
      snippet: r.content || "",
      publishedDate: r.publishedDate,
      provider: "searxng",
    }));
  }
}

export class DuckDuckGoSearchProvider implements ISearchProvider {
  readonly name = "duckduckgo";

  async search(query: string, maxResults: number, signal?: AbortSignal): Promise<SearchResult[]> {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal,
    });

    if (!response.ok) return [];

    const html = await response.text();
    const results: SearchResult[] = [];
    const regex = /<a class="result__url" href="([^"]+)".*?>[\s\S]*?<a class="result__snippet[^"]*">([\s\S]*?)<\/a>/g;

    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null && results.length < maxResults) {
      const rawUrl = match[1].trim();
      const snippet = match[2].replace(/<[^>]+>/g, "").trim();
      let actualUrl = rawUrl;
      if (rawUrl.includes("uddg=")) {
        const parsed = new URL("https://html.duckduckgo.com" + rawUrl);
        actualUrl = decodeURIComponent(parsed.searchParams.get("uddg") || rawUrl);
      }
      if (actualUrl.startsWith("http")) {
        results.push({
          title: actualUrl,
          url: actualUrl,
          snippet,
          provider: "duckduckgo",
        });
      }
    }

    return results;
  }
}

export class SearchProviderChain {
  private providers: ISearchProvider[];

  constructor(username: string) {
    this.providers = [
      new ExaSearchProvider(username),
      new SearXNGSearchProvider(username),
      new DuckDuckGoSearchProvider(),
    ];
  }

  async executeMultiQuery(
    queries: string[],
    maxResults: number,
    signal?: AbortSignal,
  ): Promise<SearchResult[]> {
    const allResultsPromises = queries.map((q) => this.executeSingleQuery(q, maxResults, signal));
    const settled = await Promise.allSettled(allResultsPromises);

    const merged: SearchResult[] = [];
    const seenUrls = new Set<string>();

    for (const res of settled) {
      if (res.status === "fulfilled") {
        for (const item of res.value) {
          if (!seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            merged.push(item);
          }
        }
      }
    }

    return merged;
  }

  private async executeSingleQuery(
    query: string,
    maxResults: number,
    signal?: AbortSignal,
  ): Promise<SearchResult[]> {
    for (const provider of this.providers) {
      try {
        const results = await provider.search(query, maxResults, signal);
        if (results.length > 0) {
          return results;
        }
      } catch {
        /* try next provider */
      }
    }
    return [];
  }
}

function getExaApiKey(username: string): string | null {
  try {
    const env = sessionManager.userConfig.getUserEnv(username);
    if (env.EXA_API_KEY) return env.EXA_API_KEY;
  } catch {
    /* noop */
  }
  return process.env.EXA_API_KEY || null;
}

function getSearxngUrl(username: string): string | null {
  try {
    const env = sessionManager.userConfig.getUserEnv(username);
    if (env.SEARXNG_URL) return env.SEARXNG_URL;
  } catch {
    /* noop */
  }
  return process.env.SEARXNG_URL || null;
}
