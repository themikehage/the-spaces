// SPDX-License-Identifier: MIT
import { authService, type User } from "@/lib/api/auth.service";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type { User };

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  needsSetup: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  const clearAppState = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("active-project");
    localStorage.removeItem("active-project-id");
    localStorage.removeItem("active-project-name");
    localStorage.removeItem("active-agent");
    localStorage.removeItem("active-channel");
    localStorage.removeItem("has-context");
    localStorage.removeItem("crewfy-selected-model");
  };

  useEffect(() => {
    authService
      .fetchAuthStatus()
      .then((data) => {
        setNeedsSetup(data.needsSetup);
        if (data.authenticated && data.user) {
          setUser(data.user);
          if (data.token) {
            setToken(data.token);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      clearAppState();
    };
    window.addEventListener("auth-unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth-unauthorized", handleUnauthorized);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    try {
      const data = await authService.login(username, password);
      setUser(data.user);
      setToken(data.token);
      setNeedsSetup(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (username: string, password: string, email?: string) => {
    setLoading(true);
    try {
      const data = await authService.register(username, password, email);
      setUser(data.user);
      setToken(data.token);
      setNeedsSetup(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setToken(null);
    clearAppState();
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await authService.changePassword(currentPassword, newPassword);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, needsSetup, login, register, logout, changePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
