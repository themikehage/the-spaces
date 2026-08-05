// SPDX-License-Identifier: MIT
import { literals as u } from "@/components/settings/GeneralTab.literals";
import { useAuth } from "@/contexts/AuthContext";
import { useLiterals } from "@/lib";
import { settingsService } from "@/lib/api/settings.service";
import { useEffect, useState } from "react";

export function useGeneralSettingsForm() {
  const { user, logout, changePassword } = useAuth();
  const l = useLiterals(u);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const [exportType, setExportType] = useState<"light" | "full">("light");
  const [importMode, setImportMode] = useState<"merge" | "overwrite">("merge");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [overwriteConfirmation, setOverwriteConfirmation] = useState("");
  const [exporting, setExporting] = useState(false);

  const [visionModel, setVisionModel] = useState("");
  const [imageGenModel, setImageGenModel] = useState("");
  const [videoGenModel, setVideoGenModel] = useState("");
  const [visionModels, setVisionModels] = useState<
    Array<{ id: string; name: string; provider: string }>
  >([]);
  const [imageGenModels, setImageGenModels] = useState<
    Array<{
      id: string;
      name: string;
      provider: string;
      description?: string;
      cost?: number;
      rpm?: number;
      concurrency?: number | null;
    }>
  >([]);
  const [videoGenModels, setVideoGenModels] = useState<
    Array<{
      id: string;
      name: string;
      provider: string;
      description?: string;
      cost?: number;
      rpm?: number;
      concurrency?: number | null;
    }>
  >([]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [subagentMaxDepth, setSubagentMaxDepth] = useState<number>(1);
  const [showPromptPreviews, setShowPromptPreviews] = useState<boolean>(false);

  // Vision Diagnostic Test State
  const [visionTestPrompt, setVisionTestPrompt] = useState("Describe this image in one word");
  const [visionTestFile, setVisionTestFile] = useState<File | null>(null);
  const [visionTestBase64, setVisionTestBase64] = useState<string | null>(null);
  const [visionTestMime, setVisionTestMime] = useState<string | null>(null);
  const [testingVision, setTestingVision] = useState(false);
  const [visionResult, setVisionResult] = useState<string | null>(null);
  const [visionError, setVisionError] = useState<string | null>(null);

  // Image Generation Diagnostic Test State
  const [imageTestPrompt, setImageTestPrompt] = useState(
    "A cute coding robot logo, clean futuristic green theme",
  );
  const [testingImage, setTestingImage] = useState(false);
  const [imageResult, setImageResult] = useState<string | null>(null);
  const [imageBlobUrl, setImageBlobUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // Video Generation Diagnostic Test State
  const [videoGenEnabled, setVideoGenEnabled] = useState(true);
  const [videoTestPrompt, setVideoTestPrompt] = useState(
    "A beautiful sunset over the mountains, cinematic",
  );
  const [testingVideo, setTestingVideo] = useState(false);
  const [videoResult, setVideoResult] = useState<string | null>(null);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (imageBlobUrl) {
        window.URL.revokeObjectURL(imageBlobUrl);
      }
      if (videoBlobUrl) {
        window.URL.revokeObjectURL(videoBlobUrl);
      }
    };
  }, [imageBlobUrl, videoBlobUrl]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [settingsData, modelsData, imgModelsData, vidModelsData] = await Promise.all([
          settingsService.fetchSettings().catch(() => ({})),
          settingsService.fetchModels().catch(() => []),
          settingsService.fetchImageModels().catch(() => []),
          settingsService.fetchVideoModels().catch(() => []),
        ]);

        if (settingsData) {
          setVisionModel(settingsData.visionModel || "");
          setImageGenModel(settingsData.imageGenModel || "");
          setVideoGenModel(settingsData.videoGenModel || "");
          setVideoGenEnabled(settingsData.videoGenEnabled ?? true);
          setSubagentMaxDepth(settingsData.subagentMaxDepth ?? 1);
          setShowPromptPreviews(settingsData.showPromptPreviews ?? false);
        }

        const modelsList = (modelsData as any)?.models || modelsData || [];
        const filtered = modelsList.filter((m: any) => m.input?.includes("image"));
        setVisionModels(filtered);
        setImageGenModels((imgModelsData as any)?.models || imgModelsData || []);
        setVideoGenModels((vidModelsData as any)?.models || vidModelsData || []);
      } catch (err) {
        console.error("Failed to load settings models:", err);
      } finally {
        setSettingsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleVisionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        setVisionTestFile(file);
        setVisionTestBase64(base64);
        setVisionTestMime(file.type);
        setVisionResult(null);
        setVisionError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTestVision = async () => {
    setTestingVision(true);
    setVisionResult(null);
    setVisionError(null);
    try {
      const data = await settingsService.testVision({
        modelId: visionModel,
        prompt: visionTestPrompt,
        image: visionTestBase64 || undefined,
        mimeType: visionTestMime || undefined,
      });

      if (data.ok) {
        setVisionResult(data.response);
      } else {
        setVisionError(data.error || "Unknown diagnostic error");
      }
    } catch (err: any) {
      setVisionError(err.message || String(err));
    } finally {
      setTestingVision(false);
    }
  };

  const handleTestImageGen = async () => {
    setTestingImage(true);
    setImageResult(null);
    setImageError(null);
    if (imageBlobUrl) {
      window.URL.revokeObjectURL(imageBlobUrl);
      setImageBlobUrl(null);
    }
    try {
      const data = await settingsService.testImageGen({
        modelId: imageGenModel,
        prompt: imageTestPrompt,
        size: "1024x1024",
      });

      if (data.ok && data.imageUrl) {
        setImageResult(data.imageUrl);

        const fileRes = await settingsService.fetchRawUrl(data.imageUrl + "?raw=true");
        if (!fileRes.ok) {
          throw new Error("Failed to download generated image for preview.");
        }
        const blob = await fileRes.blob();
        const objUrl = window.URL.createObjectURL(blob);
        setImageBlobUrl(objUrl);
      } else {
        setImageError(data.error || "Unknown image generation error");
      }
    } catch (err: any) {
      setImageError(err.message || String(err));
    } finally {
      setTestingImage(false);
    }
  };

  const handleTestVideoGen = async () => {
    setTestingVideo(true);
    setVideoResult(null);
    setVideoError(null);
    if (videoBlobUrl) {
      window.URL.revokeObjectURL(videoBlobUrl);
      setVideoBlobUrl(null);
    }
    try {
      const data = await settingsService.testVideoGen({
        modelId: videoGenModel,
        prompt: videoTestPrompt,
      });
      if (data.ok && data.videoUrl) {
        setVideoResult(data.videoUrl);
        const fileRes = await settingsService.fetchRawUrl(data.videoUrl + "?raw=true");
        if (!fileRes.ok) {
          throw new Error("Failed to download generated video for preview.");
        }
        const blob = await fileRes.blob();
        const objUrl = window.URL.createObjectURL(blob);
        setVideoBlobUrl(objUrl);
      } else {
        setVideoError(data.error || "Unknown video generation error");
      }
    } catch (err: any) {
      setVideoError(err.message || String(err));
    } finally {
      setTestingVideo(false);
    }
  };

  const handleUpdateVisionModel = async (model: string) => {
    setVisionModel(model);
    try {
      await settingsService.updateSettings({ visionModel: model });
    } catch (err) {
      console.error("Failed to update vision model settings:", err);
    }
  };

  const handleUpdateImageGenModel = async (model: string) => {
    setImageGenModel(model);
    try {
      await settingsService.updateSettings({ imageGenModel: model });
    } catch (err) {
      console.error("Failed to update image generation model settings:", err);
    }
  };

  const handleUpdateVideoGenModel = async (model: string) => {
    setVideoGenModel(model);
    try {
      await settingsService.updateSettings({ videoGenModel: model });
    } catch (err) {
      console.error("Failed to update video generation model settings:", err);
    }
  };

  const handleToggleVideoGenEnabled = async (enabled: boolean) => {
    setVideoGenEnabled(enabled);
    try {
      await settingsService.updateSettings({ videoGenEnabled: enabled });
    } catch (err) {
      console.error("Failed to update video generation toggle:", err);
    }
  };

  const handleUpdateSubagentMaxDepth = async (depth: number) => {
    setSubagentMaxDepth(depth);
    try {
      await settingsService.updateSettings({ subagentMaxDepth: depth });
    } catch (err) {
      console.error("Failed to update subagent max depth settings:", err);
    }
  };

  const handleToggleShowPromptPreviews = async (enabled: boolean) => {
    setShowPromptPreviews(enabled);
    try {
      await settingsService.updateSettings({ showPromptPreviews: enabled });
    } catch (err) {
      console.error("Failed to update show prompt previews setting:", err);
    }
  };

  const handleExportBackup = async () => {
    setExporting(true);
    setImportError("");
    setImportSuccess("");
    try {
      const blob = await settingsService.exportBackup(exportType);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `spaces-backup-${user?.username}-${exportType}-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : l.errorExporting;
      setImportError(errMsg);
    } finally {
      setExporting(false);
    }
  };

  const handleImportBackup = async (skipModal = false) => {
    if (!importFile) return;

    if (importMode === "overwrite" && !skipModal) {
      setShowOverwriteModal(true);
      setOverwriteConfirmation("");
      return;
    }

    setImporting(true);
    setImportError("");
    setImportSuccess("");
    try {
      await settingsService.importBackup(importMode, importFile);
      setImportSuccess(l.backupImported.replace("{mode}", importMode));
      setImportFile(null);
      setShowOverwriteModal(false);

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : l.errorImporting;
      setImportError(errMsg);
    } finally {
      setImporting(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!pwCurrent || !pwNew || !pwConfirm) {
      setPwError(l.allFieldsRequired);
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwError(l.passwordsDoNotMatch);
      return;
    }
    if (pwNew.length < 8) {
      setPwError(l.passwordMinLength);
      return;
    }
    setPwSaving(true);
    setPwError("");
    setPwSuccess(false);
    try {
      await changePassword(pwCurrent, pwNew);
      setPwSuccess(true);
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : l.failedChangePassword;
      setPwError(errMsg);
    } finally {
      setPwSaving(false);
    }
  };

  const resetPasswordForm = () => {
    setShowPasswordForm(false);
    setPwCurrent("");
    setPwNew("");
    setPwConfirm("");
    setPwError("");
    setPwSuccess(false);
  };

  return {
    l,
    user,
    logout,
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
    exportType,
    setExportType,
    importMode,
    setImportMode,
    importFile,
    setImportFile,
    importing,
    importError,
    setImportError,
    importSuccess,
    setImportSuccess,
    showOverwriteModal,
    setShowOverwriteModal,
    overwriteConfirmation,
    setOverwriteConfirmation,
    exporting,
    handleExportBackup,
    handleImportBackup,
    visionModel,
    imageGenModel,
    videoGenModel,
    visionModels,
    imageGenModels,
    videoGenModels,
    settingsLoading,
    subagentMaxDepth,
    showPromptPreviews,
    videoGenEnabled,
    visionTestPrompt,
    setVisionTestPrompt,
    visionTestFile,
    setVisionTestFile,
    setVisionTestBase64,
    setVisionTestMime,
    testingVision,
    visionResult,
    visionError,
    handleVisionFileChange,
    handleTestVision,
    imageTestPrompt,
    setImageTestPrompt,
    testingImage,
    imageResult,
    imageBlobUrl,
    imageError,
    handleTestImageGen,
    videoTestPrompt,
    setVideoTestPrompt,
    testingVideo,
    videoResult,
    videoBlobUrl,
    videoError,
    handleTestVideoGen,
    handleUpdateVisionModel,
    handleUpdateImageGenModel,
    handleUpdateVideoGenModel,
    handleToggleVideoGenEnabled,
    handleUpdateSubagentMaxDepth,
    handleToggleShowPromptPreviews,
  };
}
