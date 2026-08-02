// SPDX-License-Identifier: MIT
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";
import { Modal } from "@/components/ui/Modal";
import type { CreateScheduleJob, ScheduleJob, ScheduleMode } from "@spaces/core";
import { Clock, HelpCircle, Layers, MessageSquare, Sparkles, Terminal } from "lucide-react";
import React, { useEffect, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreateScheduleJob) => Promise<void>;
  initialData?: ScheduleJob | null;
  projects?: { id: string; name: string }[];
  agents?: { id: string; name: string }[];
  teams?: { id: string; name: string }[];
}

type CadencePreset = "interval" | "daily" | "weekly" | "monthly" | "yearly" | "custom_cron";

const CADENCE_PRESETS: { value: CadencePreset; label: string; cron?: string }[] = [
  { value: "interval", label: "Fixed Interval (Minutes)" },
  { value: "daily", label: "Daily (Diario) — Every day at 09:00", cron: "0 9 * * *" },
  { value: "weekly", label: "Weekly (Semanal) — Every Monday at 09:00", cron: "0 9 * * 1" },
  { value: "monthly", label: "Monthly (Mensual) — 1st of every month at 09:00", cron: "0 9 1 * *" },
  { value: "yearly", label: "Yearly (Anual) — Jan 1st at 09:00", cron: "0 9 1 1 *" },
  { value: "custom_cron", label: "Custom Cron Expression..." },
];

