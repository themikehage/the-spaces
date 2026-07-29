// SPDX-License-Identifier: MIT
export const CUSTOM_TOOL_INSTRUCTIONS = `
## Custom Tool Builder

You have access to a \`manage_custom_tools\` tool that lets you create, update, delete, and manage custom tools on demand. 

### When to Create a Custom Tool
1. You need to execute a multi-step workflow repeatedly (pipeline mode).
2. You want to display structured data to the user as cards, tables, metrics, etc. (UI mode).
3. The task requires combining several existing tools into a single reusable operation.

### Tool Definition Contract
The tool accepts the following JSON structure:
{
  "name": "snake_case_name",        // Required: unique lowercase letters/numbers/underscores
  "label": "Human Readable Name",   // Optional: UI display name
  "description": "Detailed description of what this tool does, when to use it, and what it returns.", // Required (10-500 chars)
  "dependencies": ["openpyxl"],    // Optional: list of external packages or tools required
  "parameters": {                   // Required: JSON Schema for inputs
    "type": "object",
    "properties": {
      "header_row": { "type": "number", "default": 1 } // Note: "default" values are automatically populated into scope if omitted by caller
    },
    "required": [...]
  },
  "execute": { ... },              // Optional: how the tool runs (default: {"type": "ui"})
  "ui": { ... },                   // Optional: how results look in the UI (see Tiers)
  "presentation": {                // Optional: UI presentation preferences
    "defaultExpanded": true,       // Whether the tool result is expanded by default in chat (default: true)
    "accordionDefaultOpen": true   // Default open state for accordion items when not specified per item (default: true)
  }
}

### Execution Modes & Variable Interpolation Rules
1. **Pipeline (type: "pipeline")**: Runs existing tools (bash, read, write, edit, grep, find, ls) sequentially.
   - Resolve parameters via \`{varName}\` from inputs (including defaults) or prior step outputs.
   - **Full-replacement mode**: If a step parameter value is EXACTLY \`"{varName}"\`, it resolves to the native object/array/type instead of a string.
   - **Bash Tool Rules & Stdin**:
     - The \`bash\` tool **does NOT support** a \`stdin\` parameter.
     - Pass scripts or stdin via heredoc inside the command string:
       \`\`\`bash
       python3 << 'PYEOF'
       import json, sys
       PATH_RAW = "{path}"
       SHEETS_RAW = '{sheets}' # Use single quotes for variables that may resolve to arrays or JSON strings
       ...
       PYEOF
       \`\`\`
   - **Handling Optional/Unsubstituted Variables in Scripts**:
     If a variable has no default and is optional, it remains \`"{varName}"\` if omitted. In Python, detect unsubstituted variables using:
     \`\`\`python
     def is_unsubstituted(val):
         return isinstance(val, str) and val.startswith("{") and val.endswith("}")
     \`\`\`

2. **UI (type: "ui")**: Pure visual rendering tool. No server-side execution. The \`ui\` block defines what the user sees.

### UI Components Tiers & Guidelines
- **UI Structure is Static**: Dynamic property names like \`tabsVariable\` or \`columnsVariable\` DO NOT exist. UI component definitions must use valid static types (e.g. \`code\`, \`table\`, \`card-list\`).
- **Output Substitution**: UI fields support template variables from pipeline step outputs, e.g.:
  \`\`\`json
  "ui": {
    "type": "code",
    "code": "{excel_output}",
    "language": "json",
    "title": "Datos extraídos"
  }
  \`\`\`

- **Tier 1 — Base**:
  - **card**: \`{ "type": "card", "title": "...", "description": "...", "status": "success|warning|error|info", "metadata": {} }\`
  - **card-list**: \`{ "type": "card-list", "title": "...", "cards": [...], "columns": 2 }\`
  - **table**: \`{ "type": "table", "title": "...", "columns": ["Header1"], "rows": [{"Header1": "val"}], "striped": true }\`
  - **badge**: \`{ "type": "badge", "text": "...", "variant": "success|warning|error|info|neutral" }\`
  - **metric**: \`{ "type": "metric", "label": "...", "value": "...", "trend": "up|down|neutral" }\`
  - **code**: \`{ "type": "code", "code": "...", "language": "ts", "title": "..." }\`
  - **section**: \`{ "type": "section", "title": "...", "children": [...] }\`
  - **html**: \`{ "type": "html", "html": "...", "title": "...", "height": "70vh" }\`
- **Tier 2 — Media**:
  - **video**: \`{ "type": "video", "src": "...", "title": "..." }\`
  - **audio**: \`{ "type": "audio", "src": "...", "title": "..." }\`
  - **pdf**: \`{ "type": "pdf", "src": "...", "title": "..." }\`
- **Tier 3 — High-Demand**:
  - **tabs**: \`{ "type": "tabs", "tabs": [{ "label": "Tab1", "content": [...] }] }\`
  - **markdown**: \`{ "type": "markdown", "content": "# MD content" }\`
  - **progress**: \`{ "type": "progress", "value": 75, "label": "Progress" }\`
  - **accordion**: \`{ "type": "accordion", "items": [{ "title": "Sec", "content": [...], "defaultOpen": true }] }\`
  - **diff**: \`{ "type": "diff", "oldCode": "...", "newCode": "..." }\`
  - **steps**: \`{ "type": "steps", "steps": [{ "label": "Build", "status": "done" }] }\`
  - **stats**: \`{ "type": "stats", "stats": [{ "label": "...", "value": "..." }] }\`
  - **timeline**: \`{ "type": "timeline", "items": [{ "title": "Event", "date": "2026-01" }] }\`
`;
