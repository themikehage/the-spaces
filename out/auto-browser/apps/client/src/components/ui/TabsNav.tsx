import { clsx } from "clsx";

export interface TabOption {
  id: string;
  label: string;
  count?: number;
}

interface TabsNavProps {
  tabs: TabOption[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function TabsNav({ tabs, activeId, onChange, className }: TabsNavProps) {
  return (
    <div className={clsx("flex items-center gap-1 border-b border-border px-2", className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={clsx(
              "px-3 py-2 text-xs font-medium border-b-2 transition-colors duration-150 cursor-pointer flex items-center gap-1.5",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={clsx(
                  "px-1.5 py-0.5 text-[10px] rounded-full",
                  isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
