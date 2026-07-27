import { describe, expect, it } from "bun:test";
import { createUiTools } from "../core/tools/ui-tools";
import { uiApprovalRegistry } from "../core/ui-approval-registry";

describe("UI Tools Integration Tests", () => {
  const username = "test_user_ui_tools";
  const workspaceDir = "/tmp/dummy";

  it("should register ask_question with user context and resolve on submit via uiApprovalRegistry", async () => {
    const uiTools = createUiTools(workspaceDir, username, false, { sessionId: "session_1" });
    const askTool = uiTools.find((t) => t.name === "ask_question");
    expect(askTool).toBeDefined();

    const toolCallId = "call_ask_123";
    const questionPromise = askTool!.execute(toolCallId, {
      question: "Which framework do you prefer?",
      options: ["React", "Vue", "Svelte"],
      isMultiSelect: false,
    });

    const pending = uiApprovalRegistry.getAll(username);
    expect(pending.length).toBe(1);
    expect(pending[0].approvalId).toBe(toolCallId);
    expect(pending[0].type).toBe("question");

    // Simulate UI action submission
    setTimeout(() => {
      uiApprovalRegistry.resolve(toolCallId, {
        action: "submit",
        payload: { selectedOptions: ["React"] },
      });
    }, 10);

    const result = await questionPromise;
    expect(result.content[0].text).toContain("Selected: React");
    expect(result.details?.status).toBe("submitted");
  });

  it("should register request_approval with user context and resolve on confirm", async () => {
    const uiTools = createUiTools(workspaceDir, username, false, { sessionId: "session_2" });
    const approvalTool = uiTools.find((t) => t.name === "request_approval");
    expect(approvalTool).toBeDefined();

    const toolCallId = "call_appr_456";
    const approvalPromise = approvalTool!.execute(toolCallId, {
      title: "Deploy to production",
      description: "Approve deployment of version 1.0.0",
    });

    setTimeout(() => {
      uiApprovalRegistry.resolve(toolCallId, { action: "confirm" });
    }, 10);

    const result = await approvalPromise;
    expect(result.content[0].text).toBe("confirmed");
    expect(result.details?.status).toBe("confirmed");
  });
});
