// SPDX-License-Identifier: MIT
import { forwardRef, isValidElement, type ButtonHTMLAttributes, type ReactNode } from "react";
import { RefreshCw, type LucideIcon } from "lucide-react";

type IconButtonVariant =
  | "solid"
  | "outline"
  | "ghost"
  | "destructive"
  | "ghost-destructive"
  | "accent";

type IconButtonSize = "xs" | "sm" | "md" | "lg";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: LucideIcon | ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  loading?: boolean;
  active?: boolean;
  label?: string;
  tooltip?: string;
}

const variants: Record<IconButtonVariant, string> = {
  solid: "bg-card border border-input text-foreground hover:bg-card-hover hover:border-primary/40",
  outline: "bg-transparent border border-input text-muted-foreground hover:text-foreground hover:bg-card-hover",
  ghost: "bg-transparent text-muted-foreground hover:text-foreground hover:bg-card-hover",
  accent: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  "ghost-destructive": "bg-transparent text-muted-foreground hover:text-destructive hover:bg-destructive/10",
};

const sizes: Record<IconButtonSize, { btn: string; icon: string }> = {
  xs: { btn: "p-1 rounded-md", icon: "w-3 h-3" },
  sm: { btn: "p-1.5 rounded-lg", icon: "w-3.5 h-3.5" },
  md: { btn: "p-2 rounded-xl", icon: "w-4 h-4" },
  lg: { btn: "p-2.5 rounded-xl", icon: "w-5 h-5" },
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon: IconProp,
      variant = "ghost",
      size = "md",
      loading = false,
      active = false,
      label,
      tooltip,
      disabled,
      className = "",
      ...props
    },
    ref,
  ) => {
    const sizeConfig = sizes[size];
    const renderIcon = () => {
      if (loading) return <RefreshCw className={`${sizeConfig.icon} animate-spin`} />;
      if (isValidElement(IconProp)) return IconProp;
      const Component = IconProp as LucideIcon;
      return <Component className={sizeConfig.icon} />;
    };

    return (
      <button
        ref={ref}
        title={tooltip || label || props["aria-label"]}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-1.5 font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none ${
          variants[variant]
        } ${sizeConfig.btn} ${active ? "bg-primary/10 text-primary border-primary/20" : ""} ${className}`}
        {...props}
      >
        {renderIcon()}
        {label && <span className="text-xs font-semibold pr-1">{label}</span>}
      </button>
    );
  },
);

IconButton.displayName = "IconButton";
