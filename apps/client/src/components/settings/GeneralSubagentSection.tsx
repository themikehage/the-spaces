// SPDX-License-Identifier: MIT

interface GeneralSubagentSectionProps {
  l: Record<string, string>;
  subagentMaxDepth: number;
  handleUpdateSubagentMaxDepth: (depth: number) => void;
  showPromptPreviews: boolean;
  handleToggleShowPromptPreviews: (enabled: boolean) => void;
}

export function GeneralSubagentSection({
  l,
  subagentMaxDepth,
  handleUpdateSubagentMaxDepth,
  showPromptPreviews,
  handleToggleShowPromptPreviews,
}: GeneralSubagentSectionProps) {
  return (
    <>
      <div className="bg-card rounded-lg p-4 border border-input/30 space-y-4">
        <h3 className="text-foreground font-semibold text-sm">{l.subagents}</h3>
        <p className="text-muted-foreground text-[11px]">{l.subagentMaxDepthDesc}</p>
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span>{l.subagentMaxDepth}</span>
            <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-mono text-[10px]">
              {subagentMaxDepth === 0
                ? l.noSubagents
                : subagentMaxDepth === 1
                  ? l.directSubagentsOnly
                  : l.nestedSubagents.replace("{depth}", String(subagentMaxDepth))}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="5"
            step="1"
            value={subagentMaxDepth}
            onChange={(e) => handleUpdateSubagentMaxDepth(parseInt(e.target.value, 10))}
            className="w-full accent-accent bg-background cursor-pointer h-1.5 rounded-lg border-none outline-none"
          />
          {subagentMaxDepth > 1 && (
            <p className="text-warning text-[10px] bg-warning/5 border border-warning/15 p-2 rounded-lg leading-relaxed">
              {l.warningMaxDepth}
            </p>
          )}
        </div>
      </div>

      <div className="bg-card rounded-lg p-4 border border-input/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="pr-4">
            <h3 className="text-foreground font-semibold text-sm">{l.showPromptPreviews}</h3>
            <p className="text-muted-foreground text-[11px] mt-0.5">{l.showPromptPreviewsDesc}</p>
          </div>
          <input
            type="checkbox"
            checked={showPromptPreviews}
            onChange={(e) => handleToggleShowPromptPreviews(e.target.checked)}
            className="w-4 h-4 accent-accent rounded border-input bg-background cursor-pointer"
          />
        </div>
      </div>
    </>
  );
}
