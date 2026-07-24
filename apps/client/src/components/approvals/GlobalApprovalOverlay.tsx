// SPDX-License-Identifier: MIT
import { Button } from "@/components/ui/Button";
import { useAttention } from "@/hooks/useAttention";
import { attentionStore } from "@/lib/attention/attention-store";
import { AnimatePresence, motion } from "framer-motion";

import { useEffect, useState } from "react";
import type { AttentionItem } from "shared";

export function GlobalApprovalOverlay() {
  const approvals = useAttention((items) => items.filter((i) => i.kind === "approval"));

  const handleResolve = (id: string, action: "approve" | "deny", persist: boolean) => {
    attentionStore.resolveApproval(id, action, { persist });
  };

  if (approvals.length === 0) return null;

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none">
      <AnimatePresence>
        {approvals.map((approval) => (
          <ApprovalCard
            key={approval.approvalId}
            approval={approval}
            onResolve={(action, persist) => handleResolve(approval.approvalId, action, persist)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ApprovalCard({
  approval,
  onResolve,
}: {
  approval: AttentionItem;
  onResolve: (action: "approve" | "deny", persist: boolean) => void;
}) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [persist, setPersist] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      if (!approval.expiresAt) {
        setTimeLeft(0);
        return;
      }
      const remaining = Math.max(0, Math.round((approval.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [approval.expiresAt]);

  const getToolArgString = () => {
    if (approval.toolName === "bash") {
      return String(approval.args.command || "");
    }
    if (approval.toolName === "write" || approval.toolName === "edit") {
      return String(approval.args.path || approval.args.filepath || "");
    }
    return JSON.stringify(approval.args);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      className="pointer-events-auto flex flex-col p-4 rounded-xl border border-border bg-card shadow-2xl backdrop-blur-md text-foreground max-w-sm w-full gap-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Tool Approval Required
          </span>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          {timeLeft}s
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
            {approval.toolName}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            Session: {approval.sessionId.split("-")[0]}
          </span>
        </div>

        <div className="text-xs text-foreground bg-muted/50 font-mono p-2 rounded-lg border border-border/50 max-h-24 overflow-y-auto whitespace-pre-wrap break-words">
          {getToolArgString()}
        </div>

        <div className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Reason: </span>
          {approval.reason}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`persist-${approval.approvalId}`}
          checked={persist}
          onChange={(e) => setPersist(e.target.checked)}
          className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-ring bg-background cursor-pointer"
        />
        <label
          htmlFor={`persist-${approval.approvalId}`}
          className="text-[11px] text-muted-foreground select-none cursor-pointer"
        >
          Remember this decision for future actions
        </label>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={() => onResolve("deny", persist)}
        >
          Deny
        </Button>
        <Button
          variant="accent"
          size="sm"
          className="flex-1 text-xs"
          onClick={() => onResolve("approve", persist)}
        >
          Approve
        </Button>
      </div>
    </motion.div>
  );
}
