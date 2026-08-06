// SPDX-License-Identifier: MIT

interface GeneralMemorySectionProps {
  l: Record<string, string>;
  memoryEnabled: boolean;
  memoryAutoStore: boolean;
  handleToggleMemoryEnabled: (enabled: boolean) => void;
  handleToggleMemoryAutoStore: (enabled: boolean) => void;
  exaSearchEnabled: boolean;
  hasExaKey: boolean;
  handleToggleExaSearchEnabled: (enabled: boolean) => void;
}

export function GeneralMemorySection({
  l,
  memoryEnabled,
  memoryAutoStore,
  handleToggleMemoryEnabled,
  handleToggleMemoryAutoStore,
  exaSearchEnabled,
  hasExaKey,
  handleToggleExaSearchEnabled,
}: GeneralMemorySectionProps) {
  return (
    <>
      {/* Session Memory Section */}
      <div className="bg-card rounded-lg p-4 border border-input/30 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-foreground font-semibold text-sm">{l.memorySectionTitle}</h3>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wide ${
                  memoryEnabled
                    ? "bg-accent/10 text-accent"
                    : "bg-muted-foreground/15 text-muted-foreground"
                }`}
              >
                {memoryEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <p className="text-muted-foreground text-[11px] mt-0.5">{l.memorySectionDesc}</p>
          </div>
          <input
            type="checkbox"
            checked={memoryEnabled}
            onChange={(e) => handleToggleMemoryEnabled(e.target.checked)}
            className="w-4 h-4 accent-accent rounded border-input bg-background cursor-pointer"
          />
        </div>

        {memoryEnabled && (
          <div className="pl-4 border-l-2 border-border/40 space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground font-medium">{l.autoStoreInteractions}</span>
              <input
                type="checkbox"
                checked={memoryAutoStore}
                onChange={(e) => handleToggleMemoryAutoStore(e.target.checked)}
                className="w-4 h-4 accent-accent rounded border-input bg-background cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">{l.memoryLocalNotice}</p>
          </div>
        )}
      </div>

      {/* Exa AI Search Section */}
      <div className="bg-card rounded-lg p-4 border border-input/30 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-foreground font-semibold text-sm">{l.exaSearchTitle}</h3>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wide ${
                  hasExaKey ? "bg-accent/10 text-accent" : "bg-warning/10 text-warning"
                }`}
              >
                {hasExaKey ? l.exaKeyConfigured : l.exaKeyMissing}
              </span>
            </div>
            <p className="text-muted-foreground text-[11px] mt-0.5">{l.exaSearchDesc}</p>
          </div>
          {hasExaKey && (
            <input
              type="checkbox"
              checked={exaSearchEnabled}
              onChange={(e) => handleToggleExaSearchEnabled(e.target.checked)}
              className="w-4 h-4 accent-accent rounded border-input bg-background cursor-pointer"
            />
          )}
        </div>

        {!hasExaKey && (
          <p className="text-[11px] text-warning bg-warning/5 border border-warning/15 p-2.5 rounded-lg leading-relaxed">
            {l.missingExaKeyNotice}
          </p>
        )}
      </div>
    </>
  );
}
