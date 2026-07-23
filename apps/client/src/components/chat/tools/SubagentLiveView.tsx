import { useEffect, useRef, useState } from "react";

interface SubagentLiveViewProps {
  toolCallId: string;
  isComplete: boolean;
}

interface LogEntry {
  id: string;
  type: "token" | "thinking" | "tool_start" | "tool_end" | "info" | "error";
  text: string;
  timestamp: number;
}

export function SubagentLiveView({ toolCallId, isComplete }: SubagentLiveViewProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);



  useEffect(() => {
    if (isComplete) return;

    const handleSubagentEvent = (e: Event) => {
      const evt = (e as CustomEvent).detail;
      if (!evt) return;

      const timestamp = Date.now();
      const uniqueId = `${timestamp}-${Math.random()}`;

      setLogs((prev) => {
        const next = [...prev];

        if (evt.type === "token" || evt.type === "thinking") {
          const typeLabel = evt.type === "thinking" ? "thinking" : "token";
          
          // If the last log entry is of the same type, append to it to reduce vertical noise
          const lastEntry = next[next.length - 1];
          if (lastEntry && lastEntry.type === typeLabel) {
            lastEntry.text += evt.text;
            return [...next];
          } else {
            return [
              ...next,
              {
                id: uniqueId,
                type: typeLabel,
                text: evt.text,
                timestamp,
              },
            ];
          }
        }

        if (evt.type === "tool_call_start") {
          return [
            ...next,
            {
              id: uniqueId,
              type: "tool_start",
              text: `🔨 Running: ${evt.name}(${JSON.stringify(evt.arguments || {})})`,
              timestamp,
            },
          ];
        }

        if (evt.type === "tool_call_end") {
          const resultStr = typeof evt.result === "string" 
            ? evt.result 
            : JSON.stringify(evt.result || "");
          const truncatedResult = resultStr.length > 250 
            ? `${resultStr.substring(0, 250)}...` 
            : resultStr;
          return [
            ...next,
            {
              id: uniqueId,
              type: "tool_end",
              text: `✅ Result (${evt.name}): ${truncatedResult}`,
              timestamp,
            },
          ];
        }

        if (evt.type === "error") {
          return [
            ...next,
            {
              id: uniqueId,
              type: "error",
              text: `❌ Error: ${evt.error}`,
              timestamp,
            },
          ];
        }

        if (evt.type === "agent_start") {
          return [
            ...next,
            {
              id: uniqueId,
              type: "info",
              text: `🚀 Subagent execution started`,
              timestamp,
            },
          ];
        }

        if (evt.type === "agent_end") {
          return [
            ...next,
            {
              id: uniqueId,
              type: "info",
              text: `🏁 Subagent execution finished`,
              timestamp,
            },
          ];
        }

        return prev;
      });
    };

    window.addEventListener(`subagent-event-${toolCallId}`, handleSubagentEvent);
    return () => {
      window.removeEventListener(`subagent-event-${toolCallId}`, handleSubagentEvent);
    };
  }, [toolCallId, isComplete]);

  // Auto-scroll to bottom of logs
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  if (isComplete && logs.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[10px] text-text-secondary font-mono font-medium tracking-wider uppercase">
        <span>Actividad en tiempo real</span>
        {!isComplete && (
          <span className="flex items-center gap-1 text-accent animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            LIVE
          </span>
        )}
      </div>
      <div
        ref={containerRef}
        className="bg-bg/95 border border-border/40 rounded-lg p-3 max-h-[160px] overflow-y-auto font-mono text-[10px] leading-relaxed flex flex-col gap-2 scrollbar-thin shadow-inner"
      >
        {logs.length === 0 ? (
          <div className="text-text-secondary/50 italic text-[9px] animate-pulse">
            Esperando eventos de ejecución...
          </div>
        ) : (
          logs.map((log) => {
            let textColor = "text-text-secondary";
            if (log.type === "tool_start") textColor = "text-accent font-semibold";
            if (log.type === "tool_end") textColor = "text-green-400/90";
            if (log.type === "error") textColor = "text-red-400 font-medium";
            if (log.type === "info") textColor = "text-text-primary/70 font-medium";
            if (log.type === "thinking") textColor = "text-yellow-500/80 italic";

            return (
              <div key={log.id} className={`${textColor} whitespace-pre-wrap break-words`}>
                {log.type === "thinking" && <span className="text-[9px] not-italic mr-1 text-yellow-500/50">💭 [thinking]</span>}
                {log.text}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
