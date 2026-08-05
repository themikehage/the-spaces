import { useState, useEffect } from "react";
import type { ProviderConfig } from "../api/client.ts";
import { Modal } from "./ui/Modal.tsx";
import { Button } from "./ui/Button.tsx";
import { Plus, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  providers: ProviderConfig[];
  onSave: (data: Partial<ProviderConfig>) => Promise<ProviderConfig | null>;
  onTest: (data: {
    baseUrl?: string;
    apiKey?: string;
    modelId: string;
    providerId?: string;
  }) => Promise<{ ok: boolean; message?: string; error?: string }>;
}

export function ProviderSettingsModal({ isOpen, onClose, providers, onSave, onTest }: Props) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [activeModelId, setActiveModelId] = useState("");
  const [modelsInput, setModelsInput] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok?: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (isCreatingNew) return;

    const provider = providers.find((p) => p.id === selectedId) ?? providers[0];
    if (provider) {
      setSelectedId(provider.id);
      setName(provider.name);
      setApiKey(provider.apiKey ?? "");
      setBaseUrl(provider.baseUrl ?? "");
      setActiveModelId(provider.activeModelId);
      setModelsInput(provider.models.map((m) => `${m.id}:${m.name}`).join("\n"));
      setEnabled(provider.enabled);
      setIsDefault(provider.isDefault);
      setTestResult(null);
    }
  }, [isOpen, selectedId, providers, isCreatingNew]);

  const selectProvider = (id: string) => {
    setIsCreatingNew(false);
    setSelectedId(id);
    const p = providers.find((pr) => pr.id === id);
    if (p) {
      setName(p.name);
      setApiKey(p.apiKey ?? "");
      setBaseUrl(p.baseUrl ?? "");
      setActiveModelId(p.activeModelId);
      setModelsInput(p.models.map((m) => `${m.id}:${m.name}`).join("\n"));
      setEnabled(p.enabled);
      setIsDefault(p.isDefault);
      setTestResult(null);
    }
  };

  const handleStartNew = () => {
    setIsCreatingNew(true);
    setSelectedId("");
    setName("Custom Provider");
    setApiKey("");
    setBaseUrl("");
    setActiveModelId("custom-model");
    setModelsInput("custom-model:Custom Model");
    setEnabled(true);
    setIsDefault(false);
    setTestResult(null);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await onTest({
      baseUrl: baseUrl.trim() || undefined,
      apiKey: apiKey.trim() || undefined,
      modelId: activeModelId,
      providerId: isCreatingNew ? undefined : selectedId,
    });
    setTestResult(res);
    setTesting(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const parsedModels = modelsInput
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [id, ...nameParts] = line.split(":");
        const modelName = nameParts.join(":").trim() || id!.trim();
        return { id: id!.trim(), name: modelName };
      });

    await onSave({
      id: isCreatingNew ? undefined : selectedId,
      name: name.trim() || "Custom Provider",
      type: "openai-compatible",
      baseUrl: baseUrl.trim() || undefined,
      apiKey: apiKey.trim() || undefined,
      models: parsedModels.length > 0 ? parsedModels : [{ id: activeModelId, name: activeModelId }],
      activeModelId: activeModelId.trim(),
      enabled,
      isDefault,
    });

    setIsCreatingNew(false);
    setSaving(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Provider & Model Settings"
      maxWidth="lg"
      footer={
        <>
          <Button variant="secondary" onClick={handleTest} disabled={testing} className="gap-2">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>{testing ? "Testing..." : "Test Connection"}</span>
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>{saving ? "Saving..." : "Save Changes"}</span>
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Provider Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => selectProvider(p.id)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap cursor-pointer",
                !isCreatingNew && p.id === selectedId
                  ? "bg-primary/20 text-primary border border-primary/40"
                  : "bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground border border-border",
              )}
            >
              <span>{p.name}</span>
              {p.isDefault && (
                <span className="px-1 py-0.2 text-[9px] font-semibold bg-primary text-primary-foreground rounded">
                  Default
                </span>
              )}
            </button>
          ))}
          <button
            onClick={handleStartNew}
            className={clsx(
              "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border border-dashed whitespace-nowrap cursor-pointer",
              isCreatingNew
                ? "bg-primary/20 text-primary border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-primary/50",
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Provider</span>
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-3 text-xs">
          {isCreatingNew && (
            <div className="space-y-1">
              <label className="font-medium text-foreground">Provider Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. OpenRouter / Local vLLM"
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground outline-none focus:border-primary"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="font-medium text-foreground">API Key</label>
            <div className="relative flex items-center">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full pl-3 pr-10 py-2 rounded-lg bg-surface border border-border text-foreground outline-none focus:border-primary font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-foreground">Base URL (Optional)</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground outline-none focus:border-primary font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-foreground">Active Model ID</label>
            <input
              type="text"
              value={activeModelId}
              onChange={(e) => setActiveModelId(e.target.value)}
              placeholder="gpt-4o-mini"
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground outline-none focus:border-primary font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-foreground">
              Available Models (format: model_id:Display Name)
            </label>
            <textarea
              rows={3}
              value={modelsInput}
              onChange={(e) => setModelsInput(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground outline-none focus:border-primary font-mono leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-foreground">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span>Enable Provider</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-foreground">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span>Set as Default</span>
            </label>
          </div>

          {testResult && (
            <div
              className={clsx(
                "p-3 rounded-lg border flex items-center gap-2 font-mono text-xs animate-card-enter",
                testResult.ok
                  ? "bg-success/15 border-success/40 text-success"
                  : "bg-error/15 border-error/40 text-error",
              )}
            >
              {testResult.ok ? (
                <>
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Connection successful!</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Error: {testResult.error}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
