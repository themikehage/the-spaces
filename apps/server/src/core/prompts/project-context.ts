// SPDX-License-Identifier: MIT
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";

export interface ProjectContextParams {
  projectId: string;
  projectName: string;
  projectDir: string;
  cloneUrl?: string;
  previewState?: {
    config?: {
      framework?: string;
      buildCommand?: string;
      outputDir?: string;
    };
    status?: string;
    distExists?: boolean;
    indexHtmlExists?: boolean;
  };
  previewUrl?: string;
}

export function buildProjectContextPrompt(params: ProjectContextParams): string {
  const { projectId, projectName, projectDir, cloneUrl, previewState, previewUrl } = params;

  let prompt =
    `\n\n## Project Context\n` +
    `You are working inside a project workspace. Here is the project metadata:\n` +
    `- **Project ID**: ${projectId}\n` +
    `- **Project Name**: ${projectName}\n` +
    `- **Workspace Path**: ${join(projectDir, "workspace")}\n` +
    (cloneUrl ? `- **Clone URL**: ${cloneUrl}\n` : "") +
    `\nAll your file operations are sandboxed to the workspace path above. Do NOT attempt to navigate outside it with relative paths like \`..\`.\n`;

  if (previewState && previewUrl) {
    prompt +=
      `\n## Project Preview & Build Capabilities\n` +
      `This workspace has an integrated real-time preview server and build watcher.\n` +
      `Current Preview Configuration:\n` +
      `- **Framework Preset**: ${previewState.config?.framework || "auto"}\n` +
      `- **Build Command**: ${previewState.config?.buildCommand || "None (or npm run build auto-fallback)"}\n` +
      `- **Output Directory**: ${previewState.config?.outputDir || "dist"}\n` +
      `- **Status**: ${previewState.status} (distExists: ${previewState.distExists}, indexHtmlExists: ${previewState.indexHtmlExists})\n` +
      `- **Preview URL**: ${previewUrl}\n\n` +
      `You have a dedicated tool to interact with the preview system: \`manage_preview\` (supporting actions 'status', 'configure', 'build', and 'abort').\n` +
      `Always run a build using \`manage_preview(action: "build")\` rather than manual bash scripts when you modify frontend assets (e.g. React/Vite/Next.js/Astro) so that the user's browser updates in real time, and logs are displayed in the workspace UI.`;
  }

  return prompt;
}
