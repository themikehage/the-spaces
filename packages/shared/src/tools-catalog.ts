// SPDX-License-Identifier: MIT

export const AVAILABLE_TOOLS = [
  "read",
  "write",
  "edit",
  "bash",
  "grep",
  "find",
  "ls",
  "request_approval",
  "ask_question",
  "render_images",
  "render_chart",
  "render_html",
  "share_file",
  "refresh_ui",
  "manage_delegations",
  "exa_search",
  "web_fetch",
  "task",
  "memory",
  "create_experiment",
  "vision",
  "generate_image",
  "generate_video",
  "manage_factory",
  "manage_custom_tools",
  "manage_preview",
] as const;

export type ToolName = (typeof AVAILABLE_TOOLS)[number];

export const TOOL_GROUPS = {
  filesystem: ["read", "write", "edit", "bash", "grep", "find", "ls"],
  communication: [
    "request_approval",
    "ask_question",
    "render_images",
    "render_chart",
    "render_html",
    "share_file",
    "refresh_ui",
  ],
  delegation: ["manage_delegations"],
  memory: ["memory"],
  tasks: ["task"],
  vision: ["vision", "generate_image", "generate_video"],
  factory: ["manage_factory", "manage_custom_tools"],
  search: ["exa_search", "web_fetch"],
  preview: ["manage_preview"],
} as const;

export type ToolGroup = keyof typeof TOOL_GROUPS;

export const DEFAULT_ALWAYS_ON_TOOLS: readonly string[] = [
  ...TOOL_GROUPS.communication,
  ...TOOL_GROUPS.tasks,
  ...TOOL_GROUPS.vision,
  ...TOOL_GROUPS.factory,
  ...TOOL_GROUPS.delegation,
];

export function isKnownTool(name: string): boolean {
  return (AVAILABLE_TOOLS as readonly string[]).includes(name);
}

export function toolsInGroup(group: ToolGroup): readonly string[] {
  return TOOL_GROUPS[group] ?? [];
}

export function getAlwaysOnTools(): readonly string[] {
  return DEFAULT_ALWAYS_ON_TOOLS;
}

/** Legacy aliases for backwards compatibility */
export const TOOL_GROUPS_LEGACY = {
  fs: TOOL_GROUPS.filesystem,
  execution: ["bash", "manage_preview"],
  communication: TOOL_GROUPS.communication,
  ui: ["render_images", "render_chart", "render_html"],
  delegation: TOOL_GROUPS.delegation,
  web: TOOL_GROUPS.search,
  task: TOOL_GROUPS.tasks,
  memory: TOOL_GROUPS.memory,
  media: TOOL_GROUPS.vision,
  meta: ["manage_factory", "create_experiment"],
  FILESYSTEM: TOOL_GROUPS.filesystem,
  COMMUNICATION: TOOL_GROUPS.communication,
  DELEGATION: TOOL_GROUPS.delegation,
  MEMORY: TOOL_GROUPS.memory,
  TASKS: TOOL_GROUPS.tasks,
  VISION: TOOL_GROUPS.vision,
  FACTORY: TOOL_GROUPS.factory,
  SEARCH: TOOL_GROUPS.search,
  PREVIEW: TOOL_GROUPS.preview,
} as const;

export interface ToolDisplayMeta {
  label: string;
  description: string;
  displayName: string;
  colorClass?: string;
}

