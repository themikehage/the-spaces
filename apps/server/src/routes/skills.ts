import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  getUserDir,
  getWorkspaceDir,
  getWorkspaceSkillsDir,
  type AgentType,
} from "shared";
import { z } from "zod";
import { agentTypeRegistry } from "../core/entities/agent-type-registry";
import { InternalError } from "../core/infra/errors";
import { loadSkills } from "../core/session/load-skills";
import { getResolvedSkillPaths } from "../core/session/workspace-resolver";
import { authMiddleware, getAuthPayload } from "../middleware/auth";

const GetSkillsQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
});

export const skillsRouter = new Hono();

skillsRouter.use("/*", authMiddleware);

skillsRouter.get("/", zValidator("query", GetSkillsQuerySchema), async (c) => {
  const { username } = getAuthPayload(c);
  const { entityType, entityId } = c.req.valid("query");

  try {
    let workspaceDir = getWorkspaceDir(username);
    if (entityType && entityId) {
      workspaceDir = agentTypeRegistry.get(entityType as AgentType).getWorkspaceDir(username, entityId);
    }

    const skillPaths = getResolvedSkillPaths(workspaceDir, username);

    const result = loadSkills({
      cwd: workspaceDir,
      agentDir: getUserDir(username),
      skillPaths,
      includeDefaults: true,
    });

    const userGlobalWorkspaceDir = getWorkspaceDir(username);

    const normalizePath = (p: string) => resolve(p).replaceAll("\\", "/").toLowerCase();
    const normalizedWorkspaceDir = normalizePath(workspaceDir);
    const normalizedGlobalWorkspaceDir = normalizePath(userGlobalWorkspaceDir);

    const skillsWithContent = result.skills.map((skill) => {
      const normalizedSkillPath = skill.filePath ? normalizePath(skill.filePath) : "";
      const isEntityLocal =
        entityType && entityType !== "global" && entityId && normalizedSkillPath
          ? normalizedSkillPath.startsWith(normalizedWorkspaceDir) &&
            !normalizedSkillPath.startsWith(normalizedGlobalWorkspaceDir)
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
    throw new InternalError("SKILLS_FETCH_FAILED", String(error));
  }
});

skillsRouter.post("/reset", async (c) => {
  const { username } = getAuthPayload(c);
  try {
    const { DEFAULT_FACTORY_SKILLS } = await import("../core/prompts/default-factory-skills");
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
    throw new InternalError("SKILLS_RESET_FAILED", String(error));
  }
});
