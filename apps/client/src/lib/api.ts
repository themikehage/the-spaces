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

export async function apiFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_URL || "";
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;

  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...init, headers, credentials: "include" });

  if (res.status === 401) {
    window.dispatchEvent(new Event("auth-unauthorized"));
  }

  if (!res.ok) {
    let errorMsg = `HTTP error ${res.status}`;
    try {
      const data = await res.json();
      if (data && typeof data.error === "string") {
        errorMsg = data.error;
      }
    } catch {
      if (res.statusText) {
        errorMsg = res.statusText;
      }
    }
    throw new ApiError(res.status, errorMsg);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const data = await res.json();

  if (data && typeof data === "object") {
    Object.defineProperty(data, "ok", {
      value: true,
      writable: true,
      configurable: true,
      enumerable: false,
    });
    Object.defineProperty(data, "json", {
      value: () => Promise.resolve(data),
      writable: true,
      configurable: true,
      enumerable: false,
    });
    Object.defineProperty(data, "status", {
      value: res.status,
      writable: true,
      configurable: true,
      enumerable: false,
    });
  }

  return data as T;
}
