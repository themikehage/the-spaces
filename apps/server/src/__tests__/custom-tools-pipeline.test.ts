import { describe, expect, it } from "bun:test";
import { createManageCustomToolsTool } from "../core/custom-tools/manage-custom-tools-tool";
import { CustomToolDefinitionSchema } from "../core/custom-tools/schemas";

describe("Custom Tools Validation", () => {
  describe("CustomToolDefinitionSchema", () => {
    it("should validate script tool definition with dependencies array", () => {
      const validTool = {
        name: "excel_extract",
        description: "Extract content from excel file with openpyxl",
        dependencies: ["openpyxl"],
        parameters: {
          type: "object",
          properties: {
            path: { type: "string" },
          },
        },
        execute: {
          type: "script",
          file: "scripts/execute.js",
        },
      };

      const parsed = CustomToolDefinitionSchema.parse(validTool);
      expect(parsed.dependencies).toEqual(["openpyxl"]);
      expect(parsed.execute.type).toBe("script");
    });

    it("should allow UI-only tools without explicit execute field", () => {
      const uiOnlyTool = {
        name: "ui_status_dashboard",
        description: "Renders visual dashboard component for system status",
        parameters: { type: "object", properties: {} },
        ui: {
          type: "card",
          title: "System Status",
          status: "success",
        },
      };

      const parsed = CustomToolDefinitionSchema.parse(uiOnlyTool);
      expect(parsed.execute).toEqual({ type: "ui" });
    });

    it("should allow root level card-list and steps UI components", () => {
      const cardListTool = {
        name: "card_list_dashboard",
        description: "Renders card list as root element in UI",
        parameters: { type: "object", properties: {} },
        ui: {
          type: "card-list",
          title: "Projects",
          cards: [{ type: "card", title: "Project A" }],
        },
      };

      const stepsTool = {
        name: "steps_dashboard",
        description: "Renders steps component as root element in UI",
        parameters: { type: "object", properties: {} },
        ui: {
          type: "steps",
          steps: [{ label: "Step 1", status: "done" }],
        },
      };

      expect(() => CustomToolDefinitionSchema.parse(cardListTool)).not.toThrow();
      expect(() => CustomToolDefinitionSchema.parse(stepsTool)).not.toThrow();
    });

    it("should accept card-list cards without explicit type: card and steps with status: in_progress", () => {
      const cardListFlexible = {
        name: "retest_card_list",
        description: "Testing card list with implicit card item types",
        parameters: { type: "object", properties: {} },
        ui: {
          type: "card-list",
          title: "Card List Root Test",
          columns: 2,
          cards: [
            { title: "OK", description: "Card 1", status: "success" },
            { title: "Warn", description: "Card 2", status: "warning" },
          ],
        },
      };

      const stepsFlexible = {
        name: "retest_steps_root",
        description: "Testing steps root with in_progress status",
        parameters: { type: "object", properties: {} },
        ui: {
          type: "steps",
          steps: [
            { label: "Build", status: "done" },
            { label: "Test", status: "done" },
            { label: "Deploy", status: "in_progress" },
          ],
        },
      };

      expect(() => CustomToolDefinitionSchema.parse(cardListFlexible)).not.toThrow();
      expect(() => CustomToolDefinitionSchema.parse(stepsFlexible)).not.toThrow();
    });
  });

  describe("manage_custom_tools error formatting", () => {
    it("should return detailed Zod issue messages on invalid upsert", async () => {
      const tool = createManageCustomToolsTool({ username: "test", sessionId: "sess_1" });
      const res = await tool.execute("call_1", {
        action: "upsert",
        tool: {
          name: "invalid_tool",
          description: "Too short", // < 10 chars
          parameters: { type: "object", properties: {} },
          execute: { type: "invalid_type" },
        },
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain("Schema validation failed");
      expect(res.content[0].text).toContain("Path [description]");
    });
  });
});