export const TOOL_DISPLAY_META: Record<ToolName, ToolDisplayMeta> = {
  read: {
    label: "read",
    displayName: "Read File",
    description: "Reads file content",
    colorClass: "text-muted-foreground",
  },
  write: {
    label: "write",
    displayName: "Write File",
    description: "Writes content to a file",
    colorClass: "text-primary",
  },
  edit: {
    label: "edit",
    displayName: "Edit File",
    description: "Edits blocks within a file",
    colorClass: "text-warning",
  },
  bash: {
    label: "bash",
    displayName: "Run Command",
    description: "Executes shell commands",
    colorClass: "text-primary",
  },
  grep: {
    label: "grep",
    displayName: "Grep Search",
    description: "Searches text patterns in files",
    colorClass: "text-highlight",
  },
  find: {
    label: "find",
    displayName: "Find Files",
    description: "Finds files by name or pattern",
    colorClass: "text-primary",
  },
  ls: {
    label: "ls",
    displayName: "List Directory",
    description: "Lists directory contents",
    colorClass: "text-primary",
  },
  request_approval: {
    label: "request_approval",
    displayName: "Request Approval",
    description: "Asks the user for approval",
    colorClass: "text-warning",
  },
  ask_question: {
    label: "ask_question",
    displayName: "Ask Question",
    description: "Asks the user a question",
    colorClass: "text-warning",
  },
  render_images: {
    label: "render_images",
    displayName: "Render Images",
    description: "Displays images in the UI",
    colorClass: "text-primary",
  },
  render_chart: {
    label: "render_chart",
    displayName: "Render Chart",
    description: "Renders a data chart",
    colorClass: "text-primary",
  },
  render_html: {
    label: "render_html",
    displayName: "Render HTML",
    description: "Renders an HTML document",
    colorClass: "text-primary",
  },
  share_file: {
    label: "share_file",
    displayName: "Share File",
    description: "Shares a file with the user",
    colorClass: "text-primary",
  },
  refresh_ui: {
    label: "refresh_ui",
    displayName: "Refresh UI",
    description: "Triggers a UI refresh",
    colorClass: "text-primary",
  },
  manage_delegations: {
    label: "manage_delegations",
    displayName: "Manage Delegations",
    description: "Manages subagent delegations",
    colorClass: "text-primary",
  },
  exa_search: {
    label: "exa_search",
    displayName: "Exa Search",
    description: "Searches the web via Exa",
    colorClass: "text-highlight",
  },
  web_fetch: {
    label: "web_fetch",
    displayName: "Web Fetch",
    description: "Fetches content from a URL",
    colorClass: "text-highlight",
  },
  task: {
    label: "task",
    displayName: "Manage Tasks",
    description: "Creates and manages tasks",
    colorClass: "text-primary",
  },
  memory: {
    label: "memory",
    displayName: "Memory",
    description: "Reads and writes long-term memory",
    colorClass: "text-accent",
  },
  create_experiment: {
    label: "create_experiment",
    displayName: "Create Experiment",
    description: "Creates a lab experiment",
    colorClass: "text-primary",
  },
  vision: {
    label: "vision",
    displayName: "Vision",
    description: "Analyzes images",
    colorClass: "text-primary",
  },
  generate_image: {
    label: "generate_image",
    displayName: "Generate Image",
    description: "Generates images with AI",
    colorClass: "text-primary",
  },
  generate_video: {
    label: "generate_video",
    displayName: "Generate Video",
    description: "Generates videos with AI",
    colorClass: "text-primary",
  },
  manage_factory: {
    label: "manage_factory",
    displayName: "Factory",
    description: "Manages agent factory",
    colorClass: "text-primary",
  },
  manage_custom_tools: {
    label: "manage_custom_tools",
    displayName: "Custom Tools",
    description: "Manages custom tools",
    colorClass: "text-primary",
  },
  manage_preview: {
    label: "preview",
    displayName: "Preview",
    description: "Manages project preview",
    colorClass: "text-emerald-500",
  },
};

export type ToolPreset = "autonomous" | "standard" | "readonly";

export const TOOL_PRESETS: Record<ToolPreset, ToolName[]> = {
  autonomous: AVAILABLE_TOOLS.filter(
    (t) => !["request_approval", "ask_question"].includes(t),
  ) as ToolName[],
  standard: [
    "read",
    "write",
    "edit",
    "bash",
    "grep",
    "find",
    "ls",
    "task",
    "memory",
    "request_approval",
    "ask_question",
    "render_html",
  ],
  readonly: ["read", "grep", "find", "ls"],
};

export const GATE_ENV_VARS: Partial<Record<ToolName, string>> = {
  exa_search: "EXA_API_KEY",
};
