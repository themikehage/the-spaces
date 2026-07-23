import type { ReactNode } from "react";
import type { RoutePage } from "@/router/useRoutePage";

interface Tab {
  id: string;
  label: string;
  path: string;
  icon: ReactNode;
}

interface ContextTabBarProps {
  page: RoutePage;
  contextTabs: Tab[];
  onNavigateTab: (path: string) => void;
  rightSlot?: ReactNode;
}

export function ContextTabBar({
  page,
  contextTabs,
  onNavigateTab,
  rightSlot,
}: ContextTabBarProps) {
  return (
    <div className="flex items-center justify-between px-4 border-b border-border bg-card/5 flex-shrink-0">
      <div className="flex gap-1 overflow-x-auto scrollbar-none flex-nowrap">
        {contextTabs.map((tab) => {
          const isActive = page === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigateTab(tab.path)}
              className={`flex-none flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all cursor-pointer border-b-2 -mb-[1px] ${
                isActive
                  ? "text-primary border-primary font-semibold"
                  : "text-muted-foreground border-transparent hover:text-foreground hover:border-input"
              }`}
            >
              <span className={isActive ? "text-primary" : "text-muted-foreground"}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="relative py-1 flex items-center gap-2">{rightSlot}</div>
    </div>
  );
}
