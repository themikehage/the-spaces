// SPDX-License-Identifier: MIT
import { LocaleSelector } from "./LocaleSelector";
import { ThemeToggle } from "./ThemeToggle";

interface UserInfo {
  username?: string;
}

interface GeneralIdentitySectionProps {
  user: UserInfo | null;
  logout: () => void;
  l: Record<string, string>;
}

export function GeneralIdentitySection({ user, logout, l }: GeneralIdentitySectionProps) {
  return (
    <>
      <div className="bg-card rounded-lg p-4 flex items-center justify-between border border-input/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold font-mono uppercase select-none">
            {user?.username?.[0] || "?"}
          </div>
          <div>
            <div className="text-foreground text-sm font-medium">{user?.username}</div>
            <div className="text-muted-foreground text-[11px]">{l.activeSession}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 border border-error/20 px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer"
        >
          {l.signOut}
        </button>
      </div>

      <div className="bg-card rounded-lg p-4 border border-input/30 space-y-4">
        <h3 className="text-foreground font-semibold text-sm">{l.appearance}</h3>
        <div className="flex flex-col gap-3">
          <ThemeToggle />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider w-14">
              {l.language}
            </span>
            <LocaleSelector />
          </div>
        </div>
      </div>
    </>
  );
}
