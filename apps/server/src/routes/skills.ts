// SPDX-License-Identifier: MIT
import { Hono } from "hono";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  getAgentWorkspaceDir,
  getProjectWorkspaceDir,
  getTeamWorkspaceDir,
  getUserDir,
  getWorkspaceDir,
  getWorkspaceSkillsDir,
} from "shared";
import { loadSkills } from "../ai/load-skills";
import { getResolvedSkillPaths } from "../core/session-manager";
import { authMiddleware, getAuthPayload } from "../middleware/auth";

export const skillsRouter = new Hono();

skillsRouter.use("/*", authMiddleware);

skillsRouter.get("/", async (c) => {
  const { username } = getAuthPayload(c);
  const entityType = c.req.query("entityType");
  const entityId = c.req.query("entityId");

  try {
    let workspaceDir = getWorkspaceDir(username);
    if (entityType && entityId) {
      if (entityType === "agent") workspaceDir = getAgentWorkspaceDir(username, entityId);
      else if (entityType === "project") workspaceDir = getProjectWorkspaceDir(username, entityId);
      else if (entityType === "team") workspaceDir = getTeamWorkspaceDir(username, entityId);
    }

    const skillPaths = getResolvedSkillPaths(workspaceDir, username);

    const result = loadSkills({
      cwd: workspaceDir,
      agentDir: getUserDir(username),
      skillPaths,
      includeDefaults: true,
    });

    const userGlobalWorkspaceDir = getWorkspaceDir(username);

    const skillsWithContent = result.skills.map((skill) => {
      const isEntityLocal =
        entityType && entityType !== "global" && entityId && skill.filePath
          ? skill.filePath.startsWith(workspaceDir) && !skill.filePath.startsWith(userGlobalWorkspaceDir)
          : false;

      return {
        name: skill.name,
        description: skill.description,
        filePath: skill.filePath,
        disableModelInvocation: skill.disableModelInvocation,
        scope: isEntityLocal ? entityType! : "global",
        content: skill.content,
      };
    });

    return c.json({ skills: skillsWithContent, diagnostics: result.diagnostics });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

skillsRouter.post("/reset", async (c) => {
  const { username } = getAuthPayload(c);
  try {
    const { DEFAULT_FACTORY_SKILLS } = await import("../core/default-factory-skills");
    const skillsBaseDir = getWorkspaceSkillsDir(username);

    const OBSOLETE_SKILLS = [
      "factory-skills",
      "factory-providers",
      "factory-env",
      "factory-integrations",
      "factory-projects",
      "factory-agents",
      "factory-channels",
      "factory-observe",
      "factory-quick-actions",
      "factory-sessions",
    ];

    for (const obsolete of OBSOLETE_SKILLS) {
      const obsoleteDir = join(skillsBaseDir, obsolete);
      if (existsSync(obsoleteDir)) {
        rmSync(obsoleteDir, { recursive: true, force: true });
      }
    }

    for (const [skillKey, skillDef] of Object.entries(DEFAULT_FACTORY_SKILLS)) {
      const skillDir = join(skillsBaseDir, skillKey);
      if (!existsSync(skillDir)) {
        mkdirSync(skillDir, { recursive: true });
      }
      const skillFilePath = join(skillDir, "SKILL.md");
      writeFileSync(skillFilePath, skillDef.content, "utf-8");
    }

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});
