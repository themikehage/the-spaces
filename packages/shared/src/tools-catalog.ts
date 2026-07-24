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
  "decompose_tasks",
  "update_task_status",
  "complete_task_list",
  "memory_store",
  "memory_recall",
  "memory_forget",
  "create_experiment",
  "vision",
  "generate_image",
  "generate_video",
  "manage_factory",
  "manage_custom_tools",
  "manage_pipelines",
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
  memory: ["memory_store", "memory_recall", "memory_forget"],
  tasks: ["decompose_tasks", "update_task_status", "complete_task_list"],
  vision: ["vision", "generate_image", "generate_video"],
  factory: ["manage_factory", "manage_custom_tools"],
  search: ["exa_search", "web_fetch"],
  preview: ["manage_preview"],
  pipelines: ["manage_pipelines"],
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
  meta: ["manage_factory", "create_experiment", "manage_pipelines"],
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
