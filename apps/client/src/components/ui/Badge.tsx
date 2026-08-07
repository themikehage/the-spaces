// SPDX-License-Identifier: MIT
import { type ReactNode } from "react";

type BadgeVariant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "destructive"
  | "info"
  | "outline";

type BadgeSize = "xs" | "sm";

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
  className?: string;
  title?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: "bg-primary/10 text-primary border-primary/20",
  secondary: "bg-muted text-muted-foreground border-input",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  outline: "bg-transparent text-foreground border-border",
};

const sizeStyles: Record<BadgeSize, string> = {
  xs: "px-1.5 py-0.5 text-[9px]",
  sm: "px-2 py-0.5 text-[10px]",
};

export function Badge({
  variant = "secondary",
  size = "sm",
  children,
  className = "",
  title,
}: BadgeProps) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 font-medium rounded-md border font-sans select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
}
