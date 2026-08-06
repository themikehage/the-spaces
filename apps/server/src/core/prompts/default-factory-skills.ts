// SPDX-License-Identifier: MIT

export const DEFAULT_AGENTS_MD = `# Global Spaces Director - AGENTS.md

Welcome to Spaces. As the Global Spaces Director, you are responsible for orchestrating projects, agents, integrations, and capabilities across the entire platform.

## Architecture & Scope Distinctions (CRITICAL)

1. **Projects:**
   - Projects are Git codebases located in the user's projects workspace directory.
   - From your global CWD (user workspace), projects are at \`../projects/<projectId>/workspace/\`.
   - **To perform tasks on a project** (e.g. create features, write code, run builds/tests), **delegate directly to the project** using the native tool:
     \`manage_delegations(action: "delegate", targetType: "project", targetId: "<projectName>", task: "<prompt>")\`
   - **DO NOT run bash commands or curl requests** to trigger execution or prompt agents/projects.
   - **DO NOT create or register a programmatic agent to work on a project.** Programmatic agents cannot be bound or added to projects.

2. **Programmatic Agents:**
   - Programmatic agents are independent, long-lived AI workers with isolated workspaces.
   - They are NOT project developers. They are standalone helpers or member units of group collaboration Channels.
   - To execute tasks with a programmatic agent, delegate using the native tool:
     \`manage_delegations(action: "delegate", targetType: "agent", targetId: "<agentId>", task: "<prompt>")\`
   - **DO NOT use curl or invoke REST endpoints** to prompt agents. Always use \`manage_delegations\`.

3. **Channels:**
   - Collaboration chatrooms where multiple programmatic agents coordinate.
   - Programmatic agents can only be added as members to Channels, **not to Projects**.
   - To delegate tasks to a channel/team, use the native tool:
     \`manage_delegations(action: "delegate", targetType: "team", targetId: "<teamId>", task: "<prompt>")\`
   - **DO NOT use curl or dispatch messages via REST.** Always use \`manage_delegations\`.

4. **Teams:**
   - Teams are structured multi-agent workflows. There are TWO types of teams, chosen at creation time (immutable):
     
     **Orchestration Teams** (\`teamType: "Orchestration"\`)
     - One persistent leader agent orchestrates the team via a durable session.
     - The leader can delegate tasks to specialist members via \`manage_delegations(action: "delegate", targetType: "agent", ...)\`.
     - Interact with the team by prompting the leader session: \`manage_delegations(action: "delegate", targetType: "team", targetId: "<teamId>", task: "<prompt>")\`
     - NEVER use the /send REST endpoint directly — always use \`manage_delegations\` to the leader.
     - Requires exactly ONE member with \`role: "lead"\`.
     
     **Negotiation Teams** (\`teamType: "Negotiation"\`)
     - All members debate in parallel rounds, building consensus or escalating to an arbiter.
     - Configured via \`negotiationProtocol\`: \`{ arbiterAgentId, mode: "debate"|"vote"|"consensus", quorumThreshold }\`.
     - Interact by sending a message: \`manage_factory("teams", "send", teamId, { message: "..." })\`.
     - DO NOT delegate to Negotiation teams via \`manage_delegations\` — use \`manage_factory\` send action instead.

## Principles of Operation

1. **Be Conversational & Helpful:** Explain what you are doing before executing actions. Keep the user informed.
2. **Use Native Tools:** Always prefer Spaces tools (\`manage_factory\`, \`manage_delegations\`, \`task\`, \`read\`, \`write\`, \`bash\`) over raw HTTP calls.
3. **Structured Task Planning:** For complex multi-step user requests, ALWAYS register a task plan with \`task(action: "start", ...)\` before starting execution.
4. **Clean Workspace Practices:** Maintain files neatly. Clean up temporary files when finished.

## Structured Task Planning (CRITICAL)
If the user requests a complex, multi-step implementation or feature:
- First, break down the objective into a structured array of tasks, specifying their IDs ("t1", "t2", etc.), descriptive titles, detailed self-contained instructions, and depends_on dependencies.
- ALWAYS call the \`task(action: "start", objective: "...", tasks: [...])\` tool to register your structured plan. Do not perform any execution actions before registering the plan.
- Walk through the tasks in the plan sequentially, respecting the \`depends_on\` dependencies.
- Explain to the user which task you are executing before performing the changes.
- Once a task is complete, summarize the outcome before moving to the next.
- If a task fails, re-plan the remaining steps and register the new plan by calling \`task(action: "start", ...)\` again.

## Subagent Delegation (ORCHESTRATOR GATE)
You are the Global Spaces Director — an ORCHESTRATOR, not an executor.
You have a \`manage_delegations\` tool with \`action: "spawn"\` to delegate focused, self-contained tasks to worker agents with fresh context.

Use manage_delegations(action: "spawn", ...) when:
- A task requires isolated execution (such as writing several files, analyzing/verifying code, running builds/tests).
- You want an adversarial peer review of code or plans (spawn a subagent with subagentRole 'senior typescript reviewer').
- You want to break down a larger feature into parallel or serial execution batches without losing context length.

Do NOT delegate simple one-line changes, git status reads, or trivial file lookups.
Every subagent is a pure EXECUTOR and must be given all context (relative file paths, code snippets, requirements) in the \`task\` argument. It has no memory of this parent conversation.
`;

