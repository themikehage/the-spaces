// SPDX-License-Identifier: MIT
import { GitBranch, Layers, CheckCircle2 } from "lucide-react";

interface Step {
  id: string;
  type: string;
  label?: string;
  description?: string;
}

interface WorkflowItem {
  id: string;
  name: string;
  description?: string;
  steps?: Step[];
  updatedAt?: string;
}

interface Props {
  args: Record<string, unknown>;
  text: string;
  json: any;
}

export function WorkflowResult({ args, text, json }: Props) {
  const action = String(args.action || "list");

  if (Array.isArray(json)) {
    return (
      <div className="flex flex-col gap-2.5 font-sans text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-text-primary text-[12px] flex items-center gap-1.5">
            <GitBranch size={13} className="text-primary" />
            Flujos de Trabajo ({json.length})
          </span>
          <span className="text-[10px] font-mono text-muted-foreground uppercase bg-surface-hover px-1.5 py-0.5 rounded">
            {action}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {json.map((wf: WorkflowItem) => {
            const stepCount = wf.steps?.length ?? 0;
            return (
              <div
                key={wf.id}
                className="p-3 rounded-lg border border-border/50 bg-card/60 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-text-primary text-xs truncate">{wf.name}</span>
                    <span className="text-[9.5px] font-mono text-muted-foreground bg-surface-hover px-1.5 py-0.2 rounded shrink-0">
                      {wf.id}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                    <Layers size={10} />
                    {stepCount} pasos
                  </span>
                </div>

                {wf.description && (
                  <p className="text-text-secondary text-[11px] leading-relaxed">
                    {wf.description}
                  </p>
                )}

                {wf.steps && wf.steps.length > 0 && (
                  <div className="flex flex-col gap-1 pt-1">
                    {wf.steps.slice(0, 3).map((step, idx) => (
                      <div
                        key={step.id || idx}
                        className="text-[10px] font-mono bg-bg/80 border border-border/40 px-2 py-1 rounded flex items-center justify-between text-text-secondary"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                          <span className="truncate">{step.label || step.id}</span>
                        </div>
                        <span className="text-[9px] text-muted-foreground uppercase shrink-0">
                          {step.type}
                        </span>
                      </div>
                    ))}
                    {wf.steps.length > 3 && (
                      <span className="text-[9.5px] font-mono text-muted-foreground px-1 pt-0.5">
                        +{wf.steps.length - 3} pasos más
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (json && typeof json === "object") {
    return (
      <div className="flex flex-col gap-2 font-sans text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-text-primary text-[12px]">
            Resultado de Workflow ({action})
          </span>
        </div>
        <pre className="p-2.5 rounded-lg border border-border/40 bg-bg text-[11px] font-mono text-text-secondary max-h-48 overflow-y-auto whitespace-pre-wrap">
          {JSON.stringify(json, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-bg border border-border/40 text-xs font-mono text-text-primary">
      <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
      <span>{text || `Workflow ${action} completado`}</span>
    </div>
  );
}
