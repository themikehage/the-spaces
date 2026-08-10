// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState } from "react";

interface CustomHtmlProps {
  html: string;
  title?: string;
  height?: string;
  tokens: string;
}

const AUTO_RESIZE_SCRIPT = `
<script>
  (function() {
    function notifyHeight() {
      try {
        var body = document.body;
        var html = document.documentElement;
        var height = Math.max(
          body ? body.scrollHeight : 0,
          body ? body.offsetHeight : 0,
          html ? html.clientHeight : 0,
          html ? html.scrollHeight : 0,
          html ? html.offsetHeight : 0
        );
        if (height > 0) {
          window.parent.postMessage({ type: 'SPACES_CUSTOM_UI_RESIZE', height: height }, '*');
        }
      } catch (e) {}
    }
    window.addEventListener('load', notifyHeight);
    window.addEventListener('resize', notifyHeight);
    if (typeof ResizeObserver !== 'undefined' && document.body) {
      new ResizeObserver(notifyHeight).observe(document.body);
    }
    setTimeout(notifyHeight, 50);
    setTimeout(notifyHeight, 300);
  })();
</script>
`;

export function CustomHtmlComponent({ html, title, height, tokens }: CustomHtmlProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [computedHeight, setComputedHeight] = useState<number | null>(null);

  // Process HTML with theme CSS tokens and auto-resize script
  const cssStyles = `<style>${tokens}</style>`;
  let processedHtml = html;

  if (processedHtml.includes("</head>") || processedHtml.includes("</HEAD>")) {
    processedHtml = processedHtml.replace(/(<\/head\s*>)/i, `${cssStyles}${AUTO_RESIZE_SCRIPT}$1`);
  } else if (processedHtml.includes("<html") || processedHtml.includes("<HTML")) {
    processedHtml = processedHtml.replace(/(<html[^>]*>)/i, `$1<head>${cssStyles}${AUTO_RESIZE_SCRIPT}</head>`);
  } else {
    processedHtml = `${cssStyles}${AUTO_RESIZE_SCRIPT}${processedHtml}`;
  }

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "SPACES_CUSTOM_UI_RESIZE" && typeof event.data.height === "number") {
        setComputedHeight(event.data.height);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleLoad = () => {
    try {
      const doc = iframeRef.current?.contentWindow?.document;
      if (doc && doc.body) {
        const h = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight);
        if (h > 0) {
          setComputedHeight(h);
        }
      }
    } catch {
      // Cross-origin fallback, handled via postMessage
    }
  };

  const iframeHeight = height || (computedHeight ? `${computedHeight}px` : "auto");

  return (
    <div className="w-full my-2 overflow-hidden rounded-xl border border-border/60 bg-card/40 transition-all duration-200">
      <iframe
        ref={iframeRef}
        srcDoc={processedHtml}
        title={title || "Custom Tool UI"}
        onLoad={handleLoad}
        sandbox="allow-scripts allow-forms"
        className="w-full border-0 bg-transparent block"
        style={{
          height: iframeHeight,
          minHeight: height ? undefined : "120px",
        }}
      />
    </div>
  );
}
