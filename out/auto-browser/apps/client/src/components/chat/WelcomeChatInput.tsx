import { Bot, Sparkles, Globe, Terminal, Search } from "lucide-react";
import { Button } from "../ui/Button.tsx";

interface WelcomeChatInputProps {
  onSelectPrompt: (prompt: string) => void;
  onNewSession: () => void;
}

const PROMPT_SUGGESTIONS = [
  {
    icon: <Globe className="h-4 w-4 text-emerald-400" />,
    title: "Web Automation",
    prompt: "Navigate to news.ycombinator.com and list top 5 story titles with link targets.",
  },
  {
    icon: <Terminal className="h-4 w-4 text-purple-400" />,
    title: "Run Terminal Command",
    prompt: "Run `git status` and summarize current branch state.",
  },
  {
    icon: <Search className="h-4 w-4 text-amber-400" />,
    title: "Inspect Codebase",
    prompt: "Find all occurrences of `useChat` hook and explain how state is handled.",
  },
];

export function WelcomeChatInput({ onSelectPrompt, onNewSession }: WelcomeChatInputProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 shadow-accent">
        <Bot className="h-8 w-8 text-primary" />
      </div>

      <h2 className="text-xl font-bold font-display text-foreground mb-2">
        Welcome to Auto-Browser
      </h2>
      <p className="text-sm text-muted-foreground mb-8 max-w-md leading-relaxed">
        An autonomous AI web agent workspace. Select a prompt below or start a new session to
        execute browser tasks and terminal workflows.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-6">
        {PROMPT_SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            onClick={() => {
              onNewSession();
              setTimeout(() => onSelectPrompt(s.prompt), 100);
            }}
            className="flex flex-col items-start p-3.5 rounded-xl bg-surface border border-border hover:border-primary/50 hover:bg-surface-hover text-left transition-all duration-150 group cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-2">
              {s.icon}
              <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                {s.title}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-normal">
              {s.prompt}
            </p>
          </button>
        ))}
      </div>

      <Button onClick={onNewSession} variant="primary" className="gap-2 px-5">
        <Sparkles className="h-4 w-4" />
        <span>Create New Session</span>
      </Button>
    </div>
  );
}
