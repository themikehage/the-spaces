// SPDX-License-Identifier: MIT
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export interface Skill {
  name: string;
  description: string;
  content: string;
  filePath: string;
  baseDir: string;
  sourceInfo: {
    path: string;
    scope?: string;
  };
  disableModelInvocation: boolean;
}

export interface LoadSkillsOptions {
  cwd: string;
  agentDir: string;
  skillPaths: string[];
  includeDefaults?: boolean;
}

function parseSimpleFrontmatter(content: string): {
  name?: string;
  description?: string;
  disableModelInvocation?: boolean;
} {
  const result: { name?: string; description?: string; disableModelInvocation?: boolean } = {};

  if (!content.startsWith("---")) return result;

  const endIdx = content.indexOf("---", 3);
  if (endIdx === -1) return result;

  const yamlContent = content.slice(3, endIdx);
  const lines = yamlContent.split("\n");

  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();

    // Quitar comillas si tiene
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key === "name") {
      result.name = value;
    } else if (key === "description") {
      result.description = value;
    } else if (key === "disable-model-invocation") {
      result.disableModelInvocation = value === "true";
    }
  }

  return result;
}

export function loadSkills(options: LoadSkillsOptions): { skills: Skill[]; diagnostics: any[] } {
  const skills: Skill[] = [];
  const diagnostics: any[] = [];
  const seenNames = new Set<string>();
  const seenFilePaths = new Set<string>();

  for (const skillDir of options.skillPaths) {
    const resolvedSkillDir = resolve(skillDir);
    if (!existsSync(resolvedSkillDir)) continue;

    try {
      const entries = readdirSync(resolvedSkillDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const subDir = resolve(join(resolvedSkillDir, entry.name));
        const skillFilePath = resolve(join(subDir, "SKILL.md"));

        if (existsSync(skillFilePath)) {
          try {
            const rawContent = readFileSync(skillFilePath, "utf-8");
            const frontmatter = parseSimpleFrontmatter(rawContent);

            const name = frontmatter.name || entry.name;
            const description = frontmatter.description || "";

            if (!description) {
              diagnostics.push({
                severity: "warning",
                message: `Missing description for skill in ${skillFilePath}`,
                filePath: skillFilePath,
              });
              continue;
            }

            const nameKey = name.toLowerCase();
            const filePathKey = skillFilePath.toLowerCase();
            if (seenNames.has(nameKey) || seenFilePaths.has(filePathKey)) {
              continue;
            }
            seenNames.add(nameKey);
            seenFilePaths.add(filePathKey);

            skills.push({
              name,
              description,
              content: rawContent,
              filePath: skillFilePath,
              baseDir: subDir,
              sourceInfo: {
                path: skillFilePath,
                scope: "global",
              },
              disableModelInvocation: frontmatter.disableModelInvocation === true,
            });
          } catch (e: any) {
            diagnostics.push({
              severity: "warning",
              message: `Failed to read skill ${entry.name}: ${e.message}`,
              filePath: skillFilePath,
            });
          }
        }
      }
    } catch (e: any) {
      diagnostics.push({
        severity: "warning",
        message: `Failed to read skills directory ${skillDir}: ${e.message}`,
      });
    }
  }

  return { skills, diagnostics };
}
