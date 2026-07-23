import { loadPreviewConfig, savePreviewConfig } from "../preview-config";
import { getPreviewState } from "../preview-watcher";
import { runBuild, abortBuild } from "../preview-builder";
import { resolveProjectId } from "../session/workspace-resolver";


export interface ManagePreviewArgs {
  action: "status" | "configure" | "build" | "abort";
  config?: {
    framework: "auto" | "vite" | "next" | "nuxt" | "astro" | "html" | "custom";
    buildCommand?: string;
    outputDir?: string;
  };
}

export function createPreviewTools(username: string, projectName: string) {
  return [
    {
      name: "manage_preview",
      description: "Manage the project's build preview configuration and execution state (get status, configure build settings, run build, or abort build).",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["status", "configure", "build", "abort"],
            description: "The action to perform: 'status' to get current settings and state, 'configure' to update settings, 'build' to trigger a build, or 'abort' to stop an active build."
          },
          config: {
            type: "object",
            description: "The preview configuration parameters. Required only when action is 'configure'.",
            properties: {
              framework: {
                type: "string",
                enum: ["auto", "vite", "next", "nuxt", "astro", "html", "custom"],
                description: "The framework preset to use. Use 'html' for static websites without a build step."
              },
              buildCommand: {
                type: "string",
                description: "Custom build command to compile the app (e.g. 'npm run build', 'vite build')."
              },
              outputDir: {
                type: "string",
                description: "The directory where production build assets are generated (e.g. 'dist', 'build', '.next')."
              }
            },
            required: ["framework"]
          }
        },
        required: ["action"]
      },
      execute: async (toolCallId: string, rawArgs: unknown) => {
        try {
          const args = rawArgs as ManagePreviewArgs;
          const projectId = resolveProjectId(username, projectName) || projectName;
          const previewPagePath = `/projects/${projectId}/preview`;

          switch (args.action) {
            case "status": {
              const state = getPreviewState(username, projectName);
              return {
                content: [{
                  type: "text",
                  text: `Preview Page: ${previewPagePath}\n\n` + JSON.stringify(state, null, 2)
                }],
                details: { state, previewPagePath, projectId }
              };
            }
            case "configure": {
              if (!args.config) {
                return {
                  content: [{ type: "text", text: "Error: 'config' parameter is required when action is 'configure'" }],
                  details: { error: "Missing config parameter" }
                };
              }
              const saved = savePreviewConfig(username, projectName, {
                framework: args.config.framework,
                buildCommand: args.config.buildCommand,
                outputDir: args.config.outputDir,
              });
              return {
                content: [{ type: "text", text: `Preview configuration updated: ${JSON.stringify(saved, null, 2)}` }],
                details: { config: saved, previewPagePath, projectId }
              };
            }
            case "build": {
              const config = loadPreviewConfig(username, projectName);
              const result = await runBuild(username, projectName, config);
              return {
                content: [{
                  type: "text",
                  text: (result.success
                    ? `Build completed successfully (exit code ${result.exitCode}).`
                    : `Build failed with exit code ${result.exitCode}.`) +
                    ` You can view the live preview here: ${previewPagePath}`
                }],
                details: { ...result, previewPagePath, projectId }
              };
            }
            case "abort": {
              abortBuild(username, projectName);
              return {
                content: [{ type: "text", text: "Build abort signal sent." }],
                details: { aborted: true, previewPagePath, projectId }
              };
            }
            default:
              return {
                content: [{ type: "text", text: `Error: Unknown action '${args.action}'` }],
                details: { error: `Invalid action: ${args.action}`, previewPagePath, projectId }
              };
          }
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          return {
            content: [{ type: "text", text: `Error: ${errorMessage}` }],
            details: { error: errorMessage }
          };
        }
      }
    }
  ];
}
