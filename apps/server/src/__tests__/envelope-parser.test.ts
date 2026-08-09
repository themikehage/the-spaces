import { describe, expect, it } from "bun:test";
import { parseEnvelope } from "../core/session/agent-utils";

describe("parseEnvelope", () => {
  it("parses valid JSON inside markdown fenced blocks", () => {
    const text = `
Here is my final status:

\`\`\`json
{
  "status": "success",
  "executive_summary": "Task completed successfully.",
  "artifacts": "file.ts",
  "risks": "None",
  "outputs": { "result": 42 }
}
\`\`\`
`;
    const res = parseEnvelope(text);
    expect(res.status).toBe("success");
    expect(res.executive_summary).toBe("Task completed successfully.");
    expect(res.artifacts).toBe("file.ts");
    expect(res.outputs).toEqual({ result: 42 });
  });

  it("parses raw JSON object embedded in text", () => {
    const text = `Result: {"status": "partial", "executive_summary": "Half done", "artifacts": "none"}`;
    const res = parseEnvelope(text);
    expect(res.status).toBe("partial");
    expect(res.executive_summary).toBe("Half done");
  });

  it("handles nested code blocks without misidentifying envelope JSON", () => {
    const text = `
I created a file with this content:
\`\`\`typescript
function test() {
  return { a: 1, b: 2 };
}
\`\`\`

\`\`\`json
{
  "status": "success",
  "executive_summary": "Created function test",
  "outputs": { "created": true }
}
\`\`\`
`;
    const res = parseEnvelope(text);
    expect(res.status).toBe("success");
    expect(res.executive_summary).toBe("Created function test");
    expect(res.outputs).toEqual({ created: true });
  });

  it("falls back gracefully when text contains line-based format", () => {
    const text = `
status: success
executive_summary: All clear
artifacts: build/out.js
risks: Minimal
`;
    const res = parseEnvelope(text);
    expect(res.status).toBe("success");
    expect(res.executive_summary).toBe("All clear");
    expect(res.artifacts).toBe("build/out.js");
  });

  it("falls back to plain text summary if no JSON or key-values exist", () => {
    const text = "Finished processing everything without structured envelope.";
    const res = parseEnvelope(text);
    expect(res.status).toBe("success");
    expect(res.executive_summary).toBe(text);
  });
});
