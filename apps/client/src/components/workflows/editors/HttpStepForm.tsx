import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";
import { CredentialPicker } from "../CredentialPicker";
import { Plus, Trash2 } from "lucide-react";
import React, { useState } from "react";
import type { WorkflowStep } from "shared";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const HTTP_METHOD_OPTIONS: DropdownOption<HttpMethod>[] = [
  { value: "GET", label: "GET" },
  { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" },
  { value: "PATCH", label: "PATCH" },
  { value: "DELETE", label: "DELETE" },
];

interface HttpStepFormProps {
  step: WorkflowStep;
  onUpdate: (updated: WorkflowStep) => void;
  onFocusField: (field: "httpUrl" | "httpBody") => void;
}

export const HttpStepForm: React.FC<HttpStepFormProps> = ({
  step,
  onUpdate,
  onFocusField,
}) => {
  const method = step.httpMethod || "GET";
  const headers = step.httpHeaders || {};
  const mappings = step.httpResponseMapping || {};
  const [headerKey, setHeaderKey] = useState("");
  const [headerValue, setHeaderValue] = useState("");
  const [mapKey, setMapKey] = useState("");
  const [mapPath, setMapPath] = useState("");

  const addHeader = () => {
    if (!headerKey.trim()) return;
    const nextHeaders = { ...headers, [headerKey.trim()]: headerValue.trim() };
    onUpdate({ ...step, httpHeaders: nextHeaders });
    setHeaderKey("");
    setHeaderValue("");
  };

  const removeHeader = (keyToRemove: string) => {
    const nextHeaders = { ...headers };
    delete nextHeaders[keyToRemove];
    onUpdate({ ...step, httpHeaders: nextHeaders });
  };

  const addMapping = () => {
    if (!mapKey.trim() || !mapPath.trim()) return;
    const nextMappings = { ...mappings, [mapKey.trim()]: mapPath.trim() };
    onUpdate({ ...step, httpResponseMapping: nextMappings });
    setMapKey("");
    setMapPath("");
  };

  const removeMapping = (keyToRemove: string) => {
    const nextMappings = { ...mappings };
    delete nextMappings[keyToRemove];
    onUpdate({ ...step, httpResponseMapping: nextMappings });
  };

  const isBodyAllowed = ["POST", "PUT", "PATCH"].includes(method);

  const getMethodColor = () => {
    switch (method) {
      case "GET":
        return "text-emerald-400 border-emerald-800/40 bg-emerald-950/20";
      case "POST":
        return "text-blue-400 border-blue-800/40 bg-blue-950/20";
      case "PUT":
        return "text-amber-400 border-amber-800/40 bg-amber-950/20";
      case "PATCH":
        return "text-purple-400 border-purple-800/40 bg-purple-950/20";
      case "DELETE":
        return "text-rose-400 border-rose-800/40 bg-rose-950/20";
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-sky-300 mb-1">Method & URL</label>
        <div className="flex gap-2">
          <div className="w-28">
            <Dropdown
              value={method}
              onChange={(val) => onUpdate({ ...step, httpMethod: val })}
              options={HTTP_METHOD_OPTIONS}
              matchWidth
              className={`w-full font-mono text-xs ${getMethodColor()}`}
            />
          </div>
          <input
            type="text"
            value={step.httpUrl || ""}
            onFocus={() => onFocusField("httpUrl")}
            onChange={(e) => onUpdate({ ...step, httpUrl: e.target.value })}
            placeholder="https://api.example.com/v1/resource"
            className="flex-1 px-3 py-1.5 rounded-lg bg-sky-950/30 border border-sky-800/40 text-sky-200 text-xs font-mono focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      <CredentialPicker
        value={step.httpCredentialId}
        onChange={(credentialId) => onUpdate({ ...step, httpCredentialId: credentialId })}
      />

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          Custom HTTP Headers
        </label>
        <div className="space-y-1.5">
          {Object.entries(headers).map(([k, v]) => (
            <div
              key={k}
              className="flex items-center justify-between gap-2 p-1.5 rounded bg-accent/40 border border-border text-xs font-mono"
            >
              <span className="text-foreground">{k}:</span>
              <span className="text-muted-foreground truncate max-w-[120px]">{v}</span>
              <button
                onClick={() => removeHeader(k)}
                className="text-destructive hover:text-destructive/80 p-0.5 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}

          <div className="flex gap-1.5 pt-1">
            <input
              type="text"
              value={headerKey}
              onChange={(e) => setHeaderKey(e.target.value)}
              placeholder="Header Key"
              className="w-1/2 px-2 py-1 rounded bg-accent/50 border border-border text-xs font-mono text-foreground"
            />
            <input
              type="text"
              value={headerValue}
              onChange={(e) => setHeaderValue(e.target.value)}
              placeholder="Value"
              className="w-1/2 px-2 py-1 rounded bg-accent/50 border border-border text-xs font-mono text-foreground"
            />
            <button
              onClick={addHeader}
              type="button"
              className="p-1 rounded bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {isBodyAllowed && (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Request Body (JSON / Text)
          </label>
          <textarea
            value={
              typeof step.httpBody === "object"
                ? JSON.stringify(step.httpBody, null, 2)
                : String(step.httpBody || "")
            }
            onFocus={() => onFocusField("httpBody")}
            onChange={(e) => {
              const val = e.target.value;
              try {
                const parsed = JSON.parse(val);
                onUpdate({ ...step, httpBody: parsed });
              } catch {
                onUpdate({ ...step, httpBody: val });
              }
            }}
            rows={4}
            placeholder='{ "key": "{{ $inputs.val }}" }'
            className="w-full px-3 py-2 rounded-lg bg-accent/50 border border-border text-foreground text-xs font-mono focus:outline-none focus:border-sky-500"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          Response Data Extraction (JSONPath)
        </label>
        <div className="space-y-1.5">
          {Object.entries(mappings).map(([k, p]) => (
            <div
              key={k}
              className="flex items-center justify-between gap-2 p-1.5 rounded bg-sky-950/20 border border-sky-800/30 text-xs font-mono"
            >
              <span className="text-sky-300 font-bold">{k}</span>
              <span className="text-muted-foreground">&larr; {p}</span>
              <button
                onClick={() => removeMapping(k)}
                className="text-destructive hover:text-destructive/80 p-0.5 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}

          <div className="flex gap-1.5 pt-1">
            <input
              type="text"
              value={mapKey}
              onChange={(e) => setMapKey(e.target.value)}
              placeholder="Output Key"
              className="w-1/2 px-2 py-1 rounded bg-accent/50 border border-border text-xs font-mono text-foreground"
            />
            <input
              type="text"
              value={mapPath}
              onChange={(e) => setMapPath(e.target.value)}
              placeholder="$.data.id"
              className="w-1/2 px-2 py-1 rounded bg-accent/50 border border-border text-xs font-mono text-foreground"
            />
            <button
              onClick={addMapping}
              type="button"
              className="p-1 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          Timeout (ms)
        </label>
        <input
          type="number"
          value={step.httpTimeoutMs || 10000}
          onChange={(e) => onUpdate({ ...step, httpTimeoutMs: Number(e.target.value) || 10000 })}
          className="w-full px-3 py-1.5 rounded-lg bg-accent/50 border border-border text-foreground text-xs font-mono"
        />
      </div>
    </div>
  );
};
