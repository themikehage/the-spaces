// SPDX-License-Identifier: MIT
import { useChatInputForm } from "@/hooks/useChatInputForm";
import type { ContextUsage } from "@/lib";
import { workspaceService } from "@/lib/api/workspace.service";
import type { EntityType } from "shared";
import { AutocompletePopover } from "./AutocompletePopover";
import { ChatInputAttachments } from "./ChatInputAttachments";
import { InputCard } from "./InputCard";
import { InputToolbar } from "./InputToolbar";

export interface MentionTarget {
  id: string;
  name: string;
}

interface AttachmentScope {
  activeProjectName?: string | null;
  activeAgentId?: string | null;
  activeChannelId?: string | null;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to read file as base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function isTextFile(file: File): boolean {
  if (file.type.startsWith("text/")) return true;
  const textExtensions = [
    ".js",
    ".ts",
    ".jsx",
    ".tsx",
    ".py",
    ".go",
    ".rs",
    ".java",
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".cs",
    ".sh",
    ".bash",
    ".sql",
    ".yaml",
    ".yml",
    ".json",
    ".md",
    ".txt",
    ".ini",
    ".conf",
    ".cfg",
    ".xml",
    ".css",
    ".html",
    ".htm",
  ];
  const name = file.name.toLowerCase();
  return textExtensions.some((ext) => name.endsWith(ext));
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        resolve("");
      }
    };
    reader.onerror = () => resolve("");
    reader.readAsText(file);
  });
}

function getMarkdownLanguage(fileName: string): string {
  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  const map: Record<string, string> = {
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".py": "python",
    ".go": "go",
    ".rs": "rust",
    ".json": "json",
    ".md": "markdown",
    ".yml": "yaml",
    ".yaml": "yaml",
    ".html": "html",
    ".css": "css",
    ".sql": "sql",
    ".sh": "bash",
    ".bash": "bash",
    ".xml": "xml",
  };
  return map[ext] || "";
}

export async function processAttachments(
  files: File[],
  scope: AttachmentScope,
): Promise<{
  extraText: string;
  images: Array<{ type: "image"; data: string; mimeType: string }>;
}> {
  const imagesToPass: Array<{ type: "image"; data: string; mimeType: string }> = [];
  let extraPromptText = "";

  const imageFiles = files.filter((f) => f.type.startsWith("image/"));
  const docFiles = files.filter((f) => !f.type.startsWith("image/"));

  for (const file of imageFiles) {
    try {
      const base64Data = await fileToBase64(file);
      imagesToPass.push({
        type: "image",
        data: base64Data,
        mimeType: file.type,
      });

      const formData = new FormData();
      formData.append("file", file);

      const params = new URLSearchParams();
      if (scope.activeProjectName) params.append("project", scope.activeProjectName);
      if (scope.activeAgentId) params.append("agentId", scope.activeAgentId);
      if (scope.activeChannelId) params.append("channelId", scope.activeChannelId);
      const url = `/api/workspace/assets/uploads${params.toString() ? `?${params.toString()}` : ""}`;

      const res = await workspaceService.fetchWorkspaceUrl(url, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        extraPromptText += `\n[Attached File: ${data.path}] (I have uploaded this image to your workspace at: ${data.path})`;
      } else {
        throw new Error(`Failed to upload image ${file.name}: ${res.statusText}`);
      }
    } catch (err) {
      console.error("Error processing image:", err);
      throw err;
    }
  }

  for (const file of docFiles) {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const params = new URLSearchParams();
      if (scope.activeProjectName) params.append("project", scope.activeProjectName);
      if (scope.activeAgentId) params.append("agentId", scope.activeAgentId);
      if (scope.activeChannelId) params.append("channelId", scope.activeChannelId);
      const url = `/api/workspace/assets/uploads${params.toString() ? `?${params.toString()}` : ""}`;

      const res = await workspaceService.fetchWorkspaceUrl(url, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        let textContent = "";
        if (isTextFile(file) && file.size < 100 * 1024) {
          const content = await readFileAsText(file);
          const lang = getMarkdownLanguage(file.name);
          textContent = `\n[File Content of ${file.name}]:\n\`\`\`${lang}\n${content}\n\`\`\``;
        }
        extraPromptText += `\n[Attached File: ${data.path}] (I have uploaded this file to your workspace at: ${data.path})${textContent}`;
      } else {
        console.error("Failed to upload file", file.name);
        throw new Error(`Failed to upload file ${file.name}: ${res.statusText}`);
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      throw err;
    }
  }

  return { extraText: extraPromptText, images: imagesToPass };
}

