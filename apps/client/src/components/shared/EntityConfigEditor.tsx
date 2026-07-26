// SPDX-License-Identifier: MIT
import { useEffect, useState } from "react";
import {
  AVAILABLE_TOOLS,
  type EntityConfigType,
  type EntityType,
} from "shared";
import { useEntityConfig } from "@/hooks/useEntityConfig";
import { apiFetch } from "@/lib/api";
import {
  AlertCircle,
  Check,
  Layers,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Shield,
  Sliders,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";

interface EntityConfigEditorProps {
  entityType: EntityType;
  entityId: string;
  title?: string;
  description?: string;
}

interface ModelOption {
  id: string;
  name: string;
  provider: string;
}

export function EntityConfigEditor({
  entityType,
  entityId,
  title,
  description,
}: EntityConfigEditorProps) {
  const {
    config,
    resolvedConfig,
    isLoading,
    isSaving,
    error,
    updateConfig,
  } = useEntityConfig(entityType, entityId);

  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [draft, setDraft] = useState<EntityConfigType>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newSkillInput, setNewSkillInput] = useState("");

  useEffect(() => {
    setDraft(config);
  }, [config]);

  useEffect(() => {
    async function loadModels() {
      try {
        const res = await apiFetch("/api/models");
        if (res.ok) {
          const data = await res.json();
          setAvailableModels(data.models || []);
        }
      } catch (e) {
        console.error("Failed to fetch models for EntityConfigEditor:", e);
      }
    }
    loadModels();
  }, []);

  const handleSave = async () => {
    setSaveSuccess(false);
    const success = await updateConfig(draft);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const isModelOverridden = Boolean(draft.defaultModel);

  const toolAddSet = new Set(draft.toolOverrides?.add || []);
  const toolRemoveSet = new Set(draft.toolOverrides?.remove || []);

  const toggleToolAdd = (tool: string) => {
    const nextAdd = new Set(toolAddSet);
    const nextRemove = new Set(toolRemoveSet);

    if (nextAdd.has(tool)) {
      nextAdd.delete(tool);
    } else {
      nextAdd.add(tool);
      nextRemove.delete(tool);
    }

    setDraft({
      ...draft,
      toolOverrides: {
        add: Array.from(nextAdd),
        remove: Array.from(nextRemove),
      },
    });
  };

  const toggleToolRemove = (tool: string) => {
    const nextAdd = new Set(toolAddSet);
    const nextRemove = new Set(toolRemoveSet);

    if (nextRemove.has(tool)) {
      nextRemove.delete(tool);
    } else {
      nextRemove.add(tool);
      nextAdd.delete(tool);
    }

    setDraft({
      ...draft,
      toolOverrides: {
        add: Array.from(nextAdd),
        remove: Array.from(nextRemove),
      },
    });
  };

  const setPermission = (
    tool: string,
    mode: "allow" | "deny" | "ask" | "inherit",
  ) => {
    const nextPerms = { ...(draft.permissionOverrides || {}) };
    if (mode === "inherit") {
      delete nextPerms[tool];
    } else {
      nextPerms[tool] = mode;
    }
    setDraft({
      ...draft,
      permissionOverrides:
        Object.keys(nextPerms).length > 0 ? nextPerms : undefined,
    });
  };

  const addSkill = () => {
    if (!newSkillInput.trim()) return;
    const currentSkills = draft.skills || [];
    if (!currentSkills.includes(newSkillInput.trim())) {
      setDraft({
        ...draft,
        skills: [...currentSkills, newSkillInput.trim()],
      });
    }
    setNewSkillInput("");
  };

  const removeSkill = (sk: string) => {
    const currentSkills = draft.skills || [];
    setDraft({
      ...draft,
      skills: currentSkills.filter((s) => s !== sk),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-neutral-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span>Cargando configuración de entidad...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <div>
          <h3 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            {title || `Configuración de ${entityType}`}
          </h3>
          {description && (
            <p className="text-sm text-neutral-400 mt-1">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setDraft(config)}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200 border border-neutral-700 hover:border-neutral-600 rounded-md transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Deshacer
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saveSuccess ? "Guardado" : "Guardar Cambios"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-md text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Modelo Por Defecto */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-neutral-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Modelo Por Defecto
          </label>
          {entityType !== "global" && (
            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                isModelOverridden
                  ? "bg-indigo-950 text-indigo-300 border border-indigo-700/50"
                  : "bg-neutral-800 text-neutral-400"
              }`}
            >
              {isModelOverridden ? "Sobreescrito" : "Heredado de Global"}
            </span>
          )}
        </div>

        <select
          value={draft.defaultModel || ""}
          onChange={(e) =>
            setDraft({
              ...draft,
              defaultModel: e.target.value ? e.target.value : undefined,
            })
          }
          className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="">
            {entityType === "global"
              ? "-- Usar modelo predeterminado del sistema --"
              : `-- Heredar modelo (${resolvedConfig.defaultModel || "Por defecto"}) --`}
          </option>
          {availableModels.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.provider})
            </option>
          ))}
        </select>
      </div>

      {/* Overrides de Herramientas */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-neutral-200 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-400" />
            Control de Herramientas (Tool Overrides)
          </label>
          <span className="text-xs text-neutral-400">
            {toolAddSet.size} añadidas, {toolRemoveSet.size} desactivadas
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
          {AVAILABLE_TOOLS.map((tool) => {
            const isAdded = toolAddSet.has(tool);
            const isRemoved = toolRemoveSet.has(tool);

            return (
              <div
                key={tool}
                className="flex items-center justify-between bg-neutral-950 border border-neutral-800/80 rounded px-2.5 py-1.5 text-xs"
              >
                <span className="font-mono text-neutral-300 truncate">
                  {tool}
                </span>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    title="Forzar añadir"
                    onClick={() => toggleToolAdd(tool)}
                    className={`p-1 rounded transition-colors ${
                      isAdded
                        ? "bg-emerald-600 text-white font-bold"
                        : "text-neutral-500 hover:text-emerald-400 hover:bg-neutral-800"
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    title="Desactivar"
                    onClick={() => toggleToolRemove(tool)}
                    className={`p-1 rounded transition-colors ${
                      isRemoved
                        ? "bg-rose-600 text-white font-bold"
                        : "text-neutral-500 hover:text-rose-400 hover:bg-neutral-800"
                    }`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overrides de Permisos */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-neutral-200 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            Overrides de Permisos Dinámicos
          </label>
        </div>

        <div className="space-y-2">
          {["bash", "write", "edit", "read", "manage_delegations"].map((t) => {
            const currentMode = draft.permissionOverrides?.[t] || "inherit";
            const resolvedMode = resolvedConfig.permissionOverrides?.[t];

            return (
              <div
                key={t}
                className="flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-neutral-200">{t}</span>
                  {resolvedMode && currentMode === "inherit" && (
                    <span className="text-[10px] text-neutral-500 font-sans">
                      (Resuelto: {resolvedMode})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded border border-neutral-800">
                  {(["inherit", "allow", "ask", "deny"] as const).map(
                    (mode) => (
                      <button
                        key={mode}
                        onClick={() => setPermission(t, mode)}
                        className={`px-2 py-0.5 rounded capitalize text-[10px] font-medium transition-colors ${
                          currentMode === mode
                            ? mode === "allow"
                              ? "bg-emerald-600 text-white"
                              : mode === "deny"
                                ? "bg-rose-600 text-white"
                                : mode === "ask"
                                  ? "bg-amber-600 text-white"
                                  : "bg-neutral-700 text-white"
                            : "text-neutral-400 hover:text-neutral-200"
                        }`}
                      >
                        {mode === "inherit" ? "Heredar" : mode}
                      </button>
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skills */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-4 space-y-3">
        <label className="text-sm font-medium text-neutral-200 flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400" />
          Skills Adicionales del Workspace
        </label>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newSkillInput}
            onChange={(e) => setNewSkillInput(e.target.value)}
            placeholder="Nombre de la skill (ej: android-cli)"
            onKeyDown={(e) => e.key === "Enter" && addSkill()}
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-md px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={addSkill}
            className="px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-md transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Añadir
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {(draft.skills || []).map((sk) => (
            <span
              key={sk}
              className="inline-flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 text-purple-300 text-xs px-2.5 py-1 rounded-md"
            >
              <span>{sk}</span>
              <button
                onClick={() => removeSkill(sk)}
                className="text-neutral-400 hover:text-rose-400"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
          {(!draft.skills || draft.skills.length === 0) && (
            <span className="text-xs text-neutral-500 italic">
              No hay skills configuradas explícitamente.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
