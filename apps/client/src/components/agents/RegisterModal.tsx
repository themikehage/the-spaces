// SPDX-License-Identifier: MIT
import { SystemPromptViewer } from "@/components/prompts/SystemPromptViewer";
import { AvatarUploadField } from "@/components/shared/AvatarUploadField";
import { Button } from "@/components/ui/Button";
import { useLiterals } from "@/lib";
import { agentsService } from "@/lib/api/agents.service";
import { DEFAULT_AVATAR_PREFIX, isDefaultAvatar } from "@/lib/defaultAvatars";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { AgentDefinition, AgentInfo } from "shared";
import { literals as u } from "./RegisterModal.literals";

const DEFAULT_FORM: AgentDefinition = {
  id: "",
  name: "",
  systemPrompt: "",
  serialTools: ["request_approval", "ask_question"],
};

interface RegisterModalProps {
  agent?: AgentInfo | null;
  onClose: () => void;
  onSubmit: (def: AgentDefinition) => Promise<unknown>;
  onUploadAvatar?: (id: string, file: File) => Promise<string>;
  onDeleteAvatar?: (id: string) => Promise<void>;
}

export function RegisterModal({
  agent,
  onClose,
  onSubmit,
  onUploadAvatar,
  onDeleteAvatar,
}: RegisterModalProps) {
  const l = useLiterals(u);
  const [activeTab, setActiveTab] = useState<"general" | "prompts">("general");
  const [form, setForm] = useState<AgentDefinition>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedDefaultAvatar, setSelectedDefaultAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (agent) {
      const fetchDetail = async () => {
        try {
          const data = await agentsService.fetchAgent(agent.id);
          const def = (data as any).definition || data;
          if (def) {
            setForm({
              ...def,
              serialTools:
                def.serialTools && def.serialTools.length > 0
                  ? def.serialTools
                  : ["request_approval", "ask_question"],
            });
            const avUrl = def.avatarUrl || null;
            setAvatarPreview(avUrl);
            if (isDefaultAvatar(avUrl)) {
              setSelectedDefaultAvatar(avUrl!.slice(DEFAULT_AVATAR_PREFIX.length));
            }
          }
        } catch (err) {
          console.error("Failed to load agent detail:", err);
        }
      };
      fetchDetail();
    }
  }, [agent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const def: AgentDefinition = {
        ...form,
        id: form.id.trim().toLowerCase().replace(/\s+/g, "-"),
        systemPrompt: form.systemPrompt?.trim() || "",
        avatarUrl: selectedDefaultAvatar
          ? DEFAULT_AVATAR_PREFIX + selectedDefaultAvatar
          : avatarPreview && !avatarPreview.startsWith("blob:") && !isDefaultAvatar(avatarPreview)
            ? avatarPreview
            : undefined,
      };
      const result = await onSubmit(def);
      const agentId = agent?.id || (result as AgentInfo)?.id;
      if (avatarFile && agentId && onUploadAvatar) {
        await onUploadAvatar(agentId, avatarFile);
      }
      if (
        !avatarFile &&
        !selectedDefaultAvatar &&
        avatarPreview === null &&
        agent?.id &&
        onDeleteAvatar
      ) {
        await onDeleteAvatar(agent.id);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || l.saveError);
    } finally {
      setSubmitting(false);
    }
  };

  const set =
    (key: keyof AgentDefinition) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-lg bg-card border border-input rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-input flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {agent ? l.editAgent : l.registerAgentTitle}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {agent ? l.editAgentDesc : l.registerAgentDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card-hover transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-input bg-bg/50 px-5 gap-4 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "general"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            General
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("prompts")}
            className={`py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "prompts"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Prompts
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "general" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <AvatarUploadField
                preview={avatarPreview}
                selectedDefault={selectedDefaultAvatar}
                onFileChange={(file, preview) => {
                  setAvatarFile(file);
                  setSelectedDefaultAvatar(null);
                  setAvatarPreview(preview);
                }}
                onSelectDefault={(avatarId) => {
                  setSelectedDefaultAvatar(avatarId);
                  setAvatarFile(null);
                  setAvatarPreview(DEFAULT_AVATAR_PREFIX + avatarId);
                }}
                onClear={() => {
                  setSelectedDefaultAvatar(null);
                  setAvatarFile(null);
                  setAvatarPreview(null);
                }}
                entityName={form.name}
                avatarType="agent"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    {l.idField}
                  </label>
                  <input
                    required
                    disabled={!!agent}
                    value={form.id}
                    onChange={set("id")}
                    placeholder={l.idPlaceholder}
                    pattern="[a-z0-9-]+"
                    title={l.idPatternTitle}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 font-mono disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    {l.nameField}
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={set("name")}
                    placeholder={l.namePlaceholder}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  {l.systemPromptField}
                </label>
                <textarea
                  required
                  value={form.systemPrompt || ""}
                  onChange={set("systemPrompt")}
                  rows={6}
                  placeholder={l.systemPromptPlaceholder}
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none font-mono leading-relaxed"
                />
              </div>

              {error && (
                <div className="bg-destructive/10 border border-error/30 text-destructive text-xs px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" type="button" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? l.saving : agent ? l.saveChanges : l.registerAgentTitle}
                </Button>
              </div>
            </form>
          ) : (
            <SystemPromptViewer
              entityType="agent"
              agentId={form.id || agent?.id}
              title={`Agent System Prompt Inspector (${form.name || form.id || "New Agent"})`}
              embedded
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}
