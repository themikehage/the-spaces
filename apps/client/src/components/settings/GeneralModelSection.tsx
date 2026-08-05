// SPDX-License-Identifier: MIT
import { Dropdown } from "@/components/ui/Dropdown";

interface VisionModelOption {
  id: string;
  name: string;
  provider: string;
}

interface ImageGenModelOption {
  id: string;
  name: string;
  provider: string;
  description?: string;
  cost?: number;
  rpm?: number;
  concurrency?: number | null;
}

interface VideoGenModelOption {
  id: string;
  name: string;
  provider: string;
  description?: string;
  cost?: number;
  rpm?: number;
  concurrency?: number | null;
}

interface GeneralModelSectionProps {
  l: Record<string, string>;
  settingsLoading: boolean;
  visionModel: string;
  visionModels: VisionModelOption[];
  handleUpdateVisionModel: (model: string) => void;
  visionTestPrompt: string;
  setVisionTestPrompt: (val: string) => void;
  visionTestFile: File | null;
  visionTestBase64: string | null;
  visionTestMime: string | null;
  setVisionTestFile: (file: File | null) => void;
  setVisionTestBase64: (val: string | null) => void;
  setVisionTestMime: (val: string | null) => void;
  handleVisionFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  testingVision: boolean;
  handleTestVision: () => void;
  visionResult: string | null;
  visionError: string | null;
  imageGenModel: string;
  imageGenModels: ImageGenModelOption[];
  handleUpdateImageGenModel: (model: string) => void;
  imageTestPrompt: string;
  setImageTestPrompt: (val: string) => void;
  testingImage: boolean;
  handleTestImageGen: () => void;
  imageResult: string | null;
  imageBlobUrl: string | null;
  imageError: string | null;
  videoGenEnabled: boolean;
  handleToggleVideoGenEnabled: (enabled: boolean) => void;
  videoGenModel: string;
  videoGenModels: VideoGenModelOption[];
  handleUpdateVideoGenModel: (model: string) => void;
  videoTestPrompt: string;
  setVideoTestPrompt: (val: string) => void;
  testingVideo: boolean;
  handleTestVideoGen: () => void;
  videoResult: string | null;
  videoBlobUrl: string | null;
  videoError: string | null;
}

