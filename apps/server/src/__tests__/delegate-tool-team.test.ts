// SPDX-License-Identifier: MIT
import { beforeAll, describe, expect, test } from "bun:test";
import { AgentRegistry } from "../agents";
import { createManageDelegationsTool } from "../core/tools/manage-delegations-tool";

const agentRegistry = new AgentRegistry();

describe("delegate_task Tool Team Integration Tests", () => {
  const username = "test_team_delegator";
  const parentSessionId = "team_owner_session";
  const specialistId = "specialist-agent";
  const unauthorizedId = "unauthorized-agent";
  const teamWorkspace = "/tmp/team-shared-workspace";

  beforeAll(() => {
    // Override agentRegistry.get to mock specialist and unauthorized agents
    agentRegistry.get = (id: string, user?: string) => {
      if (id === specialistId) {
        return {
          username,
          status: "idle",
          server: {
            definition: { id: specialistId, name: "Specialist" },
            session: {
              id: `del_specialist`,
              cwd: teamWorkspace,
              setModel: async () => {},
              prompt: async () => {},
              messages: [
                {
                  role: "assistant",
                  content: [
                    {
                      type: "text",
                      text: "---\nstatus: success\nexecutive_summary: Done\nartifacts: none\nrisks: None\n---",
                    },
                  ],
                },
              ],
              subscribe: () => () => {},
            },
          },
        } as any;
      }
      if (id === unauthorizedId) {
        return {
          username,
          status: "idle",
          server: {
            definition: { id: unauthorizedId, name: "Unauthorized" },
          },
        } as any;
      }
      return undefined;
    };
  });

  test("Should allow delegation to permitted agent and pass inherited workspace", async () => {
    let passedOverrides: any = null;

    const sm: any = {
      getOrCreateSession: async (
        user: string,
        sId: string,
        projectName?: string,
        agentId?: string,
        overrides?: any,
      ) => {
        passedOverrides = overrides;
        return {
          id: sId,
          messages: [
            {
              role: "assistant",
              content: [
                {
                  type: "text",
                  text: "---\nstatus: success\nexecutive_summary: Done\nartifacts: none\nrisks: None\n---",
                },
              ],
            },
          ],
          setModel: async () => {},
          prompt: async () => {},
          abort: async () => {},
          subscribe: () => () => {},
        };
      },
      getSession: (user: string, sId: string) => {
        if (sId === parentSessionId) {
          return {
            id: parentSessionId,
            isStreaming: false,
            addDelegationResult: () => {},
            continue: async () => {},
          };
        }
        return null;
      },
    };

    const tool = createManageDelegationsTool({
      workspaceDir: "/tmp/dummy",
      username,
      parentSessionId,
      modelRegistry: {} as any,
      authStorage: {} as any,
      resourceLoader: {} as any,
      inheritedWorkspaceDir: teamWorkspace,
      permittedAgentIds: new Set([specialistId]),
      sessionManager: sm,
    });

    const result = await tool.execute("call_1", {
      action: "delegate",
      targetType: "agent",
      targetId: specialistId,
      task: "Analyze tests",
    });

    expect(result.details.status).toBe("delegated");
    expect(passedOverrides).toBeDefined();
    expect(passedOverrides.workspaceDir).toBe(teamWorkspace);
  });

  test("Should reject delegation to agent not in permittedAgentIds list", async () => {
    const tool = createManageDelegationsTool({
      workspaceDir: "/tmp/dummy",
      username,
      parentSessionId,
      modelRegistry: {} as any,
      authStorage: {} as any,
      resourceLoader: {} as any,
      inheritedWorkspaceDir: teamWorkspace,
      permittedAgentIds: new Set([specialistId]),
    });

    expect(
      tool.execute("call_2", {
        action: "delegate",
        targetType: "agent",
        targetId: unauthorizedId,
        task: "Analyze logs",
      }),
    ).rejects.toThrow(`Agent "${unauthorizedId}" is not a permitted delegate in this Team context`);
  });

  test("Should inherit parent model if parentModel option is provided", async () => {
    let setModelCalledWith: any = null;
    const mockModel = { id: "parent-custom-model", provider: "openai" };

    const sm: any = {
      getOrCreateSession: async () => ({
        id: "del_specialist",
        messages: [
          {
            role: "assistant",
            content: [
              {
                type: "text",
                text: "---\nstatus: success\nexecutive_summary: Done\nartifacts: none\nrisks: None\n---",
              },
            ],
          },
        ],
        setModel: async (m: any) => {
          setModelCalledWith = m;
        },
        prompt: async () => {},
        abort: async () => {},
        subscribe: () => () => {},
      }),
      getSession: (user: string, sId: string) => {
        if (sId === parentSessionId) {
          return {
            id: parentSessionId,
            isStreaming: false,
            addDelegationResult: () => {},
            continue: async () => {},
          };
        }
        return null;
      },
    };

    const tool = createManageDelegationsTool({
      workspaceDir: "/tmp/dummy",
      username,
      parentSessionId,
      modelRegistry: {} as any,
      authStorage: {} as any,
      resourceLoader: {} as any,
      inheritedWorkspaceDir: teamWorkspace,
      permittedAgentIds: new Set([specialistId]),
      parentModel: mockModel,
      sessionManager: sm,
    });

    await tool.execute("call_3", {
      action: "delegate",
      targetType: "agent",
      targetId: specialistId,
      task: "Analyze tests",
    });

    expect(setModelCalledWith).toBe(mockModel);
  });

  test("Should inherit model from parent session retrieved via SessionManager if parentModel option is not provided", async () => {
    let setModelCalledWith: any = null;
    const mockModel = { id: "parent-session-model", provider: "openai" };

    const sm: any = {
      getOrCreateSession: async () => ({
        id: "del_specialist",
        messages: [
          {
            role: "assistant",
            content: [
              {
                type: "text",
                text: "---\nstatus: success\nexecutive_summary: Done\nartifacts: none\nrisks: None\n---",
              },
            ],
          },
        ],
        setModel: async (m: any) => {
          setModelCalledWith = m;
        },
        prompt: async () => {},
        abort: async () => {},
        subscribe: () => () => {},
      }),
      getSession: (user: string, sId: string) => {
        if (sId === parentSessionId) {
          return {
            id: parentSessionId,
            model: mockModel,
            isStreaming: false,
            addDelegationResult: () => {},
            continue: async () => {},
          };
        }
        return null;
      },
    };

    const tool = createManageDelegationsTool({
      workspaceDir: "/tmp/dummy",
      username,
      parentSessionId,
      modelRegistry: {} as any,
      authStorage: {} as any,
      resourceLoader: {} as any,
      inheritedWorkspaceDir: teamWorkspace,
      permittedAgentIds: new Set([specialistId]),
      sessionManager: sm,
    });

    await tool.execute("call_4", {
      action: "delegate",
      targetType: "agent",
      targetId: specialistId,
      task: "Analyze tests under parent session",
    });

    expect(setModelCalledWith).toBe(mockModel);
  });
});
