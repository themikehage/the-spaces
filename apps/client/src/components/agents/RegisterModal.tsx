// SPDX-License-Identifier: MIT
import { SystemPromptViewer } from "@/components/prompts/SystemPromptViewer";
import { AvatarUploadField } from "@/components/shared/AvatarUploadField";
import { FormDialog } from "@/components/ui/FormDialog";
import { TabsNav } from "@/components/ui/TabsNav";
import { useLiterals } from "@/lib";
import { agentsService } from "@/lib/api/agents.service";
import { DEFAULT_AVATAR_PREFIX, isDefaultAvatar } from "@/lib/defaultAvatars";
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
              setSelectedDefaultAvatar(avUrl!.replace(DEFAULT_AVATAR_PREFIX, ""));
            }
          }
        } catch (err: any) {
          setError(err.message || l.loadError);
        }
      };
      fetchDetail();
    } else {
      setForm(DEFAULT_FORM);
      setAvatarFile(null);
      setAvatarPreview(null);
      setSelectedDefaultAvatar(null);
    }
  }, [agent, l.loadError]);

  const handleAvatarChange = (file: File | null, preview: string | null) => {
    setAvatarFile(file);
    setSelectedDefaultAvatar(null);
    setAvatarPreview(preview);
  };

  const handleSelectDefaultAvatar = (avatarId: string) => {
    setSelectedDefaultAvatar(avatarId);
    setAvatarFile(null);
    setAvatarPreview(DEFAULT_AVATAR_PREFIX + avatarId);
  };

  const handleClearAvatar = () => {
    setSelectedDefaultAvatar(null);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const set =
    (key: keyof AgentDefinition) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      let resolvedAvatarUrl = form.avatarUrl;

      if (selectedDefaultAvatar) {
        resolvedAvatarUrl = DEFAULT_AVATAR_PREFIX + selectedDefaultAvatar;
      } else if (avatarFile === null && avatarPreview === null && agent?.id && onDeleteAvatar) {
        await onDeleteAvatar(agent.id);
        resolvedAvatarUrl = undefined;
      }

      const payload: AgentDefinition = {
        ...form,
        avatarUrl: resolvedAvatarUrl,
      };

      await onSubmit(payload);

      if (avatarFile && form.id && onUploadAvatar) {
        await onUploadAvatar(form.id, avatarFile);
      }

      onClose();
    } catch (err: any) {
      setError(err.message || l.saveError);
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = [
    { id: "general", label: "General" },
    { id: "prompts", label: "Inspect Prompt" },
  ];

  return (
    <FormDialog
      open
      onClose={onClose}
      title={agent ? l.editAgentTitle : l.registerAgentTitle}
      description={agent ? l.editAgentSubtitle : l.registerAgentSubtitle}
      onSubmit={handleSubmit}
      submitLabel={submitting ? l.saving : agent ? l.saveChanges : l.registerAgentTitle}
      cancelLabel="Cancel"
      isSubmitting={submitting}
      size="lg"
    >
      <div className="mb-4">
        <TabsNav
          tabs={tabs}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as "general" | "prompts")}
        />
      </div>

      {activeTab === "general" ? (
        <div className="space-y-4">
          <AvatarUploadField
            preview={avatarPreview}
            selectedDefault={selectedDefaultAvatar}
            onFileChange={handleAvatarChange}
            onSelectDefault={handleSelectDefaultAvatar}
            onClear={handleClearAvatar}
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
              Tag
            </label>
            <input
              value={form.tag || ""}
              onChange={set("tag")}
              placeholder="e.g. backend, frontend, core"
              maxLength={64}
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
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
        </div>
      ) : (
        <SystemPromptViewer
          entityType="agent"
          agentId={form.id || agent?.id}
          title={`Agent System Prompt Inspector (${form.name || form.id || "New Agent"})`}
          embedded
        />
      )}
    </FormDialog>
  );
}
