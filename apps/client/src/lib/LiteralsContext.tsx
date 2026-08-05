// SPDX-License-Identifier: MIT
import { storage } from "@/lib/storage";
import { createContext, useCallback, useEffect, useState, type ReactNode } from "react";
import type { LiteralsContextValue, SupportedLocale } from "./types";

function detectLocale(): SupportedLocale {
  try {
    const stored = storage.get("locale");
    if (stored === "en" || stored === "es") return stored;
    const browser = navigator.language?.startsWith("es") ? "es" : "en";
    storage.set("locale", browser);
    return browser;
  } catch {
    return "en";
  }
}

export const LiteralsContext = createContext<LiteralsContextValue>({
  locale: "en",
  setLocale: () => {},
});

export function LiteralsProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(detectLocale);

  const setLocale = useCallback((l: SupportedLocale) => {
    setLocaleState(l);
    storage.set("locale", l);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <LiteralsContext.Provider value={{ locale, setLocale }}>{children}</LiteralsContext.Provider>
  );
}
