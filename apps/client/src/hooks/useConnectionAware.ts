// SPDX-License-Identifier: MIT
import { wsClient } from "@/lib/ws-client";
import { useEffect, useRef } from "react";

export function useConnectionAwareEffect(
  action: () => void | (() => void),
  deps: React.DependencyList,
): void {
  const actionRef = useRef(action);
  actionRef.current = action;

  const lastDepsRef = useRef<string>("");
  const wasConnectedRef = useRef<boolean>(false);
  const hasRunForCurrentDepsRef = useRef<boolean>(false);
  const cleanupRef = useRef<(() => void) | void>(undefined);

  const runAction = () => {
    if (typeof cleanupRef.current === "function") {
      try {
        cleanupRef.current();
      } catch (err) {
        console.error("[useConnectionAwareEffect] Cleanup error:", err);
      }
      cleanupRef.current = undefined;
    }
    cleanupRef.current = actionRef.current();
  };

  useEffect(() => {
    const depsKey = JSON.stringify(deps);
    const depsChanged = lastDepsRef.current !== depsKey;

    if (depsChanged) {
      lastDepsRef.current = depsKey;
      hasRunForCurrentDepsRef.current = false;
    }

    const isCurrentlyConnected = wsClient.getState() === "connected";

    if (isCurrentlyConnected && (!hasRunForCurrentDepsRef.current || depsChanged)) {
      runAction();
      hasRunForCurrentDepsRef.current = true;
      wasConnectedRef.current = true;
    } else if (!isCurrentlyConnected) {
      wasConnectedRef.current = false;
    }

    const unsub = wsClient.onStateChange((state) => {
      if (state === "connected") {
        if (!wasConnectedRef.current || !hasRunForCurrentDepsRef.current) {
          runAction();
          hasRunForCurrentDepsRef.current = true;
        }
        wasConnectedRef.current = true;
      } else if (state === "disconnected") {
        wasConnectedRef.current = false;
        hasRunForCurrentDepsRef.current = false;
      }
    });

    return () => {
      unsub();
      if (typeof cleanupRef.current === "function") {
        try {
          cleanupRef.current();
        } catch {
          /* noop */
        }
        cleanupRef.current = undefined;
      }
    };
  }, deps);
}