export function GeneralModelSection({
  l,
  settingsLoading,
  visionModel,
  visionModels,
  handleUpdateVisionModel,
  visionTestPrompt,
  setVisionTestPrompt,
  visionTestFile,
  visionTestBase64,
  visionTestMime,
  setVisionTestFile,
  setVisionTestBase64,
  setVisionTestMime,
  handleVisionFileChange,
  testingVision,
  handleTestVision,
  visionResult,
  visionError,
  imageGenModel,
  imageGenModels,
  handleUpdateImageGenModel,
  imageTestPrompt,
  setImageTestPrompt,
  testingImage,
  handleTestImageGen,
  imageResult,
  imageBlobUrl,
  imageError,
  videoGenEnabled,
  handleToggleVideoGenEnabled,
  videoGenModel,
  videoGenModels,
  handleUpdateVideoGenModel,
  videoTestPrompt,
  setVideoTestPrompt,
  testingVideo,
  handleTestVideoGen,
  videoResult,
  videoBlobUrl,
  videoError,
}: GeneralModelSectionProps) {
  return (
    <div className="bg-card rounded-lg p-4 border border-input/30 space-y-4">
      <h3 className="text-foreground font-semibold text-sm">{l.aiToolsConfig}</h3>
      <p className="text-muted-foreground text-[11px]">{l.aiToolsDesc}</p>
      {settingsLoading ? (
        <div className="text-xs text-muted-foreground animate-pulse">{l.loadingModels}</div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5 border-b border-input/10 pb-4">
            <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              {l.visionModel}
            </label>
            <Dropdown<string>
              value={visionModel}
              onChange={handleUpdateVisionModel}
              options={visionModels.map((m) => ({
                value: `${m.provider}/${m.id}`,
                label: `${m.name} (${m.provider})`,
              }))}
              placeholder={l.selectVisionModel}
              matchWidth
            />

            {visionModel && (
              <div className="mt-2 bg-background/50 p-3 rounded-lg border border-input/20 space-y-3 text-xs">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                  {l.diagnoseVision}
                </span>

                <div className="flex flex-col gap-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={visionTestPrompt}
                      onChange={(e) => setVisionTestPrompt(e.target.value)}
                      placeholder={l.promptAnalyzeImage}
                      className="flex-1 px-3 py-1.5 bg-background border border-input rounded-lg text-foreground outline-none focus:border-primary text-xs"
                    />
                    <div className="flex gap-2">
                      <label className="flex items-center justify-center px-3 py-1.5 bg-background hover:bg-card-hover/20 border border-input rounded-lg cursor-pointer transition-colors text-muted-foreground hover:text-foreground text-[11px] font-semibold">
                        <span>{visionTestFile ? l.imageLoaded : l.uploadImage}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleVisionFileChange}
                          className="hidden"
                        />
                      </label>
                      {visionTestFile && (
                        <button
                          type="button"
                          onClick={() => {
                            setVisionTestFile(null);
                            setVisionTestBase64(null);
                            setVisionTestMime(null);
                          }}
                          className="px-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors border border-destructive/25 text-[11px] font-semibold"
                        >
                          {l.clear}
                        </button>
                      )}
                    </div>
                  </div>

                  {visionTestFile && visionTestBase64 && (
                    <div className="flex items-center gap-2 bg-background p-2 rounded-lg border border-input/10">
                      <img
                        src={`data:${visionTestMime};base64,${visionTestBase64}`}
                        alt="preview"
                        className="w-10 h-10 object-cover rounded-md border border-input/30"
                      />
                      <div className="text-[10px] text-muted-foreground truncate flex-1">
                        {visionTestFile.name}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={testingVision}
                    onClick={handleTestVision}
                    className="w-full text-center text-xs bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {testingVision ? l.analyzingImage : l.runVisionTest}
                  </button>
                </div>

                {visionResult && (
                  <div className="p-2.5 bg-success/5 border border-success/20 text-success rounded-md whitespace-pre-wrap leading-relaxed select-all font-mono text-[11px]">
                    <span className="font-bold block mb-1">{l.response}</span>
                    {visionResult}
                  </div>
                )}

                {visionError && (
                  <div className="p-2.5 bg-destructive/5 border border-error/20 text-destructive rounded-md whitespace-pre-wrap font-mono text-[11px] break-words select-all">
                    <span className="font-bold block mb-1">{l.diagnosticFailure}</span>
                    {visionError}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              {l.imageGenModel}
            </label>
            <Dropdown<string>
              value={imageGenModel}
              onChange={handleUpdateImageGenModel}
              options={imageGenModels.map((m) => ({
                value: m.id,
                label: m.name,
              }))}
              placeholder={l.selectImageGenModel}
              matchWidth
            />

            {(() => {
              const selected = imageGenModels.find((m) => m.id === imageGenModel);
              if (!selected) return null;
              return (
                <div className="mt-2 bg-background p-3 rounded-lg border border-input/20 space-y-2 text-xs">
                  {selected.description && (
                    <p className="text-muted-foreground leading-relaxed">{selected.description}</p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2.5 border-t border-input/10">
                    {selected.cost !== undefined && (
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                          {l.cost}
                        </span>
                        <span className="text-foreground font-semibold">
                          ${selected.cost}
                          {l.perImage}
                        </span>
                      </div>
                    )}
                    {selected.rpm !== undefined && (
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                          {l.rateLimit}
                        </span>
                        <span className="text-foreground font-semibold">
                          {selected.rpm} {l.rpm}
                        </span>
                      </div>
                    )}
                    {selected.concurrency !== undefined && selected.concurrency !== null && (
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                          {l.concurrency}
                        </span>
                        <span className="text-foreground font-semibold">
                          {selected.concurrency} {l.concurrent}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {imageGenModel && (
              <div className="mt-2 bg-background/50 p-3 rounded-lg border border-input/20 space-y-3 text-xs">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                  {l.diagnoseImageGen}
                </span>

                <div className="flex flex-col gap-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={imageTestPrompt}
                      onChange={(e) => setImageTestPrompt(e.target.value)}
                      placeholder={l.promptGenerateImage}
                      className="flex-1 px-3 py-1.5 bg-background border border-input rounded-lg text-foreground outline-none focus:border-primary text-xs"
                    />
                    <button
                      type="button"
                      disabled={testingImage || !imageTestPrompt.trim()}
                      onClick={handleTestImageGen}
                      className="px-4 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 rounded-lg font-semibold transition-all disabled:opacity-50 cursor-pointer text-[11px]"
                    >
                      {testingImage ? l.generating : l.generateTestImage}
                    </button>
                  </div>
                </div>

                {imageResult && (
                  <div className="p-2.5 bg-success/5 border border-success/20 text-success rounded-md space-y-2">
                    <span className="font-bold block text-[11px]">{l.imageGenerated}</span>
                    <div className="relative group max-w-sm rounded-lg overflow-hidden border border-input/40 bg-card p-1">
                      {imageBlobUrl ? (
                        <img
                          src={imageBlobUrl}
                          alt="Generated Test"
                          className="w-full h-auto object-contain rounded-md"
                        />
                      ) : (
                        <div className="w-full h-32 flex items-center justify-center bg-card text-[11px] text-muted-foreground">
                          {l.loadingImagePreview}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {imageError && (
                  <div className="p-2.5 bg-destructive/5 border border-error/20 text-destructive rounded-md whitespace-pre-wrap font-mono text-[11px] break-words select-all">
                    <span className="font-bold block mb-1">{l.diagnosticFailure}</span>
                    {imageError}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-input/10">
            <div className="flex items-center gap-2 select-none mb-1">
              <input
                type="checkbox"
                id="videoGenEnabled"
                checked={videoGenEnabled}
                onChange={(e) => handleToggleVideoGenEnabled(e.target.checked)}
                className="w-4 h-4 accent-accent rounded border-input bg-background cursor-pointer"
              />
              <label
                htmlFor="videoGenEnabled"
                className="text-xs font-semibold text-foreground cursor-pointer"
              >
                {l.videoGenEnabled}
              </label>
            </div>

            {videoGenEnabled && (
              <div className="flex flex-col gap-1.5 pl-6">
                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                  {l.videoGenModel}
                </label>
                <Dropdown<string>
                  value={videoGenModel}
                  onChange={handleUpdateVideoGenModel}
                  options={videoGenModels.map((m) => ({
                    value: m.id,
                    label: m.name,
                  }))}
                  placeholder={l.selectVideoGenModel}
                  matchWidth
                />

                {(() => {
                  const selected = videoGenModels.find((m) => m.id === videoGenModel);
                  if (!selected) return null;
                  return (
                    <div className="mt-2 bg-background p-3 rounded-lg border border-input/20 space-y-2 text-xs">
                      {selected.description && (
                        <p className="text-muted-foreground leading-relaxed">
                          {selected.description}
                        </p>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2.5 border-t border-input/10">
                        {selected.cost !== undefined && (
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                              {l.cost}
                            </span>
                            <span className="text-foreground font-semibold">
                              ${selected.cost}
                              {l.perVideo}
                            </span>
                          </div>
                        )}
                        {selected.rpm !== undefined && (
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                              {l.rateLimit}
                            </span>
                            <span className="text-foreground font-semibold">
                              {selected.rpm} {l.rpm}
                            </span>
                          </div>
                        )}
                        {selected.concurrency !== undefined && selected.concurrency !== null && (
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                              {l.concurrency}
                            </span>
                            <span className="text-foreground font-semibold">
                              {selected.concurrency} {l.concurrent}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {videoGenModel && (
                  <div className="mt-2 bg-background/50 p-3 rounded-lg border border-input/20 space-y-3 text-xs">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                      {l.diagnoseVideoGen}
                    </span>

                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={videoTestPrompt}
                          onChange={(e) => setVideoTestPrompt(e.target.value)}
                          placeholder={l.promptGenerateVideo}
                          className="flex-1 px-3 py-1.5 bg-background border border-input rounded-lg text-foreground outline-none focus:border-primary text-xs"
                        />
                        <button
                          type="button"
                          disabled={testingVideo || !videoTestPrompt.trim()}
                          onClick={handleTestVideoGen}
                          className="px-4 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 rounded-lg font-semibold transition-all disabled:opacity-50 cursor-pointer text-[11px]"
                        >
                          {testingVideo ? l.generatingVideo : l.generateTestVideo}
                        </button>
                      </div>
                    </div>

                    {videoResult && (
                      <div className="p-2.5 bg-success/5 border border-success/20 text-success rounded-md space-y-2">
                        <span className="font-bold block text-[11px]">{l.videoGenerated}</span>
                        <div className="relative group max-w-sm rounded-lg overflow-hidden border border-input/40 bg-card p-1">
                          {videoBlobUrl ? (
                            <video
                              src={videoBlobUrl}
                              controls
                              className="w-full h-auto object-contain rounded-md"
                            />
                          ) : (
                            <div className="w-full h-32 flex items-center justify-center bg-card text-[11px] text-muted-foreground">
                              {l.loadingVideoPreview}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {videoError && (
                      <div className="p-2.5 bg-destructive/5 border border-error/20 text-destructive rounded-md whitespace-pre-wrap font-mono text-[11px] break-words select-all">
                        <span className="font-bold block mb-1">{l.diagnosticFailure}</span>
                        {videoError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
