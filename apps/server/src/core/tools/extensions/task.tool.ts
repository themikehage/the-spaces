// SPDX-License-Identifier: MIT
import { join } from "node:path";
import { broadcastToSession } from "../../../ws/handler";
import { sessionManager } from "../../session/session-manager";
import { TaskStateManager } from "./task-state-manager";

export interface TaskToolOptions {
  username: string;
  parentSessionId: string;
}

export function createTaskTool(opts: TaskToolOptions) {
  const { username, parentSessionId } = opts;

  return {
    name: "task",
    description: `Manage and execute structured task plans with dependency tracking.
Use action:
- "start": Register a new structured task plan for an objective.
- "update": Update status of a task ("done" or "failed").
- "end": Finalize and complete the task plan.
- "status": Query the current task plan status without modifying state.`,
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["start", "update", "end", "status"],
          description: "Action to perform on the task plan.",
        },
        objective: {
          type: "string",
          description: "High-level goal (required for action 'start').",
        },
        tasks: {
          type: "array",
          description: "Structured task list (required for action 'start').",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "Unique task ID (e.g. 't1', 't2')." },
              title: { type: "string", description: "Short descriptive title." },
              prompt: {
                type: "string",
                description: "Complete, self-contained instructions for this task.",
              },
              depends_on: {
                type: "array",
                items: { type: "string" },
                description: "IDs of tasks that must complete before this one starts.",
              },
              estimated_steps: {
                type: "number",
                description: "Estimated number of steps to complete.",
              },
            },
            required: ["id", "title", "prompt"],
          },
        },
        taskId: {
          type: "string",
          description: "Task ID to update (required for action 'update').",
        },
        status: {
          type: "string",
          enum: ["done", "failed"],
          description: "New status for the task (required for action 'update').",
        },
        log: {
          type: "string",
          description: "Log or summary of execution (optional for action 'update').",
        },
        summary: {
          type: "string",
          description: "Final completion summary (optional for action 'end').",
        },
      },
      required: ["action"],
    },
    execute: async (_toolCallId: string, args: any, _parentSignal?: AbortSignal) => {
      const action = args.action;
      const userDir = sessionManager.userConfig.ensureUserDir(username);
      const sessionDir = join(userDir, "sessions", parentSessionId);

      // --- Action: start ---
      if (action === "start") {
        const objective: string = args.objective || "";
        const rawTasks = args.tasks;

        if (!objective.trim()) {
          return {
            content: [{ type: "text", text: "Error: objective is required for action 'start'." }],
            isError: true,
          };
        }

        if (!Array.isArray(rawTasks) || rawTasks.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "Error: tasks array is required and must not be empty for action 'start'.",
              },
            ],
            isError: true,
          };
        }

        const oldState = TaskStateManager.getTaskState(sessionDir);
        if (oldState && oldState.status === "running") {
          return {
            content: [
              {
                type: "text",
                text: "Error: There is already an active task plan in progress. Please complete or end the current task list before starting a new one.",
              },
            ],
            isError: true,
          };
        }

        const tasks = TaskStateManager.validateAndParseTasks(rawTasks);
        if (!tasks || tasks.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "Could not parse or validate the task list. Ensure there are no circular dependencies and all required fields are present.",
              },
            ],
            isError: true,
          };
        }

        const finalState = {
          objective,
          tasks,
          currentTaskId: tasks[0]?.id || null,
          status: "running" as const,
        };

        TaskStateManager.saveTaskState(sessionDir, finalState);

        try {
          broadcastToSession(parentSessionId, {
            type: "tasks_update",
            state: finalState,
          });
        } catch (e) {
          console.error("Failed to broadcast tasks_update:", e);
        }

        const summaryText = tasks
          .map((t, i) => {
            const deps = t.depends_on.length > 0 ? ` (after: ${t.depends_on.join(", ")})` : "";
            const steps = t.estimated_steps ? ` ~${t.estimated_steps} steps` : "";
            return `${i + 1}. [${t.id}] ${t.title}${deps}${steps}`;
          })
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: `Registered task plan with ${tasks.length} tasks for objective: "${objective.slice(0, 80)}${objective.length > 80 ? "..." : ""}"\n\n${summaryText}\n\nBeginning execution now — working through each task in order.`,
            },
          ],
          details: { objective, tasks, totalTasks: tasks.length },
        };
      }

      // --- Action: update ---
      if (action === "update") {
        const taskId = args.taskId;
        const status = args.status;
        const log = args.log || "";

        if (!taskId || (status !== "done" && status !== "failed")) {
          return {
            content: [
              {
                type: "text",
                text: "Error: taskId and valid status ('done' | 'failed') are required for action 'update'.",
              },
            ],
            isError: true,
          };
        }

        const state = TaskStateManager.getTaskState(sessionDir);
        if (!state) {
          return {
            content: [{ type: "text", text: "Error: No active task plan found for this session." }],
            isError: true,
          };
        }

        const task = state.tasks.find((t) => t.id === taskId);
        if (!task) {
          return {
            content: [{ type: "text", text: `Error: Task with ID '${taskId}' not found.` }],
            isError: true,
          };
        }

        task.status = status;
        task.log = log;

        if (status === "failed") {
          state.status = "failed";
          state.error = `Task ${taskId} failed: ${log}`;
        } else {
          // Find next pending task whose dependencies are all done
          const doneIds = new Set(state.tasks.filter((t) => t.status === "done").map((t) => t.id));
          const nextTask = state.tasks.find(
            (t) => t.status === "pending" && t.depends_on.every((dep) => doneIds.has(dep)),
          );

          if (nextTask) {
            state.currentTaskId = nextTask.id;
          } else {
            const anyPending = state.tasks.some(
              (t) => t.status === "pending" || t.status === "running",
            );
            if (!anyPending) {
              state.status = "completed";
              state.currentTaskId = null;
            }
          }
        }

        TaskStateManager.saveTaskState(sessionDir, state);

        try {
          broadcastToSession(parentSessionId, {
            type: "tasks_update",
            state,
          });
        } catch (e) {
          console.error("Failed to broadcast tasks_update:", e);
        }

        return {
          content: [
            {
              type: "text",
              text: `Task '${taskId}' updated to status '${status}'.${state.currentTaskId ? ` Active task is now '${state.currentTaskId}'.` : state.status === "completed" ? " All tasks completed!" : ""}`,
            },
          ],
          details: {
            taskId,
            status,
            currentTaskId: state.currentTaskId,
            stateStatus: state.status,
          },
        };
      }

      // --- Action: end ---
      if (action === "end") {
        const summary = args.summary || "Task list completed.";
        const state = TaskStateManager.getTaskState(sessionDir);

        if (!state) {
          return {
            content: [{ type: "text", text: "Error: No active task plan found to end." }],
            isError: true,
          };
        }

        state.status = "completed";
        state.currentTaskId = null;

        TaskStateManager.saveTaskState(sessionDir, state);

        try {
          broadcastToSession(parentSessionId, {
            type: "tasks_update",
            state,
          });
        } catch (e) {
          console.error("Failed to broadcast tasks_update:", e);
        }

        return {
          content: [{ type: "text", text: `Task plan ended. Summary: ${summary}` }],
          details: { status: "completed", summary },
        };
      }

      // --- Action: status ---
      if (action === "status") {
        const state = TaskStateManager.getTaskState(sessionDir);
        if (!state) {
          return {
            content: [{ type: "text", text: "No active task plan found." }],
            details: { hasState: false },
          };
        }
        return {
          content: [
            {
              type: "text",
              text: `Active task plan for objective: "${state.objective}". Status: ${state.status}. Active Task: ${state.currentTaskId || "none"}.`,
            },
          ],
          details: { hasState: true, state },
        };
      }

      return {
        content: [{ type: "text", text: `Unknown action: '${action}'` }],
        isError: true,
      };
    },
  };
}