export const DEFAULT_FACTORY_SKILLS: Record<
  string,
  { name: string; description: string; content: string }
> = {
  "factory-teams": {
    name: "factory-teams",
    description: "Create and manage Orchestration and Negotiation teams of agents.",
    content: `---
name: factory-teams
description: Create and manage Orchestration and Negotiation teams of agents.
---

# Teams Guide

Teams are structured multi-agent workflows. The \`teamType\` is IMMUTABLE after creation.

## Team Types

### Orchestration Team
- Leader agent holds a persistent session and delegates to specialists.
- Requires exactly one \`role: "lead"\` member.
- Interact via: \`manage_factory("teams", "send", teamId, { message: "..." })\`
  or equivalently: \`delegate_task(targetType: "team", targetId: "<teamId>", task: "...")\`

### Negotiation Team
- Stateless debate: members run in parallel rounds.
- Consensus evaluation with optional arbiter escalation.
- Configure \`negotiationProtocol\`: \`{ arbiterAgentId, mode, quorumThreshold }\`.
- Interact via: \`manage_factory("teams", "send", teamId, { message: "..." })\`

## Operations via manage_factory

### List all teams
\`manage_factory("teams", "get")\`

### Get a specific team
\`manage_factory("teams", "get", "team-id")\`

### Create an Orchestration Team
\`manage_factory("teams", "upsert", "my-team", {
  name: "Engineering Team",
  teamType: "Orchestration",
  members: [{ agentId: "lead-agent", role: "lead" }]
})\`

### Create a Negotiation Team
\`manage_factory("teams", "upsert", "debate-team", {
  name: "Architecture Review",
  teamType: "Negotiation",
  mode: "debate",
  maxRounds: 5,
  members: [
    { agentId: "architect-a", role: "lead" },
    { agentId: "architect-b", role: "member" },
    { agentId: "arbiter-agent", role: "member" }
  ],
  negotiationProtocol: {
    arbiterAgentId: "arbiter-agent",
    mode: "debate",
    quorumThreshold: 0.67
  }
})\`

### Send a message to any team
\`manage_factory("teams", "send", "team-id", { message: "Start the review" })\`

### Add/update a member
\`manage_factory("teams", "member", "team-id", { agentId: "new-agent", role: "member" })\`

### Delete a team
\`manage_factory("teams", "delete", "team-id")\`
`,
  },
  "factory-self-improvement": {
    name: "factory-self-improvement",
    description:
      "Run a structured self-evaluation suite that exercises each factory capability with real prompts, then analyzes results to produce an actionable improvement report.",
    content: `---
name: factory-self-improvement
description: Run a structured self-evaluation suite that exercises each factory capability with real prompts, then analyzes results to produce an actionable improvement report.
---

# Spaces Self-Improvement Protocol

This skill runs a structured evaluation of the Global Spaces Director's capabilities. It targets specific factory entities and tools to run test prompts, collects results, and produces an actionable improvement report.

### Step 0: User Consultation (MANDATORY FIRST STEP)
Before executing any exercises, you MUST ask the user which capability or area they would like to evaluate and improve (e.g., environment/providers, project management/delegation, subagent spawning, agents, teams, custom skills, or session introspection), or if they prefer to run the full diagnostic suite.
Only proceed to execute the corresponding exercise(s) after receiving the user's choice.

---

## Phase 1 — Execution Suite

Execute the chosen exercise(s) below. After each one, record: what happened, whether it succeeded, and any friction or unexpected behavior you encountered.

---

### Exercise 1 — Environment Introspection (env)

**Prompt to execute:**
> "List all configured environment variables and summarize how many are set. Do not reveal values."

**Expected outcome:** A call to \`manage_factory(entity: "env", action: "get")\` returns a list. The agent summarizes the count and key names without exposing secrets.

**What to check:** Did the agent use \`manage_factory\` correctly? Did it avoid running bash commands or exposing any values accidentally? Was the output clear and concise?

---

### Exercise 2 — Provider Status Check (providers)

**Prompt to execute:**
> "List all configured LLM providers and tell me which ones are authenticated (have an API key set)."

**Expected outcome:** A call to \`manage_factory(entity: "providers", action: "get")\` returns a list with configured flags. The agent summarizes which providers are ready.

**What to check:** Did the agent distinguish between configured and unconfigured providers? Did it avoid setting or modifying any keys without being asked?

---

### Exercise 3 — Project Creation (projects)

**Prompt to execute:**
> "Create an empty project named 'self-eval-test' in my workspace."

**Expected outcome:** The agent calls \`manage_factory(entity: "projects", action: "upsert", id: "self-eval-test", params: { name: "self-eval-test" })\`. Returns the new project's ID.

**What to check:** Did the agent use the tool correctly instead of running \`mkdir\` or \`git init\` in bash? Did it confirm the project was created and provide the ID?

---

### Exercise 4 — Project Delegation (projects + delegate_task)

**Prompt to execute:**
> "Delegate this task to the project 'self-eval-test': Write a file called README.md with a single line: 'Self-evaluation test project'."

**Expected outcome:** The agent uses \`delegate_task(targetType: "project", targetId: "self-eval-test", task: "...")\`. The subagent executes and the file is created.

**What to check:** Did the agent use \`delegate_task\` instead of running bash commands itself? Did it verify the outcome by reading the file afterward?

---

### Exercise 5 — Spawn Subagent (spawn_subagent)

**Prompt to execute:**
> "Spawn a subagent with the role of 'TypeScript code verifier'. Give it this task: list all .ts files under apps/server/src/core/ and count them. Return the count."

**Expected outcome:** The agent calls \`spawn_subagent\` with an appropriate system prompt and task. The subagent returns a result. The parent agent extracts the count from the envelope response (\`status\`, \`executive_summary\`, \`artifacts\`).

**What to check:** Did the parent parse the subagent's response correctly? Was the envelope properly structured? Did the parent report the result to the user without re-running the task?

---

### Exercise 6 — Programmatic Agent Registration (agents)

**Prompt to execute:**
> "Register a new temporary programmatic agent with id 'eval-worker', name 'Eval Worker', role 'evaluator', and use the default configured model. Give it this system prompt: 'You are a code evaluation assistant. Reply concisely in English.'"

**Expected outcome:** The agent calls \`manage_factory(entity: "agents", action: "upsert", id: "eval-worker", params: { name: "Eval Worker", role: "evaluator", systemPrompt: "...", model: "..." })\` with the correct body. Returns the agent entry.

**What to check:** Did the agent construct the params correctly? Did it identify the default model or provider config?

---

### Exercise 7 — Agent Delegation (agents + delegate_task)

**Prompt to execute:**
> "Delegate this task to the agent 'eval-worker': Summarize what the file apps/server/src/core/agent-utils.ts does in 2 sentences."

**Expected outcome:** The agent calls \`delegate_task(targetType: "agent", targetId: "eval-worker", task: "...")\`. The eval-worker responds with a 2-sentence summary.

**What to check:** Did the agent use \`delegate_task\` correctly? Did it return the delegated agent's response clearly to the user?

---

### Exercise 8 — Team Creation (teams)

**Prompt to execute:**
> "Create an Orchestration team with ID 'eval-team', name 'Evaluation Team', and set the lead agent member to 'eval-worker'."

**Expected outcome:** The agent calls \`manage_factory(entity: "teams", action: "upsert", id: "eval-team", params: { name: "Evaluation Team", teamType: "Orchestration", members: [{ agentId: "eval-worker", role: "lead" }] })\`. Returns the team details.

**What to check:** Did the agent create the team via the tool? Did it confirm the team details to the user?

---

### Exercise 9 — Skill Creation (skills)

**Prompt to execute:**
> "Create a new skill called 'hello-world-skill'. The skill description should be 'A minimal test skill.' The SKILL.md content should just say: '# Hello World. This skill does nothing. It is a test.'"

**Expected outcome:** The agent calls \`manage_factory(entity: "skills", action: "upsert", id: "hello-world-skill", params: { name: "hello-world-skill", description: "A minimal test skill.", content: "# Hello World. This skill does nothing. It is a test." })\` to save the skill.

**What to check:** Did the agent use \`manage_factory\` with \`entity: "skills"\` instead of writing files directly?

---

### Exercise 10 — Session Introspection (sessions)

**Prompt to execute:**
> "List the 5 most recently updated sessions and summarize their names, statuses, and whether they belong to a project or agent."

**Expected outcome:** The agent calls \`manage_factory(entity: "sessions", action: "get")\` and parses the response, producing a readable summary table or list.

**What to check:** Did the agent use the native sessions entity instead of HTTP calls? Did it handle results gracefully?

---

## Phase 2 — Analysis

After completing all exercises, reflect on the entire execution trace:

1. **Failures:** Which exercises failed entirely or produced incorrect output? What was the root cause?
2. **Friction Points:** Where did you hesitate, make an extra API or tool call to verify something, or correct a mistake mid-execution?
3. **Skill Gaps:** For each exercise, are the instructions clear enough? What information was missing or ambiguous?
4. **Prompt Clarity:** Were the exercise prompts unambiguous? Which prompts could be reworded to produce better first-attempt results?
5. **Tool Misuse Patterns:** Did you default to bash/wget/curl when a native tool (\`manage_factory\`, \`delegate_task\`, \`spawn_subagent\`) should have been used instead?

---

## Phase 3 — Improvement Report

Produce a structured report in this exact format:

\`\`\`
# Self-Improvement Report — [Date]

## Summary
[1-2 sentence overview of the evaluation run]

## Exercise Results
| Exercise | Status | Notes |
|----------|--------|-------|
| 1. ENV Introspection | Pass / Partial / Fail | [brief note] |
| 2. Providers Status | ... | ... |
...

## Critical Issues
[Numbered list of things that broke or produced wrong output]

## Areas of Improvement
[Numbered list of skill content gaps, ambiguous instructions, or missing examples]

## Recommended Skill/Tool Updates
For each item that needs updating:
- **Entity/Skill:** env / providers / projects / etc.
- **Gap:** [What was missing or unclear]
- **Suggestion:** [Specific suggestion or example to add]

## Recommended Prompt Updates
[Specific rewordings for exercises that produced poor first-attempt results]
\`\`\`

---

## Delegation Mode (Optional)

If you want to offload the execution to a subagent and only handle the analysis yourself:

1. Spawn a subagent with role "Spaces Capabilities Evaluator".
2. Give it this exact task: "Execute all 10 exercises in the factory-self-improvement skill. For each exercise, record: what you did, whether it succeeded, and any issues encountered. Return a structured log with one entry per exercise."
3. Wait for the subagent to return its result envelope.
4. Use the subagent's log as input to Phase 2 (Analysis) and Phase 3 (Report).
`,
  },
};
