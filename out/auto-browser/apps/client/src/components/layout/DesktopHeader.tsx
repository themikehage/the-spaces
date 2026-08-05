import { Bot, Settings, Cpu } from "lucide-react";
import { Button } from "../ui/Button.tsx";
import { ThemeToggle } from "../ui/ThemeToggle.tsx";
import type { ProviderConfig } from "../../api/client.ts";

interface DesktopHeaderProps {
  activeProvider: ProviderConfig | null;
  onOpenSettings: () => void;
}

export function DesktopHeader({ activeProvider, onOpenSettings }: DesktopHeaderProps) {
  return (
    <header className="h-12 border-b border-border bg-surface px-4 flex items-center justify-between shrink-0">
      {/* Brand / Logo */}
      <div className="flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-xs">
          <Bot className="h-4 w-4" />
        </div>
        <span className="font-display font-bold text-sm tracking-tight text-foreground">
          Auto-Browser
        </span>
      </div>

      {/* Right Header Actions */}
      <div className="flex items-center gap-3">
        {activeProvider && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-hover border border-border text-xs font-mono text-muted-foreground">
            <Cpu className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-foreground">{activeProvider.name}:</span>
            <span className="text-primary">{activeProvider.activeModelId}</span>
          </div>
        )}

        <ThemeToggle />

        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSettings}
          title="Provider & Model Settings"
          aria-label="Provider & Model Settings"
        >
          <Settings className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </Button>
      </div>
    </header>
  );
}
