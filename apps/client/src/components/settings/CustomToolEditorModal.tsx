// SPDX-License-Identifier: MIT
import { customToolsService, type FolderToolDetail } from "@/lib/api/custom-tools.service";
import { AlertTriangle, Code, FileText, Layout, Save, X } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  toolName?: string;
  onSaved: () => void;
}

export function CustomToolEditorModal({ isOpen, onClose, toolName, onSaved }: Props) {
  const [activeTab, setActiveTab] = useState<"contract" | "instructions" | "ui">("contract");
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [executeType, setExecuteType] = useState<"ui" | "pipeline" | "agent" | "script">("ui");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [scriptFile, setScriptFile] = useState("scripts/execute.js");
  const [parametersJson, setParametersJson] = useState('{\n  "type": "object",\n  "properties": {}\n}');
  const [instructionsMd, setInstructionsMd] = useState("");
  const [uiHtml, setUiHtml] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (toolName) {
      setIsLoading(true);
      setError(null);
      customToolsService
        .fetchToolDetail(toolName)
        .then((detail: FolderToolDetail) => {
          const def = detail.definition as any;
          setName(def.name || toolName);
          setLabel(def.label || "");
          setDescription(def.description || "");
          setExecuteType(def.execute?.type || "ui");
          setRequiresApproval(!!def.requiresApproval);
          setScriptFile(def.execute?.file || "scripts/execute.js");
          setParametersJson(JSON.stringify(def.parameters || { type: "object", properties: {} }, null, 2));
          setInstructionsMd(detail.instructionsMd || "");
          setUiHtml(detail.uiHtml || "");
        })
        .catch((err) => {
          setError(err.message || "Failed to load custom tool details");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setName("");
      setLabel("");
      setDescription("");
      setExecuteType("ui");
      setRequiresApproval(false);
      setScriptFile("scripts/execute.js");
      setParametersJson('{\n  "type": "object",\n  "properties": {}\n}');
      setInstructionsMd("# Custom Tool Instructions\n\nProvide agent guidance here.");
      setUiHtml('<div className="p-4 bg-card rounded-xl border border-input">\n  <h3>{{title}}</h3>\n</div>');
      setError(null);
    }
  }, [isOpen, toolName]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      let paramsObj: Record<string, unknown> = { type: "object", properties: {} };
      try {
        paramsObj = JSON.parse(parametersJson);
      } catch {
        throw new Error("Parameters JSON is invalid");
      }

      let executeDef: Record<string, unknown> = { type: executeType };
      if (executeType === "script") {
        executeDef = { type: "script", file: scriptFile || "scripts/execute.js", timeout: 30000 };
      }

      const definition = {
        name,
        label: label || name,
        description,
        parameters: paramsObj,
        execute: executeDef,
        requiresApproval,
        enabled: true,
      };

      await customToolsService.saveCustomTool({
        definition,
        instructionsMd,
        uiHtml: uiHtml || undefined,
      });

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save tool");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-bg border border-input rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b border-input">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {toolName ? `Edit Tool: ${toolName}` : "Create Folder Custom Tool"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Configure parameters, instructions, script runner, and Handlebars UI template.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-2.5 bg-error/10 border border-error/20 text-error rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex border-b border-input bg-card/40 px-4">
          <button
            type="button"
            onClick={() => setActiveTab("contract")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "contract"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Contract & Parameters
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("instructions")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "instructions"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Tool.md Instructions
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ui")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "ui"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            ui/index.html (Handlebars)
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">Loading tool details...</div>
          ) : activeTab === "contract" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-foreground uppercase tracking-wider block mb-1">
                    Tool Name (snake_case)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!!toolName}
                    placeholder="my_custom_tool"
                    className="w-full text-xs font-mono bg-card border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-foreground uppercase tracking-wider block mb-1">
                    Display Label
                  </label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="My Custom Tool"
                    className="w-full text-xs bg-card border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground uppercase tracking-wider block mb-1">
                  Description (Used by Agent)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Explains what the tool does and when the agent should call it."
                  className="w-full text-xs bg-card border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-foreground uppercase tracking-wider block mb-1">
                    Execution Mode
                  </label>
                  <select
                    value={executeType}
                    onChange={(e) => setExecuteType(e.target.value as any)}
                    className="w-full text-xs bg-card border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="ui">UI Renderer</option>
                    <option value="script">Script Executor (JS/TS/Shell)</option>
                    <option value="pipeline">Pipeline Engine</option>
                    <option value="agent">Subagent Execution</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="requiresApproval"
                    checked={requiresApproval}
                    onChange={(e) => setRequiresApproval(e.target.checked)}
                    className="w-4 h-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="requiresApproval" className="text-xs font-semibold text-foreground cursor-pointer">
                    Requires User Approval Before Execution
                  </label>
                </div>
              </div>

              {executeType === "script" && (
                <div>
                  <label className="text-[11px] font-bold text-foreground uppercase tracking-wider block mb-1">
                    Script File (Relative to tool folder)
                  </label>
                  <input
                    type="text"
                    value={scriptFile}
                    onChange={(e) => setScriptFile(e.target.value)}
                    placeholder="scripts/execute.js"
                    className="w-full text-xs font-mono bg-card border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-foreground uppercase tracking-wider block mb-1">
                  Parameters JSON Schema
                </label>
                <textarea
                  value={parametersJson}
                  onChange={(e) => setParametersJson(e.target.value)}
                  rows={6}
                  className="w-full font-mono text-xs bg-card border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          ) : activeTab === "instructions" ? (
            <div>
              <label className="text-[11px] font-bold text-foreground uppercase tracking-wider block mb-1">
                Tool.md (Contextual Agent Instructions)
              </label>
              <textarea
                value={instructionsMd}
                onChange={(e) => setInstructionsMd(e.target.value)}
                rows={12}
                placeholder="# Tool Instructions&#10;Describe execution patterns and rules..."
                className="w-full font-mono text-xs bg-card border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-bold text-foreground uppercase tracking-wider block mb-1">
                ui/index.html (Handlebars HTML Template)
              </label>
              <textarea
                value={uiHtml}
                onChange={(e) => setUiHtml(e.target.value)}
                rows={12}
                placeholder="<div className='p-4 bg-card rounded-xl border border-input'>&#10;  <h3>{{result.title}}</h3>&#10;</div>"
                className="w-full font-mono text-xs bg-card border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-input bg-card/20">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !name || !description}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Saving..." : "Save Tool"}
          </button>
        </div>
      </div>
    </div>
  );
}
