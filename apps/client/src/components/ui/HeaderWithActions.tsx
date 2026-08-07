// SPDX-License-Identifier: MIT
import { Button } from "@/components/ui/Button";
import { TabsNav, type TabItem } from "@/components/ui/TabsNav";
import { RefreshCw, Search, type LucideIcon } from "lucide-react";
import { isValidElement, type ReactNode } from "react";

export interface HeaderAction {
  id?: string;
  label?: string;
  icon?: LucideIcon | ReactNode;
  onClick?: () => void;
  variant?: "solid" | "outline" | "ghost" | "destructive" | "accent" | "ghost-destructive";
  size?: "xs" | "sm" | "md" | "lg" | "icon";
  disabled?: boolean;
  loading?: boolean;
  title?: string;
  className?: string;
  children?: ReactNode;
}

export type HeaderTabOption = TabItem;

export interface HeaderWithActionsProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon | ReactNode;
  count?: number | string;
  badge?: ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  tabs?: HeaderTabOption[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  refreshTooltip?: string;
  primaryAction?: HeaderAction;
  secondaryActions?: HeaderAction[];
  children?: ReactNode;
  className?: string;
}

export function HeaderWithActions({
  title,
  subtitle,
  icon: IconComponent,
  count,
  badge,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  tabs,
  activeTab,
  onTabChange,
  onRefresh,
  isRefreshing = false,
  refreshTooltip = "Refresh",
  primaryAction,
  secondaryActions,
  children,
  className = "",
}: HeaderWithActionsProps) {
  const renderIcon = (iconProp?: LucideIcon | ReactNode, defaultClassName = "w-4 h-4") => {
    if (!iconProp) return null;
    if (isValidElement(iconProp)) return iconProp;
    const Component = iconProp as LucideIcon;
    return <Component className={defaultClassName} />;
  };

  return (
    <div className={`flex flex-col flex-shrink-0 border-b border-border bg-card/10 ${className}`}>
      <div className="min-h-14 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {IconComponent && (
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center flex-shrink-0">
              {renderIcon(IconComponent, "w-4.5 h-4.5 text-primary")}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-foreground tracking-wide Outfit truncate">
                {title}
              </h1>
              {count !== undefined && count !== null && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 flex-shrink-0">
                  {count}
                </span>
              )}
              {badge}
            </div>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onSearchChange !== undefined && (
            <div className="relative w-48 sm:w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                type="text"
                value={searchValue || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 bg-card/60 border border-input rounded-lg text-xs text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors font-sans"
              />
            </div>
          )}

          {secondaryActions?.map((action, idx) => (
            <Button
              key={action.id || idx}
              variant={action.variant || "outline"}
              size={action.size || "sm"}
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
              title={action.title}
              className={action.className || "cursor-pointer"}
            >
              {action.loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                renderIcon(action.icon, "w-3.5 h-3.5")
              )}
              {action.label && <span>{action.label}</span>}
              {action.children}
            </Button>
          ))}

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              title={refreshTooltip}
              className="cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
              <span className="hidden md:inline">Refresh</span>
            </Button>
          )}

          {primaryAction && (
            <Button
              variant={primaryAction.variant || "accent"}
              size={primaryAction.size || "sm"}
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled || primaryAction.loading}
              title={primaryAction.title}
              className={primaryAction.className || "cursor-pointer"}
            >
              {primaryAction.loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                renderIcon(primaryAction.icon, "w-3.5 h-3.5")
              )}
              {primaryAction.label && <span>{primaryAction.label}</span>}
              {primaryAction.children}
            </Button>
          )}

          {children}
        </div>
      </div>

      {tabs && tabs.length > 0 && (
        <TabsNav
          tabs={tabs}
          activeTab={activeTab || tabs[0].id}
          onChange={(id) => onTabChange?.(id)}
          variant="line"
          className="px-6 bg-card/5 border-t border-border"
        />
      )}
    </div>
  );
}
