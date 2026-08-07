// SPDX-License-Identifier: MIT
import { Search } from "lucide-react";
import { type ReactNode } from "react";

export interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  children?: ReactNode;
  className?: string;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  children,
  className = "",
}: FilterBarProps) {
  return (
    <div className={`flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between ${className}`}>
      {onSearchChange !== undefined && (
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            value={searchValue || ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 bg-card border border-input rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors font-sans"
          />
        </div>
      )}
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
}
