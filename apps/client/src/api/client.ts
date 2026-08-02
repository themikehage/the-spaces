// SPDX-License-Identifier: MIT

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_URL || "";
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;

  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...init, headers, credentials: "include" });

  if (!res.ok) {
    let errorMsg = `HTTP error ${res.status}`;
    try {
      const data = await res.json();
      if (data && typeof data.error === "string") {
        errorMsg = data.error;
      }
    } catch {
      // JSON parsing failed, use status text
      if (res.statusText) {
        errorMsg = res.statusText;
      }
    }
    throw new ApiError(res.status, errorMsg);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return (await res.json()) as T;
}
