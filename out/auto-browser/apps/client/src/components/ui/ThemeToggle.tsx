import { useState, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "./Button.tsx";

export type Theme = "dark" | "light" | "system";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (
      theme === "dark" ||
      (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const cycleTheme = () => {
    if (theme === "dark") setTheme("light");
    else if (theme === "light") setTheme("system");
    else setTheme("dark");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      title={`Theme: ${theme}`}
      aria-label={`Current theme ${theme}. Click to change theme.`}
    >
      {theme === "dark" && <Moon className="h-4 w-4 text-muted-foreground hover:text-foreground" />}
      {theme === "light" && <Sun className="h-4 w-4 text-warning" />}
      {theme === "system" && (
        <Monitor className="h-4 w-4 text-muted-foreground hover:text-foreground" />
      )}
    </Button>
  );
}
