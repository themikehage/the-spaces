// SPDX-License-Identifier: MIT
import { AgentAvatar } from "@/components/shared/AgentAvatar";
import { EntityAvatar } from "@/components/shared/EntityAvatar";

interface ProjectItemProps {
  id: string;
  name: string;
  avatarUrl?: string;
  isActive: boolean;
  isMobile: boolean;
  itemClass: (isActive: boolean) => string;
  onClick: (id: string, name: string) => void;
}

export function ProjectListItem({
  id,
  name,
  avatarUrl,
  isActive,
  isMobile,
  itemClass,
  onClick,
}: ProjectItemProps) {
  return (
    <button onClick={() => onClick(id, name)} className={itemClass(isActive)}>
      <EntityAvatar
        name={name}
        avatarUrl={avatarUrl}
        size={isMobile ? "sm" : "xs"}
        type="project"
        className="flex-shrink-0"
      />
      <span className="truncate">{name}</span>
    </button>
  );
}

interface AgentItemProps {
  id: string;
  name: string;
  avatarUrl?: string;
  isActive: boolean;
  isMobile: boolean;
  kanbanStatus: "working" | "idle" | "other";
  itemClass: (isActive: boolean) => string;
  onClick: (agent: { id: string; name: string; avatarUrl?: string }) => void;
}

export function AgentListItem({
  id,
  name,
  avatarUrl,
  isActive,
  isMobile,
  kanbanStatus,
  itemClass,
  onClick,
}: AgentItemProps) {
  const statusDot =
    kanbanStatus === "working"
      ? "bg-success shadow-[0_0_6px_rgba(74,222,128,0.6)]"
      : kanbanStatus === "idle"
        ? "bg-text-secondary/30"
        : "bg-text-secondary/10";

  return (
    <button onClick={() => onClick({ id, name, avatarUrl })} className={itemClass(isActive)}>
      <span className="relative flex-shrink-0">
        <AgentAvatar name={name} avatarUrl={avatarUrl} size={isMobile ? "sm" : "xs"} />
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-background ${statusDot}`}
        />
      </span>
      <span className="truncate">{name}</span>
    </button>
  );
}

interface TeamItemProps {
  id: string;
  name: string;
  avatarUrl?: string;
  isActive: boolean;
  isMobile: boolean;
  itemClass: (isActive: boolean) => string;
  onClick: (team: { id: string; name: string; avatarUrl?: string }) => void;
}

export function TeamListItem({
  id,
  name,
  avatarUrl,
  isActive,
  isMobile,
  itemClass,
  onClick,
}: TeamItemProps) {
  return (
    <button onClick={() => onClick({ id, name, avatarUrl })} className={itemClass(isActive)}>
      <EntityAvatar
        name={name}
        avatarUrl={avatarUrl}
        size={isMobile ? "sm" : "xs"}
        type="team"
        className="flex-shrink-0"
      />
      <span className="truncate">{name}</span>
    </button>
  );
}

interface WorkflowItemProps {
  id: string;
  name: string;
  stepsCount: number;
  isActive: boolean;
  itemClass: (isActive: boolean) => string;
  onClick: (id: string) => void;
}

export function WorkflowListItem({
  id,
  name,
  stepsCount,
  isActive,
  itemClass,
  onClick,
}: WorkflowItemProps) {
  return (
    <button onClick={() => onClick(id)} className={itemClass(isActive)}>
      <span className="truncate flex-1 text-left">{name}</span>
      <span className="text-[10px] font-mono text-muted-foreground bg-accent/60 px-1.5 py-0.2 rounded flex-shrink-0">
        {stepsCount}
      </span>
    </button>
  );
}
