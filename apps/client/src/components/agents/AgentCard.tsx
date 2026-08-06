// SPDX-License-Identifier: MIT
import { EntityCustomToolsEditor } from "@/components/settings/EntityCustomToolsEditor";
import { AgentAvatar } from "@/components/shared/AgentAvatar";
import { EntitySkillsEditor } from "@/components/shared/EntitySkillsEditor";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";
import { useLiterals } from "@/lib";
import { literals as u } from "@/pages/AgentsPage.literals";
import { motion } from "framer-motion";
import { Settings2 } from "lucide-react";
import { useState } from "react";
import type { AgentInfo } from "shared";

const STATUS_COLORS: Record<string, string> = {
  starting: "text-warning bg-warning/10 border-warning/30",
  idle: "text-primary bg-primary/10 border-primary/30",
  streaming: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  error: "text-destructive bg-destructive/10 border-error/30",
  stopped: "text-muted-foreground bg-card border-input",
};

const STATUS_DOT: Record<string, string> = {
  starting: "bg-warning animate-pulse",
  idle: "bg-primary",
  streaming: "bg-blue-400 animate-pulse",
  error: "bg-destructive",
  stopped: "bg-text-secondary",
};

export function AgentCard({
  agent,
  onDelete,
  onChat,
  onExecutions,
  onConfig,
}: {
  agent: AgentInfo;
  onDelete: (id: string) => void;
  onChat: (agent: { id: string; name: string; avatarUrl?: string }) => void;
  onExecutions: (agent: { id: string; name: string }) => void;
  onConfig: (agent: { id: string; name: string }) => void;
}) {
  const l = useLiterals(u);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const executeDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(agent.id);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="bg-card border border-input rounded-xl p-4 flex flex-col gap-3 hover:border-primary/20 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <AgentAvatar name={agent.name} avatarUrl={agent.avatarUrl} size="md" />
          <div className="min-w-0">
            <p className="font-medium text-foreground text-sm truncate">{agent.name}</p>
            <p className="text-muted-foreground text-xs font-mono truncate">{agent.id}</p>
          </div>
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${
            STATUS_COLORS[agent.status] ?? STATUS_COLORS.stopped
          }`}
        >
          <span className="flex items-center gap-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[agent.status] ?? "bg-text-secondary"}`}
            />
            {agent.status}
          </span>
        </span>
      </div>

      {agent.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {agent.tags && agent.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {agent.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {new Date(agent.createdAt).toLocaleTimeString()}
        </span>
      </div>

      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={() => onChat({ id: agent.id, name: agent.name, avatarUrl: agent.avatarUrl })}
          disabled={agent.status === "stopped" || agent.status === "error"}
          className="flex-1 py-1.5 px-2 text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Chat
        </button>
        <button
          onClick={() => onExecutions({ id: agent.id, name: agent.name })}
          className="flex-1 py-1.5 px-2 text-[11px] font-medium bg-card-hover text-foreground border border-input rounded-lg hover:bg-card-hover/80 transition-colors cursor-pointer"
        >
          Historial
        </button>
        <button
          onClick={() => onConfig({ id: agent.id, name: agent.name })}
          className="p-1.5 text-muted-foreground hover:text-foreground border border-input rounded-lg hover:bg-card-hover/80 transition-colors cursor-pointer"
          title="Configure Skills & Custom Tools"
        >
          <Settings2 size={14} />
        </button>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="py-1.5 px-2 text-[11px] font-medium text-destructive border border-error/20 rounded-lg hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {deleting ? l.deleting : l.delete}
        </button>
      </div>
      <ConfirmModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={executeDelete}
        title={l.deleteTitle ?? "Delete Agent"}
        message={`${l.deleteConfirm_1}${agent.name}${l.deleteConfirm_2}`}
        confirmLabel={l.delete ?? "Delete"}
        destructive
        loading={deleting}
      />
    </motion.div>
  );
}

export function AgentConfigModal({
  agent,
  onClose,
}: {
  agent: { id: string; name: string };
  onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} title={`Agent Configuration: ${agent.name}`}>
      <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
        <EntitySkillsEditor entityType="agent" entityId={agent.id} title="Agent Skills" />
        <EntityCustomToolsEditor
          entityType="agent"
          entityId={agent.id}
          title="Agent Custom Tools"
        />
      </div>
    </Modal>
  );
}
