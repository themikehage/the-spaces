// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadSkills } from "../ai/load-skills";
import { getResolvedSkillPaths } from "../core/session/workspace-resolver";

describe("Skills Deduplication & Path Resolution", () => {
  it("should normalize skill paths in getResolvedSkillPaths", () => {
    const cwd = process.cwd();
    const paths = getResolvedSkillPaths(cwd);
    for (const p of paths) {
      expect(p).toEqual(resolve(p));
    }
  });

  it("should deduplicate skills with same name or resolved filePath in loadSkills", () => {
    const testDir = join(tmpdir(), `spaces-skill-test-${Date.now()}`);
    const skillDir1 = join(testDir, "path1", "my-skill");
    const skillDir2 = join(testDir, "path2", "my-skill");

    mkdirSync(skillDir1, { recursive: true });
    mkdirSync(skillDir2, { recursive: true });

    const content = `---\nname: factory-pipelines\ndescription: Test skill\n---\n# Content`;
    writeFileSync(join(skillDir1, "SKILL.md"), content, "utf-8");
    writeFileSync(join(skillDir2, "SKILL.md"), content, "utf-8");

    try {
      const result = loadSkills({
        cwd: testDir,
        agentDir: testDir,
        skillPaths: [
          join(testDir, "path1"),
          join(testDir, "path2"),
          resolve(join(testDir, "path1")),
        ],
      });

      expect(result.skills.length).toBe(1);
      expect(result.skills[0].name).toBe("factory-pipelines");
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });
});
