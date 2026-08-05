import { Menu, Bot, Settings } from "lucide-react";
import { Button } from "../ui/Button.tsx";
import { ThemeToggle } from "../ui/ThemeToggle.tsx";

interface MobileTopbarProps {
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
}

export function MobileTopbar({ onToggleSidebar, onOpenSettings }: MobileTopbarProps) {
  return (
    <header className="h-12 border-b border-border bg-surface px-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          aria-label="Open sidebar menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
            <Bot className="h-3.5 w-3.5" />
          </div>
          <span className="font-display font-bold text-xs tracking-tight text-foreground">
            Auto-Browser
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Button variant="ghost" size="icon" onClick={onOpenSettings} aria-label="Settings">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