interface Props {
  onSend: (
    message: string,
    option?: "steer" | "follow_up",
    tools?: string[],
    images?: Array<{ type: "image"; data: string; mimeType: string }>,
  ) => void;
  onAbort: () => void;
  streaming: boolean;
  sessionId: string | null;
  onToolsChange?: (tools: string[]) => void;
  runnerActive?: boolean;
  mentionTargets?: MentionTarget[];
  activeProjectName?: string | null;
  activeAgentId?: string | null;
  activeChannelId?: string | null;
  contextUsage?: ContextUsage | null;
  onCompact?: () => void;
  compacting?: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
  entityType?: EntityType;
  entityId?: string;
  userMessages?: string[];
}

export function ChatInput({
  onSend,
  onAbort,
  streaming,
  sessionId,
  onToolsChange,
  runnerActive = false,
  mentionTargets = [],
  activeProjectName,
  activeAgentId = null,
  activeChannelId = null,
  contextUsage = null,
  onCompact,
  compacting = false,
  textareaRef: externalTextareaRef,
  disabled = false,
  entityType: customEntityType,
  entityId: customEntityId,
  userMessages,
}: Props) {
  const form = useChatInputForm({
    onSend,
    onAbort,
    streaming,
    sessionId,
    onToolsChange,
    runnerActive,
    mentionTargets,
    activeProjectName,
    activeAgentId,
    activeChannelId,
    externalTextareaRef,
    disabled,
    customEntityType,
    customEntityId,
    userMessages,
  });

  return (
    <div className="relative p-3 sm:p-4">
      <div className="relative max-w-3xl mx-auto">
        <AutocompletePopover
          mode={form.autocompleteMode}
          items={form.filteredItems}
          selectedIndex={form.autocompleteSelectedIndex}
          onSelect={(item) => {
            if (form.autocompleteMode === "mention") {
              form.insertMention(item.name);
            } else {
              form.insertSlashReference(item.name);
            }
          }}
          onClose={() => form.setAutocompleteMode(null)}
          textareaRef={form.textareaRef}
        />

        <ChatInputAttachments
          attachments={form.attachments}
          onRemoveAttachment={form.removeAttachment}
        />

        <InputCard
          streaming={streaming}
          disabled={form.disabled}
          focused={form.focused}
          attachments={form.attachments}
          onRemoveAttachment={form.removeAttachment}
          input={form.input}
          onInputChange={(val) => {
            form.handleInputChange(val);
          }}
          onKeyDown={form.handleKeyDown}
          placeholder={form.placeholderText}
          textareaRef={form.textareaRef}
          toolbar={
            <InputToolbar
              sessionId={sessionId}
              streaming={streaming}
              disabled={form.disabled}
              activeTools={form.activeTools}
              onToolsChange={form.handleToolsChange}
              skills={form.skills}
              skillsLoading={form.skillsLoading}
              onSelectSkill={(skillName) => {
                form.insertSlashReference(skillName);
              }}
              onFileClick={() => form.fileInputRef.current?.click()}
              toolStatus={form.toolStatus}
              onSend={() => form.handleSendAction()}
              onStop={onAbort}
              contextUsage={contextUsage}
              onCompact={onCompact}
              compacting={compacting}
              executionMode={form.executionMode}
              entityType={form.resolvedEntityType}
              entityId={form.resolvedEntityId}
            />
          }
        />
        <input
          type="file"
          ref={form.fileInputRef}
          onChange={form.handleFileChange}
          multiple
          className="hidden"
        />
      </div>
    </div>
  );
}