export const ScheduleJobDialog: React.FC<Props> = ({
  open,
  onClose,
  onSave,
  initialData,
  projects = [],
  agents = [],
  teams = [],
}) => {
  const [name, setName] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [preserveSession, setPreserveSession] = useState(true);

  const [cadencePreset, setCadencePreset] = useState<CadencePreset>("interval");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("interval");
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [cronExpression, setCronExpression] = useState("0 9 * * *");

  const [scopeType, setScopeType] = useState<"global" | "project" | "agent" | "team">("global");
  const [scopeId, setScopeId] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setEnabled(initialData.enabled);
      setPreserveSession(initialData.preserveSession !== false);
      setScheduleMode(initialData.scheduleMode);
      setIntervalMinutes(initialData.intervalMinutes || 60);
      setCronExpression(initialData.cronExpression || "0 9 * * *");
      setPrompt(initialData.prompt);

      if (initialData.scheduleMode === "interval") {
        setCadencePreset("interval");
      } else {
        const matchingPreset = CADENCE_PRESETS.find((p) => p.cron === initialData.cronExpression);
        if (matchingPreset) {
          setCadencePreset(matchingPreset.value);
        } else {
          setCadencePreset("custom_cron");
        }
      }

      if (initialData.projectId) {
        setScopeType("project");
        setScopeId(initialData.projectId);
      } else if (initialData.agentId) {
        setScopeType("agent");
        setScopeId(initialData.agentId);
      } else if (initialData.teamId) {
        setScopeType("team");
        setScopeId(initialData.teamId);
      } else {
        setScopeType("global");
        setScopeId("");
      }
    } else {
      setName("");
      setEnabled(true);
      setPreserveSession(true);
      setCadencePreset("interval");
      setScheduleMode("interval");
      setIntervalMinutes(60);
      setCronExpression("0 9 * * *");
      setScopeType("global");
      setScopeId("");
      setPrompt("");
    }
    setError(null);
  }, [initialData, open]);

  const handleCadenceSelect = (preset: CadencePreset) => {
    setCadencePreset(preset);
    if (preset === "interval") {
      setScheduleMode("interval");
    } else {
      setScheduleMode("cron");
      const found = CADENCE_PRESETS.find((p) => p.value === preset);
      if (found?.cron) {
        setCronExpression(found.cron);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide a name for this schedule");
      return;
    }
    if (!prompt.trim()) {
      setError("Please provide a prompt to run");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: CreateScheduleJob = {
        name: name.trim(),
        enabled,
        preserveSession,
        scheduleMode,
        intervalMinutes: scheduleMode === "interval" ? Number(intervalMinutes) : undefined,
        cronExpression: scheduleMode === "cron" ? cronExpression.trim() : undefined,
        projectId: scopeType === "project" && scopeId ? scopeId : undefined,
        agentId: scopeType === "agent" && scopeId ? scopeId : undefined,
        teamId: scopeType === "team" && scopeId ? scopeId : undefined,
        prompt: prompt.trim(),
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  const scopeTypeOptions: DropdownOption<"global" | "project" | "agent" | "team">[] = [
    { value: "global", label: "Global (Default User Agent)" },
    { value: "project", label: "Project Workspace" },
    { value: "agent", label: "Specific Agent" },
    { value: "team", label: "Team (Leader Agent)" },
  ];

  const targetOptions: DropdownOption<string>[] = (() => {
    if (scopeType === "project") {
      return projects.map((p) => ({ value: p.id, label: p.name }));
    }
    if (scopeType === "agent") {
      return agents.map((a) => ({ value: a.id, label: a.name }));
    }
    if (scopeType === "team") {
      return teams.map((t) => ({ value: t.id, label: t.name }));
    }
    return [];
  })();

  const cadenceOptions: DropdownOption<CadencePreset>[] = CADENCE_PRESETS.map((p) => ({
    value: p.value,
    label: p.label,
  }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData ? "Edit Schedule Job" : "Create Schedule Job"}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-3.5 py-1.5 rounded-lg border border-input text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? (
              <span>Saving...</span>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{initialData ? "Update Schedule" : "Create Schedule"}</span>
              </>
            )}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
        {error && (
          <div className="p-2.5 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive font-medium text-xs">
            {error}
          </div>
        )}

        {/* Name & Enabled */}
        <div className="space-y-1.5">
          <label className="block font-medium text-foreground">Schedule Name</label>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Daily Workspace Code Audit"
              className="flex-1 bg-background border border-input rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
            <label className="flex items-center gap-2 cursor-pointer border border-input bg-card px-3 py-2 rounded-lg text-foreground font-medium select-none">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="accent-primary rounded-xs"
              />
              <span>Enabled</span>
            </label>
          </div>
        </div>

        {/* Preserve Session Policy Checkbox */}
        <div className="p-3 rounded-lg border border-input bg-card/60 space-y-1">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground select-none">
            <input
              type="checkbox"
              checked={preserveSession}
              onChange={(e) => setPreserveSession(e.target.checked)}
              className="accent-primary rounded-xs w-3.5 h-3.5"
            />
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
              Preserve AI session after execution
            </span>
          </label>
          <p className="text-[11px] text-muted-foreground pl-5 leading-relaxed">
            {preserveSession
              ? "Keep the generated AI session active in your sessions list to inspect the full conversation and follow up."
              : "Automatically clean up and delete the temporary session immediately after the run completes."}
          </p>
        </div>

        {/* Scope selection using custom Dropdowns */}
        <div className="space-y-1.5">
          <label className="block font-medium text-foreground flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
            Execution Scope
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Dropdown
              value={scopeType}
              onChange={(val) => {
                setScopeType(val);
                setScopeId("");
              }}
              options={scopeTypeOptions}
              matchWidth
            />

            {scopeType !== "global" && (
              <Dropdown
                value={scopeId}
                onChange={(val) => setScopeId(val)}
                options={targetOptions}
                placeholder={`Select ${scopeType}...`}
                matchWidth
              />
            )}
          </div>
        </div>

        {/* Cadence Preset Dropdown & Timing Config */}
        <div className="space-y-2">
          <label className="block font-medium text-foreground flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            Cadence & Timing Expression
          </label>

          <Dropdown
            value={cadencePreset}
            onChange={handleCadenceSelect}
            options={cadenceOptions}
            matchWidth
          />

          {scheduleMode === "interval" ? (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-muted-foreground font-medium">Run every</span>
              <input
                type="number"
                min={1}
                max={10080}
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                className="w-24 bg-background border border-input rounded-lg px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
              <span className="text-muted-foreground font-medium">minutes</span>
            </div>
          ) : (
            <div className="space-y-1 pt-1">
              <input
                type="text"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                placeholder="e.g. 0 9 * * 1-5"
                className="w-full font-mono bg-background border border-input rounded-lg px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <HelpCircle className="w-3 h-3" /> Standard 5-part cron syntax (minute hour
                day-of-month month day-of-week)
              </p>
            </div>
          )}
        </div>

        {/* Prompt */}
        <div className="space-y-1.5">
          <label className="block font-medium text-foreground flex items-center gap-1">
            <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
            Task Prompt
          </label>
          <textarea
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the instructions for the AI assistant during each scheduled run..."
            className="w-full bg-background border border-input rounded-lg p-3 text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-mono text-xs leading-relaxed"
          />
        </div>
      </form>
    </Modal>
  );
};
