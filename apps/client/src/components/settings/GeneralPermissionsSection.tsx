// SPDX-License-Identifier: MIT
import { EntityCustomToolsEditor } from "@/components/settings/EntityCustomToolsEditor";
import { EntitySkillsEditor } from "@/components/shared/EntitySkillsEditor";

interface GeneralPermissionsSectionProps {
  l: Record<string, string>;
  showPasswordForm: boolean;
  setShowPasswordForm: (val: boolean) => void;
  pwCurrent: string;
  setPwCurrent: (val: string) => void;
  pwNew: string;
  setPwNew: (val: string) => void;
  pwConfirm: string;
  setPwConfirm: (val: string) => void;
  pwSaving: boolean;
  pwError: string;
  pwSuccess: boolean;
  handlePasswordSubmit: () => void;
  resetPasswordForm: () => void;
}

export function GeneralPermissionsSection({
  l,
  showPasswordForm,
  setShowPasswordForm,
  pwCurrent,
  setPwCurrent,
  pwNew,
  setPwNew,
  pwConfirm,
  setPwConfirm,
  pwSaving,
  pwError,
  pwSuccess,
  handlePasswordSubmit,
  resetPasswordForm,
}: GeneralPermissionsSectionProps) {
  return (
    <>
      <div className="bg-card rounded-lg p-4 border border-input/30 space-y-2">
        <h3 className="text-foreground font-semibold text-sm">{l.mcpLink}</h3>
        <p className="text-muted-foreground text-[11px]">{l.mcpDesc}</p>
        <button
          onClick={() =>
            window.dispatchEvent(new CustomEvent("navigate", { detail: { path: "/mcps" } }))
          }
          className="text-xs bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer"
        >
          {l.openMCP}
        </button>
      </div>

      <div className="bg-card rounded-lg p-4 border border-input/30">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-foreground font-semibold text-sm">{l.password}</h3>
          {!showPasswordForm && (
            <button
              onClick={() => {
                setShowPasswordForm(true);
                resetPasswordForm();
              }}
              className="text-xs bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer"
            >
              {l.change}
            </button>
          )}
        </div>
        {showPasswordForm && (
          <div className="space-y-3">
            <input
              type="password"
              placeholder={l.currentPassword}
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder-text-secondary outline-none focus:border-primary transition-colors text-sm"
            />
            <input
              type="password"
              placeholder={l.newPassword}
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder-text-secondary outline-none focus:border-primary transition-colors text-sm"
            />
            <input
              type="password"
              placeholder={l.confirmPassword}
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder-text-secondary outline-none focus:border-primary transition-colors text-sm"
            />
            {pwError && <p className="text-destructive text-xs">{pwError}</p>}
            {pwSuccess && <p className="text-primary text-xs">{l.passwordUpdated}</p>}
            <div className="flex gap-2 justify-end">
              <button
                onClick={resetPasswordForm}
                className="text-xs bg-card-hover/20 text-muted-foreground hover:text-foreground border border-input/30 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer"
              >
                {l.cancel}
              </button>
              <button
                onClick={handlePasswordSubmit}
                disabled={pwSaving}
                className="text-xs bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                {pwSaving ? l.saving : l.save}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-card rounded-lg p-4 border border-input/30 space-y-4">
        <h3 className="text-foreground font-semibold text-sm">{l.systemStatus}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-0.5">
            <div className="text-muted-foreground font-medium">{l.apiBaseUrl}</div>
            <div className="text-foreground font-mono break-words">/api/v1</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-muted-foreground font-medium">{l.sessionStorage}</div>
            <div className="text-foreground">{l.jwtFilesystem}</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-muted-foreground font-medium">{l.workspaceContext}</div>
            <div className="text-foreground font-mono break-words">themikehage/spaces</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-muted-foreground font-medium">{l.healthStatus}</div>
            <div className="text-primary flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {l.online}
            </div>
          </div>
        </div>
      </div>

      <EntitySkillsEditor entityType="global" entityId="global" title="Global Skills" />
      <EntityCustomToolsEditor entityType="global" entityId="global" title="Global Custom Tools" />
    </>
  );
}
