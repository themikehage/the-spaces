import { useEffect, useRef, useState, useCallback } from "react";

export function useChatScroll<T extends HTMLElement>(deps: unknown[]) {
  const containerRef = useRef<T | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const checkIfAtBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 80;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsAtBottom(distanceToBottom <= threshold);
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
    setIsAtBottom(true);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => checkIfAtBottom();
    el.addEventListener("scroll", handleScroll, { passive: true });

    return () => el.removeEventListener("scroll", handleScroll);
  }, [checkIfAtBottom]);

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom(false);
    }
  }, [deps, isAtBottom, scrollToBottom]);

  return { containerRef, isAtBottom, scrollToBottom };
}
