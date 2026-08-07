// SPDX-License-Identifier: MIT
import { RefreshCw } from "lucide-react";
import { type ReactNode } from "react";

export interface LoadingStateProps {
  label?: string;
  size?: "xs" | "sm" | "md" | "lg";
  fullPage?: boolean;
  className?: string;
  children?: ReactNode;
}

const spinnerSizes = {
  xs: "w-3.5 h-3.5 border-2",
  sm: "w-5 h-5 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-8 h-8 border-3",
};

export function LoadingState({
  label,
  size = "md",
  fullPage = true,
  className = "",
  children,
}: LoadingStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-muted-foreground ${
        fullPage ? "h-full min-h-[160px] flex-1" : "py-4"
      } ${className}`}
    >
      <div
        className={`${spinnerSizes[size]} border-primary border-t-transparent rounded-full animate-spin`}
      />
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
      {children}
    </div>
  );
}

export function LoadingSpinner({
  size = "sm",
  className = "",
}: {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <RefreshCw
      className={`${
        size === "xs"
          ? "w-3 h-3"
          : size === "sm"
            ? "w-4 h-4"
            : size === "md"
              ? "w-5 h-5"
              : "w-6 h-6"
      } animate-spin ${className}`}
    />
  );
}
