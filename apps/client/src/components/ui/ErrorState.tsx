// SPDX-License-Identifier: MIT
import { Button } from "@/components/ui/Button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { type ReactNode } from "react";

export interface ErrorStateProps {
  title?: string;
  error?: string | null;
  onRetry?: () => void;
  fullPage?: boolean;
  children?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  error,
  onRetry,
  fullPage = true,
  children,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-6 gap-3 ${
        fullPage ? "h-full flex-1" : "py-4"
      } ${className}`}
    >
      <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
        <AlertCircle size={20} />
      </div>
      <div>
        <h4 className="text-xs font-semibold text-destructive">{title}</h4>
        {error && <p className="text-xs text-muted-foreground mt-1 max-w-md">{error}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-1 cursor-pointer">
          <RefreshCw size={12} className="mr-1" />
          <span>Retry</span>
        </Button>
      )}
      {children}
    </div>
  );
}
