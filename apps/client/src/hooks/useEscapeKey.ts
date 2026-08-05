// SPDX-License-Identifier: MIT
import { useCallback, useEffect } from "react";

export function useEscapeKey(onEscape: () => void, enabled: boolean = true): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        onEscape();
      }
    },
    [onEscape],
  );

  useEffect(() => {
    if (enabled) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [enabled, handleKeyDown]);
}
