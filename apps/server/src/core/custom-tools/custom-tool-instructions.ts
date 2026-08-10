// SPDX-License-Identifier: MIT
export const CUSTOM_TOOL_INSTRUCTIONS = `
## Folder-Based Custom Tool Builder

You have access to a \`manage_custom_tools\` tool that allows you to create, update, delete, and inspect custom tools.
Custom tools are stored as self-contained tool folders inside the user's custom tools store (NOT in the workspace).

\`\`\`
<tool_name>/
  definition.json    # Machine contract: name, description, parameters, execute mode, presentation, requiresApproval
  Tool.md            # Agent instructions for tool usage
  ui/
    index.html       # Handlebars HTML template for rich visual rendering
  scripts/
    execute.js       # Execution script (for "script" execution mode)
\`\`\`

**IMPORTANT**: Do NOT use \`write\` or \`bash\` to create tool files. Use \`manage_custom_tools\` with the parameters below.

### Tool Definition Contract (\`definition.json\`)
{
  "name": "snake_case_name",        // Required: lowercase letters, numbers, underscores
  "label": "Human Readable Name",   // Optional: UI display label
  "description": "Detailed description of what this tool does, when to use it, and what it returns.", // Required (10-500 chars)
  "requiresApproval": false,        // Optional: set to true if execution requires explicit user confirmation
  "dependencies": ["openpyxl"],    // Optional: external packages or binary dependencies
  "parameters": {                   // Required: JSON Schema for inputs
    "type": "object",
    "properties": {
      "query": { "type": "string" }
    },
    "required": ["query"]
  },
  "execute": { ... },              // Optional: execution mode ("ui", "script")
  "presentation": {                // Optional: chat UI presentation preferences
    "defaultExpanded": true,
    "accordionDefaultOpen": true
  }
}

### Execution Modes
1. **Script (\`type: "script"\`)**: Runs a JS/TS/Shell script located inside \`scripts/\` (e.g. \`scripts/execute.js\`).
   - Pass the script source code as \`scriptContent\` in the \`manage_custom_tools(action: "upsert")\` call.
   - The script receives parameters via stdin (JSON) and environment variable \`SPACES_TOOL_PARAMS\`.
   - Returns output via stdout as JSON.
   - **Runtime: Bun (ES2019 only)**. Do NOT use optional chaining (\`?.\`), nullish coalescing (\`??\`), or any ES2020+ syntax.
   - Instead of \`signal?.addEventListener\`, use \`if (signal) { signal.addEventListener(...) }\`

2. **UI (\`type: "ui"\`)**: Pure visual rendering tool. Renders \`ui/index.html\` using Handlebars with input parameters.
   - Pass the Handlebars HTML template as \`uiHtml\` in the \`manage_custom_tools(action: "upsert")\` call.

### Creating Tools — Correct Workflow
1. Call \`manage_custom_tools(action: "upsert", tool: { ...definition... }, scriptContent: "<JS code>", uiHtml: "<HTML code>", instructionsMd: "...")\`
2. That single call writes \`definition.json\`, \`Tool.md\`, \`scripts/execute.js\`, and \`ui/index.html\` atomically to the user's custom tools store.
3. Call the tool to verify it works. No file writing outside of \`manage_custom_tools\` is needed.

### HTML UI Design Guidelines (\`ui/index.html\`)
The HTML is rendered as an **embedded chat message widget**, NOT a standalone web page (SPA).

1. **Layout & Dimensions**:
   - Do NOT use \`100vh\`, \`height: 100%\`, or fixed full-screen wrappers.
   - Keep padding compact (\`padding: 0.5rem 0.75rem\`).
   - Use flexible container cards (\`class="card"\`) or grid layouts (\`class="stats-grid"\`).

2. **Theme Integration & Styling**:
   - Background is transparent by default so it blends into the chat bubble.
   - Use pre-injected CSS variables:
     - Surface background: \`var(--surface)\`, \`var(--surface-hover)\`
     - Text colors: \`var(--text-primary)\`, \`var(--text-secondary)\`
     - Accent & status: \`var(--accent)\`, \`var(--success)\`, \`var(--warning)\`, \`var(--error)\`
     - Borders: \`var(--border)\`
   - Use built-in CSS classes: \`.card\`, \`.card-title\`, \`.card-desc\`, \`.badge\`, \`.badge-success\`, \`.table\`, \`.metric-value\`, \`.stats-grid\`, \`.stat-card\`.

3. **Handlebars Data Binding & Built-in Helpers**:
   - Access inputs via \`{{params.varName}}\`
   - Access outputs via \`{{result.varName}}\`
   - Use Handlebars blocks: \`{{#if condition}}...{{/if}}\`, \`{{#each items}}...{{/each}}\`
   - Built-in comparison/logical helpers:
     - Comparison: \`eq\`, \`ne\`, \`gt\`, \`gte\`, \`lt\`, \`lte\` (e.g. \`{{#if (eq params.mode "dark")}}...\`)
     - Logic: \`and\`, \`or\`, \`not\` (e.g. \`{{#if (and result.success (gte result.count 1))}}...\`)
     - Utility: \`concat\`, \`json\`, \`includes\`
`;
