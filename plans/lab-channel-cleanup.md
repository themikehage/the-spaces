# Lab & Channel Dead Code — Cleanup Inventory

## What gets deleted

### 🗑️ Files to delete entirely
| File | Why |
|------|-----|
| `core/prompts/lab-architect.ts` | `LAB_ARCHITECT_DEFINITION` — lab agent, no longer exists |

### 📝 Files to modify

#### `packages/shared/src/session-prefix.ts`
Remove: `LAB`, `BENCHMARK`, `BENCH_CLONE` prefixes.  
Keep: `EXEC`, `DELEGATE`, `SUBAGENT`, `TEAM`, `GENERATE`.

> **Note on EXEC:** `SessionPrefix.EXEC` is used in 10+ places in `routes/sessions.ts` as a guard for "agent server execution" sessions. It's still functional — verify before removing.

---

#### `core/prompts/prompt-assembly.ts`
- Remove import: `LAB_APPEND_INSTRUCTIONS`
- Remove modes from `PromptAssemblyMode`: `"channel-member"`, `"experiment-member"`
- Remove `case "channel-member"` from `assemblePromptAppends()` switch (merge into `"agent-startup"` case)
- Remove `case "experiment-member"` block entirely

#### `core/prompts/system-instructions.ts`
- Remove export: `LAB_APPEND_INSTRUCTIONS`

#### `core/session/agent-definition-resolver.ts`
- Remove the `if (resolvedAgentId === "lab-architect")` block (lines 16-34)

#### `core/session/tool-activation-engine.ts`
- Remove: `if (resolvedAgentId === "lab-architect") { alwaysOnTools.push("create_experiment"); }`
- Simplify: always push `"manage_delegations"` unconditionally

#### `core/session/prompt-builder.ts`
- Remove: `experimentId` from `BuildPromptsParams` interface
- Remove: the `if (resolvedAgentId === "lab-architect")` block (line 180)
- Remove: the `if (experimentId)` block (lines 181-207)

#### `core/session/session-lister.ts`
- Remove: `channelId?: string` from `SessionListItem`
- Remove: `experimentId?: string` from `SessionListItem`
- Remove: `channelId: metadata.channelId` from mapping (line 115)
- Remove: `experimentId: metadata.experimentId` from mapping (line 117)
- Remove: `!entry.name.startsWith(SessionPrefix.LAB)` filter (line 66)

#### `core/session-manager.ts`
- Remove: `channelId?: string` parameter from `getOrCreateSession()`
- Remove: all `resolvedChannelId` logic (~8 lines)
- Remove: `experimentId` from metadata update block (line 356)

#### `agents/create-agent-server.ts`
- Remove: `const isLaboratory = definition.id.startsWith(SessionPrefix.LAB);`
- Simplify: `createUiTools(workspaceDir, username, false, { ... })` — always `false`, remove the conditional

#### `core/tools/ui-tools.ts`
- Remove: `isLaboratory?: boolean` parameter
- Remove: `if (isLaboratory)` blocks in `ask_question` and `render_images` handlers (lines 28, 62-65)
- Remove: `"channel"` and `"experiment"` from `refresh_ui` enum (line 223)
- Update description (line 217): remove "channels, experiments"

#### `core/tools/factory-contracts.ts`
- Remove: `experiments` contract block (lines 270-291)

#### `core/tools/factory-tool.ts`
- Remove: `"experiments"` from entity enum (line 631)
- Update description (lines 610-612): remove "laboratory experiments" and "experiments"
- Remove: `"laboratory experiments"` and experiments handling code

#### `core/tools/manage-delegations-tool.ts`
- Remove: `import { forwardChannelEvents }` (line 18)
- Remove: `if (parentMeta.channelId)` block (lines 155-157)
- Remove: `const unsub = forwardChannelEvents(...)` call (line 528)

#### `core/scope/scope-config-manager.ts`
- Remove: `channels: Record<string, {...}>` from config type (line 18)
- Remove: `{ type: "channel"; id: string }` from union type (line 31)
- Remove: `channels: {}` from default config objects (lines 95, 128)
- Remove: `if (config.channels)` block (line 150)

#### `ws/registry.ts`
- Remove: `channelId?: string` from socket metadata
- Remove: `channelSockets = new Map<string, Set<WSContext>>()`
- Remove: `addChannelSocket()` method
- Remove: `removeChannelSocket()` method

#### `ws/handler.ts`
- Remove: `if (meta.channelId) wsRegistry.removeChannelSocket(...)` (line 153)

#### `ws/factory.ts`
- Remove: `|| sessionId.startsWith(SessionPrefix.LAB)` from line 42
- Remove: `"create_experiment"` from tool list (line 416)

#### `routes/sessions.ts`
- Remove: `channelId` from session creation request schema
- Remove: `channelId` from `getOrCreateSession()` call
- Remove: `channelId: channelId || null` from metadata write
- Remove: `experimentId` from request schema and metadata

#### `routes/skills.ts`
- Remove: `"factory-channels"` from skill list (line 58)

---

## What to verify before deleting

- [ ] **`SessionPrefix.EXEC`** — used 10+ times in `routes/sessions.ts` as guard for agent-server execution sessions. May still be needed. Confirm with owner.
- [ ] **`SessionPrefix.TEAM`** and `SessionPrefix.GENERATE`** — do not remove, still active.
- [ ] **`core/agent-utils.ts`** — contains `forwardChannelEvents`. After removing the one call in `manage-delegations-tool.ts`, check if anything else imports it.
- [ ] **`core/prompts/fragments/`** — `role-member.ts` and `role-senior.ts` contain channel collaboration protocols. They may be used for `debate-stateless` team mode (not channel). Verify before deleting.

## Tests to clean up

- `__tests__/layered-prompt.test.ts` — remove assertions for `"channel"` and `"experiment-member"` modes
- `__tests__/delegate-tool-team.test.ts` — remove `channelId` from mock params
- `__tests__/factory-contracts.test.ts` — remove `"experiments"` assertion
