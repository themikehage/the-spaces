// SPDX-License-Identifier: MIT
import { storage } from "@/lib/storage";
import { useCallback, useEffect, useState } from "react";

export interface NavigationStackItem {
  type:
    | "home"
    | "sessions"
    | "chat"
    | "settings"
    | "skills"
    | "logs"
    | "plugins"
    | "admin"
    | (string & {});
  page: string;
  path: string;
  projectId?: string;
  projectName?: string;
  agentId?: string;
  agentName?: string;
  teamId?: string;
  teamName?: string;
  sessionId?: string;
  sessionTitle?: string;
}

export interface UseNavigationStackReturn {
  stack: NavigationStackItem[];
  current: NavigationStackItem | null;
  canGoBack: boolean;
  push: (item: NavigationStackItem) => void;
  pop: () => NavigationStackItem | null;
  clear: () => void;
}

export function useNavigationStack(): UseNavigationStackReturn {
  const [stack, setStack] = useState<NavigationStackItem[]>(() => {
    const stored = storage.getJSON<NavigationStackItem[]>("navStackMobile");
    return Array.isArray(stored) && stored.length > 0
      ? stored
      : [{ type: "home", page: "home", path: "/" }];
  });

  useEffect(() => {
    storage.setJSON("navStackMobile", stack);
  }, [stack]);

  const current = stack[stack.length - 1] || null;
  const canGoBack = stack.length > 1;

  const push = useCallback((item: NavigationStackItem) => {
    setStack((prev) => {
      const top = prev[prev.length - 1];
      if (top && top.type === item.type && top.page === item.page && top.path === item.path) {
        return prev;
      }
      return [...prev, item];
    });
  }, []);

  const pop = useCallback((): NavigationStackItem | null => {
    let popped: NavigationStackItem | null = null;
    setStack((prev) => {
      if (prev.length <= 1) return prev;
      const newStack = [...prev];
      popped = newStack.pop() || null;
      return newStack;
    });
    return popped;
  }, []);

  const clear = useCallback(() => {
    setStack([{ type: "home", page: "home", path: "/" }]);
  }, []);

  return {
    stack,
    current,
    push,
    pop,
    canGoBack,
    clear,
  };
}
