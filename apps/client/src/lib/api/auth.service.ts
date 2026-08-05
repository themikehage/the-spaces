// SPDX-License-Identifier: MIT
import { apiFetch } from "@/lib/api";

export interface User {
  username: string;
}

export interface AuthStatusResponse {
  needsSetup: boolean;
  authenticated: boolean;
  user?: User;
  token?: string;
}

export interface AuthResponse {
  user: User;
  token: string | null;
}

async function fetchAuthStatus(): Promise<AuthStatusResponse> {
  const res = await apiFetch("/api/auth/status");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function login(username: string, password: string): Promise<AuthResponse> {
  const res = await apiFetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Login failed");
  }
  return res.json();
}

async function register(username: string, password: string, email?: string): Promise<AuthResponse> {
  const res = await apiFetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, email }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Registration failed");
  }
  return res.json();
}

async function logout(): Promise<void> {
  await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
}

async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await apiFetch("/api/auth/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to change password");
  }
}

export const authService = {
  fetchAuthStatus,
  login,
  register,
  logout,
  changePassword,
};
