// SPDX-License-Identifier: MIT
import { Button } from "@/components/ui/Button";
import { type LucideIcon } from "lucide-react";
import { isValidElement, type ReactNode } from "react";

export interface EmptyStateProps {
  icon?: LucideIcon | ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon | ReactNode;
  children?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: IconProp,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIconProp,
  children,
  className = "",
}: EmptyStateProps) {
  const renderIcon = (icon?: LucideIcon | ReactNode, defaultClassName = "w-6 h-6") => {
    if (!icon) return null;
    if (isValidElement(icon)) return icon;
    const Component = icon as LucideIcon;
    return <Component className={defaultClassName} />;
  };

  return (
    <div className={`h-full flex flex-col items-center justify-center text-center p-6 sm:p-8 select-none ${className}`}>
      {IconProp && (
        <div className="w-12 h-12 rounded-2xl bg-card border border-input flex items-center justify-center text-primary mb-3 shadow-xs">
          {renderIcon(IconProp, "w-6 h-6 text-primary")}
        </div>
      )}
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground max-w-sm mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" className="cursor-pointer">
          {renderIcon(ActionIconProp, "w-3.5 h-3.5 mr-1")}
          <span>{actionLabel}</span>
        </Button>
      )}
      {children}
    </div>
  );
}
