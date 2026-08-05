// SPDX-License-Identifier: MIT
import { Lock } from "lucide-react";

interface ChatHeaderProps {
  error: string | null;
  setError: (err: string | null) => void;
  connected: boolean;
  isReadOnlyExecution: boolean;
  isChannelExecution: boolean;
}

export function ChatHeader({
  error,
  setError,
  connected,
  isReadOnlyExecution,
  isChannelExecution,
}: ChatHeaderProps) {
  return (
    <>
      {error && (
        <div className="px-3 sm:px-4 py-2 bg-destructive/10 border-b border-error/20 text-destructive text-xs flex-shrink-0">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}
      {!connected && (
        <div className="px-3 sm:px-4 py-1.5 bg-warning/10 border-b border-warning/20 text-warning text-xs flex-shrink-0 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
          Reconnecting... messages will be queued
        </div>
      )}
      {isReadOnlyExecution && (
        <div className="p-4 bg-card border-b border-input flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-400 font-medium text-xs uppercase tracking-wider font-mono">
            <Lock size={14} />
            {isChannelExecution
              ? "Ejecución CLI (Solo Lectura)"
              : "Ejecución de API (Solo Lectura)"}
          </div>
          <p className="text-[11px] text-center max-w-md font-sans">
            Esta conversación corresponde a una ejecución automática externa. Podés navegar el
            historial de mensajes y tool calls, pero no es interactiva.
          </p>
        </div>
      )}
    </>
  );
}
