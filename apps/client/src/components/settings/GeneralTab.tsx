// SPDX-License-Identifier: MIT
import { useGeneralSettingsForm } from "@/hooks/useGeneralSettingsForm";
import { GeneralDangerZone } from "./GeneralDangerZone";
import { GeneralIdentitySection } from "./GeneralIdentitySection";
import { GeneralModelSection } from "./GeneralModelSection";
import { GeneralPermissionsSection } from "./GeneralPermissionsSection";
import { GeneralSubagentSection } from "./GeneralSubagentSection";

export function GeneralTab() {
  const form = useGeneralSettingsForm();

  return (
    <div className="space-y-6">
      <GeneralIdentitySection user={form.user} logout={form.logout} l={form.l} />

      <GeneralModelSection
        l={form.l}
        settingsLoading={form.settingsLoading}
        visionModel={form.visionModel}
        visionModels={form.visionModels}
        handleUpdateVisionModel={form.handleUpdateVisionModel}
        visionTestPrompt={form.visionTestPrompt}
        setVisionTestPrompt={form.setVisionTestPrompt}
        visionTestFile={form.visionTestFile}
        visionTestBase64={form.visionTestFile ? form.visionTestPrompt : null}
        visionTestMime={form.visionTestFile ? form.visionTestFile.type : null}
        setVisionTestFile={form.setVisionTestFile}
        setVisionTestBase64={form.setVisionTestBase64}
        setVisionTestMime={form.setVisionTestMime}
        handleVisionFileChange={form.handleVisionFileChange}
        testingVision={form.testingVision}
        handleTestVision={form.handleTestVision}
        visionResult={form.visionResult}
        visionError={form.visionError}
        imageGenModel={form.imageGenModel}
        imageGenModels={form.imageGenModels}
        handleUpdateImageGenModel={form.handleUpdateImageGenModel}
        imageTestPrompt={form.imageTestPrompt}
        setImageTestPrompt={form.setImageTestPrompt}
        testingImage={form.testingImage}
        handleTestImageGen={form.handleTestImageGen}
        imageResult={form.imageResult}
        imageBlobUrl={form.imageBlobUrl}
        imageError={form.imageError}
        videoGenEnabled={form.videoGenEnabled}
        handleToggleVideoGenEnabled={form.handleToggleVideoGenEnabled}
        videoGenModel={form.videoGenModel}
        videoGenModels={form.videoGenModels}
        handleUpdateVideoGenModel={form.handleUpdateVideoGenModel}
        videoTestPrompt={form.videoTestPrompt}
        setVideoTestPrompt={form.setVideoTestPrompt}
        testingVideo={form.testingVideo}
        handleTestVideoGen={form.handleTestVideoGen}
        videoResult={form.videoResult}
        videoBlobUrl={form.videoBlobUrl}
        videoError={form.videoError}
      />

      <GeneralSubagentSection
        l={form.l}
        subagentMaxDepth={form.subagentMaxDepth}
        handleUpdateSubagentMaxDepth={form.handleUpdateSubagentMaxDepth}
        showPromptPreviews={form.showPromptPreviews}
        handleToggleShowPromptPreviews={form.handleToggleShowPromptPreviews}
      />

      <GeneralPermissionsSection
        l={form.l}
        showPasswordForm={form.showPasswordForm}
        setShowPasswordForm={form.setShowPasswordForm}
        pwCurrent={form.pwCurrent}
        setPwCurrent={form.setPwCurrent}
        pwNew={form.pwNew}
        setPwNew={form.setPwNew}
        pwConfirm={form.pwConfirm}
        setPwConfirm={form.setPwConfirm}
        pwSaving={form.pwSaving}
        pwError={form.pwError}
        pwSuccess={form.pwSuccess}
        handlePasswordSubmit={form.handlePasswordSubmit}
        resetPasswordForm={form.resetPasswordForm}
      />

      <GeneralDangerZone
        l={form.l}
        exportType={form.exportType}
        setExportType={form.setExportType}
        exporting={form.exporting}
        handleExportBackup={form.handleExportBackup}
        importMode={form.importMode}
        setImportMode={form.setImportMode}
        importFile={form.importFile}
        setImportFile={form.setImportFile}
        importing={form.importing}
        importError={form.importError}
        setImportError={form.setImportError}
        importSuccess={form.importSuccess}
        setImportSuccess={form.setImportSuccess}
        handleImportBackup={form.handleImportBackup}
        showOverwriteModal={form.showOverwriteModal}
        setShowOverwriteModal={form.setShowOverwriteModal}
        overwriteConfirmation={form.overwriteConfirmation}
        setOverwriteConfirmation={form.setOverwriteConfirmation}
      />
    </div>
  );
}
