export const TOOL_GROUPS = {
  FILESYSTEM: ["read", "write", "edit", "bash", "grep", "find", "ls"],
  COMMUNICATION: [
    "request_approval",
    "ask_question",
    "render_images",
    "render_html",
    "render_chart",
    "share_file",
    "refresh_ui",
  ],
  DELEGATION: ["manage_delegations"],
  MEMORY: ["memory_store", "memory_recall", "memory_forget"],
  TASKS: ["decompose_tasks", "update_task_status", "complete_task_list"],
  VISION: ["vision", "generate_image"],
  FACTORY: ["manage_factory", "manage_custom_tools"],
  SEARCH: ["exa_search", "web_fetch"],
  PREVIEW: ["manage_preview"],
} as const;

export type ToolGroupName = keyof typeof TOOL_GROUPS;

export const DEFAULT_ALWAYS_ON_TOOLS: string[] = [
  ...TOOL_GROUPS.COMMUNICATION,
  ...TOOL_GROUPS.TASKS,
  ...TOOL_GROUPS.VISION,
  ...TOOL_GROUPS.FACTORY,
  ...TOOL_GROUPS.DELEGATION,
];
