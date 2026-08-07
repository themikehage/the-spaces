// SPDX-License-Identifier: MIT
import { Bot, FolderKanban, Sparkles, CheckCircle2 } from "lucide-react";
import { openInWorkspace } from "./workspace";

interface Props {
  args: Record<string, unknown>;
  text: string;
  json: any;
}

export function FactoryResult({ args, text, json }: Props) {
  const entity = String(args.entity || "factory");
  const action = String(args.action || "execute");

  if (Array.isArray(json)) {
    if (entity === "agents") {
      return (
        <div className="flex flex-col gap-2 font-sans text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-text-primary text-[12px] flex items-center gap-1.5">
              <Bot size={13} className="text-primary" />
              Agentes ({json.length})
            </span>
            <span className="text-[10px] font-mono text-muted-foreground uppercase bg-surface-hover px-1.5 py-0.5 rounded">
              {action}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {json.map((agent: any, i: number) => (
              <div
                key={agent.id || i}
                className="p-2.5 rounded-lg border border-border/50 bg-card/60 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-text-primary text-xs truncate">
                    {agent.name || agent.id}
                  </span>
                  <span
                    className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded-full uppercase ${
                      agent.status === "active" || agent.status === "running"
                        ? "bg-emerald-500/10 text-emerald-500 font-bold"
                        : "bg-surface-hover text-text-secondary"
                    }`}
                  >
                    {agent.status || "idle"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                  <span>ID: {agent.id}</span>
                  {agent.role && <span>• Role: {agent.role}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (entity === "projects") {
      return (
        <div className="flex flex-col gap-2 font-sans text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-text-primary text-[12px] flex items-center gap-1.5">
              <FolderKanban size={13} className="text-primary" />
              Proyectos ({json.length})
            </span>
            <span className="text-[10px] font-mono text-muted-foreground uppercase bg-surface-hover px-1.5 py-0.5 rounded">
              {action}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {json.map((proj: any, i: number) => (
              <div
                key={proj.id || i}
                className="p-2.5 rounded-lg border border-border/50 bg-card/60 flex flex-col gap-1 cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => openInWorkspace(proj.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-text-primary text-xs truncate">
                    {proj.name || proj.id}
                  </span>
                  <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded-full bg-surface-hover text-text-secondary uppercase">
                    {proj.status || "active"}
                  </span>
                </div>
                {proj.assignment?.leaderId && (
                  <span className="text-[10px] text-muted-foreground">
                    Líder: {proj.assignment.leaderId}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (entity === "skills") {
      return (
        <div className="flex flex-col gap-2 font-sans text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-text-primary text-[12px] flex items-center gap-1.5">
              <Sparkles size={13} className="text-primary" />
              Skills ({json.length})
            </span>
            <span className="text-[10px] font-mono text-muted-foreground uppercase bg-surface-hover px-1.5 py-0.5 rounded">
              {action}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {json.map((skill: any, i: number) => (
              <div
                key={skill.name || i}
                className="p-2 rounded-lg border border-border/40 bg-card/40 flex flex-col gap-0.5"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-primary text-[11px]">
                    {skill.name}
                  </span>
                  {skill.scope && (
                    <span className="text-[9px] font-mono text-muted-foreground bg-surface-hover px-1 py-0.2 rounded">
                      {skill.scope}
                    </span>
                  )}
                </div>
                {skill.description && (
                  <p className="text-text-secondary text-[11px] leading-relaxed">
                    {skill.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2 font-sans text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-text-primary text-[12px] capitalize">
            {entity} ({json.length})
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
      <span>{text || `Factory ${entity}:${action} completado`}</span>
    </div>
  );
}
