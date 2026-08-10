// SPDX-License-Identifier: MIT
import { Badge } from "@/components/ui/Badge";
import { type LucideIcon } from "lucide-react";
import { isValidElement, type ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon | ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsNavProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: "line" | "pills" | "segmented";
  size?: "sm" | "md";
  className?: string;
}

export function TabsNav({
  tabs,
  activeTab,
  onChange,
  variant = "line",
  size = "md",
  className = "",
}: TabsNavProps) {
  const renderIcon = (iconProp?: LucideIcon | ReactNode) => {
    if (!iconProp) return null;
    if (isValidElement(iconProp)) return iconProp;
    const Component = iconProp as LucideIcon;
    return <Component className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />;
  };

  if (variant === "pills") {
    return (
      <div className={`flex items-center gap-1.5 p-1 bg-card/40 border border-input rounded-xl flex-shrink-0 ${className}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => !tab.disabled && onChange(tab.id)}
              disabled={tab.disabled}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${
                size === "sm" ? "text-[10px]" : "text-xs"
              } ${
                isActive
                  ? "bg-primary text-background font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/60"
              }`}
            >
              {renderIcon(tab.icon)}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <Badge variant={isActive ? "secondary" : "outline"} size="xs">
                  {tab.badge}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === "segmented") {
    return (
      <div className={`flex items-center p-1 bg-muted/40 rounded-lg border border-input/40 flex-shrink-0 ${className}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => !tab.disabled && onChange(tab.id)}
              disabled={tab.disabled}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${
                size === "sm" ? "text-[10px]" : "text-xs"
              } ${
                isActive
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {renderIcon(tab.icon)}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <Badge variant="secondary" size="xs">
                  {tab.badge}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`flex border-b border-border flex-shrink-0 ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            type="button"
            key={tab.id}
            onClick={() => !tab.disabled && onChange(tab.id)}
            disabled={tab.disabled}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 font-medium border-b-2 transition-all cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${
              size === "sm" ? "text-[11px]" : "text-xs"
            } ${
              isActive
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {renderIcon(tab.icon)}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <Badge variant="secondary" size="xs">
                {tab.badge}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
