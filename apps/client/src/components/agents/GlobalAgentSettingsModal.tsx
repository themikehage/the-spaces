// SPDX-License-Identifier: MIT
import { SystemPromptViewer } from "@/components/prompts/SystemPromptViewer";
import { AvatarUploadField } from "@/components/shared/AvatarUploadField";
import { FormDialog } from "@/components/ui/FormDialog";
import { TabsNav } from "@/components/ui/TabsNav";
import { useLiterals } from "@/lib";
import { settingsService } from "@/lib/api/settings.service";
import { DEFAULT_AVATAR_PREFIX, isDefaultAvatar } from "@/lib/defaultAvatars";
import { EntityEventBus } from "@/lib/event-bus";
import { useEffect, useState } from "react";
import { literals as u } from "./GlobalAgentSettingsModal.literals";

interface Props {
  onClose: () => void;
  onSaveSuccess?: () => void;
}

export function GlobalAgentSettingsModal({ onClose, onSaveSuccess }: Props) {
  const l = useLiterals(u);
  const [activeTab, setActiveTab] = useState<"general" | "prompts">("general");
  const [factoryName, setFactoryName] = useState("Spaces");
  const [factorySystemPrompt, setFactorySystemPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Avatar state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedDefaultAvatar, setSelectedDefaultAvatar] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await settingsService.fetchSettings();
        setFactoryName(data.factoryName || "Spaces");
        setFactorySystemPrompt(data.factorySystemPrompt || "");
        const avUrl = data.factoryAvatarUrl || null;
        setAvatarPreview(avUrl);
        if (isDefaultAvatar(avUrl)) {
          setSelectedDefaultAvatar(avUrl.slice(DEFAULT_AVATAR_PREFIX.length));
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
        setError(l.loadError);
      }
    };
    fetchSettings();
  }, [l.loadError]);

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

  const handleSubmit = async () => {
    if (!factoryName.trim()) return;

    setError(null);
    setSaving(true);

    try {
      let resolvedAvatarUrl: string | undefined = undefined;
      if (selectedDefaultAvatar) {
        resolvedAvatarUrl = DEFAULT_AVATAR_PREFIX + selectedDefaultAvatar;
      } else if (avatarPreview && !avatarPreview.startsWith("blob:")) {
        resolvedAvatarUrl = avatarPreview;
      }

      await settingsService.updateSettings({
        factoryName: factoryName.trim(),
        factorySystemPrompt: factorySystemPrompt.trim(),
        factoryAvatarUrl: resolvedAvatarUrl,
      });

      if (avatarFile) {
        await settingsService.uploadFactoryAvatar(avatarFile);
      } else if (!selectedDefaultAvatar && avatarPreview === null) {
        await settingsService.deleteFactoryAvatar();
      }

      EntityEventBus.emit({ type: "settings" });

      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || l.saveError);
    } finally {
      setSaving(false);
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
      title={l.title}
      description={l.subtitle}
      onSubmit={handleSubmit}
      submitLabel={saving ? l.saving : l.save}
      cancelLabel="Cancel"
      isSubmitting={saving}
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
            entityName={factoryName}
            avatarType="agent"
          />

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              {l.factoryNameLabel}
            </label>
            <input
              type="text"
              required
              value={factoryName}
              onChange={(e) => setFactoryName(e.target.value)}
              placeholder={l.factoryNamePlaceholder}
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              {l.factorySystemPromptLabel}
            </label>
            <textarea
              value={factorySystemPrompt}
              onChange={(e) => setFactorySystemPrompt(e.target.value)}
              rows={6}
              placeholder={l.factorySystemPromptPlaceholder}
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 resize-none font-mono text-xs leading-relaxed"
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
          entityType="global"
          title={`Global Assistant Prompt Inspector (${factoryName})`}
          embedded
        />
      )}
    </FormDialog>
  );
}
