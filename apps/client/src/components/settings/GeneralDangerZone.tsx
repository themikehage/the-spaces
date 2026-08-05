// SPDX-License-Identifier: MIT
import { Dropdown } from "@/components/ui/Dropdown";
import { AlertTriangle } from "lucide-react";

interface GeneralDangerZoneProps {
  l: Record<string, string>;
  exportType: "light" | "full";
  setExportType: (type: "light" | "full") => void;
  exporting: boolean;
  handleExportBackup: () => void;
  importMode: "merge" | "overwrite";
  setImportMode: (mode: "merge" | "overwrite") => void;
  importFile: File | null;
  setImportFile: (file: File | null) => void;
  importing: boolean;
  importError: string;
  setImportError: (err: string) => void;
  importSuccess: string;
  setImportSuccess: (succ: string) => void;
  handleImportBackup: (skipModal?: boolean) => void;
  showOverwriteModal: boolean;
  setShowOverwriteModal: (show: boolean) => void;
  overwriteConfirmation: string;
  setOverwriteConfirmation: (conf: string) => void;
}

export function GeneralDangerZone({
  l,
  exportType,
  setExportType,
  exporting,
  handleExportBackup,
  importMode,
  setImportMode,
  importFile,
  setImportFile,
  importing,
  importError,
  setImportError,
  importSuccess,
  setImportSuccess,
  handleImportBackup,
  showOverwriteModal,
  setShowOverwriteModal,
  overwriteConfirmation,
  setOverwriteConfirmation,
}: GeneralDangerZoneProps) {
  return (
    <>
      <div className="bg-card rounded-lg p-4 border border-input/30 space-y-4">
        <div>
          <h3 className="text-foreground font-semibold text-sm">{l.backupPortability}</h3>
          <p className="text-muted-foreground text-[11px] mt-0.5">{l.backupDesc}</p>
        </div>

        <div className="border-t border-input/30 pt-3 space-y-3">
          <div className="text-xs font-semibold text-foreground">{l.exportOptions}</div>
          <div className="flex flex-col gap-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
              <input
                type="radio"
                name="exportType"
                checked={exportType === "light"}
                onChange={() => setExportType("light")}
                className="accent-accent"
              />
              <span>{l.lightweight}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
              <input
                type="radio"
                name="exportType"
                checked={exportType === "full"}
                onChange={() => setExportType("full")}
                className="accent-accent"
              />
              <span>{l.fullBackup}</span>
            </label>
          </div>
          <button
            onClick={handleExportBackup}
            disabled={exporting}
            className="text-xs bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            {exporting ? l.generatingBackup : l.exportDownload}
          </button>
        </div>

        <div className="border-t border-input/30 pt-3 space-y-3">
          <div className="text-xs font-semibold text-foreground">{l.importBackup}</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                {l.importMode}
              </label>
              <Dropdown<"merge" | "overwrite">
                value={importMode}
                onChange={setImportMode}
                options={[
                  { value: "merge" as const, label: l.mergeMode },
                  { value: "overwrite" as const, label: l.overwriteMode },
                ]}
                matchWidth
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                {l.selectZipFile}
              </label>
              <input
                type="file"
                accept=".zip"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    setImportFile(files[0]);
                    setImportError("");
                    setImportSuccess("");
                  }
                }}
                className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-card-hover/30 file:text-foreground hover:file:bg-card-hover/50 file:cursor-pointer"
              />
            </div>
          </div>

          {importError && (
            <div className="p-3 bg-destructive/10 border border-error/20 rounded-lg text-destructive text-xs">
              {importError}
            </div>
          )}

          {importSuccess && (
            <div className="p-3 bg-primary/10 border border-success/20 rounded-lg text-primary text-xs">
              {importSuccess}
            </div>
          )}

          {importFile && (
            <button
              onClick={() => handleImportBackup(false)}
              disabled={importing}
              className={`text-xs px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                importMode === "overwrite"
                  ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-error/25"
                  : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25"
              }`}
            >
              {importing
                ? l.importingBackup
                : importMode === "overwrite"
                  ? l.restoreOverwrite
                  : l.importMerge}
            </button>
          )}
        </div>
      </div>

      {showOverwriteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-input/80 rounded-xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-destructive font-bold text-base flex items-center gap-2">
              <AlertTriangle size={20} />
              {l.destructiveOverwrite}
            </h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {l.overwriteWarning1}{" "}
              <strong className="text-foreground">{l.overwriteModeLabel}</strong>{" "}
              {l.overwriteWarning2}
            </p>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
              <div className="text-primary font-semibold text-xs">{l.safeRecommendation}</div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                {l.backupRecommendation}
              </p>
              <button
                onClick={() => {
                  const backupExportType = exportType;
                  setExportType("light");
                  handleExportBackup();
                  setExportType(backupExportType);
                }}
                className="w-full text-center text-[11px] font-semibold text-primary hover:text-primary/80 border border-primary/25 hover:bg-primary/5 py-1.5 rounded-md transition-all cursor-pointer"
              >
                {l.downloadBackupNow}
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs uppercase font-bold tracking-wider">
                {l.typeOverwriteConfirm}
              </label>
              <input
                type="text"
                value={overwriteConfirmation}
                onChange={(e) => setOverwriteConfirmation(e.target.value)}
                placeholder={l.overwritePlaceholder}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground outline-none focus:border-error transition-colors text-sm uppercase"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowOverwriteModal(false)}
                className="text-xs bg-card-hover/20 text-muted-foreground hover:text-foreground border border-input/30 px-3.5 py-2 rounded-lg font-semibold transition-all cursor-pointer"
              >
                {l.cancel}
              </button>
              <button
                disabled={overwriteConfirmation.toUpperCase() !== "OVERWRITE"}
                onClick={() => handleImportBackup(true)}
                className="text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 border border-error/25 px-3.5 py-2 rounded-lg font-semibold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {l.confirmWipe}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
