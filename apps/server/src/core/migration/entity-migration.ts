// SPDX-License-Identifier: MIT
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SPACES_DATA_PATH, USERS_DIR, type AgentDefinition } from "shared";

export async function migrateLegacyEntitiesToAgentCapabilities(): Promise<void> {
  const usersParentDir = join(SPACES_DATA_PATH(), USERS_DIR);
  if (!existsSync(usersParentDir)) return;

  try {
    const userDirs = readdirSync(usersParentDir, { withFileTypes: true });
    for (const userDir of userDirs) {
      if (!userDir.isDirectory()) continue;
      const username = userDir.name;

      // 1. Migrate legacy teams
      const teamsDir = join(usersParentDir, username, "teams");
      if (existsSync(teamsDir)) {
        const teamFiles = readdirSync(teamsDir);
        for (const file of teamFiles) {
          if (!file.endsWith(".json")) continue;
          try {
            const teamPath = join(teamsDir, file);
            const teamData = JSON.parse(readFileSync(teamPath, "utf-8"));
            const agentId = teamData.id.startsWith("team-") ? teamData.id : `team-${teamData.id}`;
            const targetAgentDir = join(usersParentDir, username, "agents", agentId);
            if (!existsSync(targetAgentDir)) {
              mkdirSync(targetAgentDir, { recursive: true });
              const def: AgentDefinition = {
                id: agentId,
                name: teamData.name || agentId,
                description: teamData.description,
                type: "team",
                capabilities: {
                  group: {
                    members: teamData.members ?? [],
                    mode: teamData.mode ?? "debate",
                    teamType: teamData.teamType ?? "Orchestration",
                    maxRounds: teamData.maxRounds ?? 5,
                    context: teamData.context,
                    leaderId: teamData.leaderId,
                  },
                },
              };
              writeFileSync(join(targetAgentDir, "definition.json"), JSON.stringify(def, null, 2), "utf-8");
            }
          } catch (err) {
            console.error(`[EntityMigration] Failed to migrate team ${file} for user ${username}:`, err);
          }
        }
      }

      // 2. Migrate legacy projects
      const projectsDir = join(usersParentDir, username, "projects");
      if (existsSync(projectsDir)) {
        const projectDirs = readdirSync(projectsDir, { withFileTypes: true });
        for (const pDir of projectDirs) {
          if (!pDir.isDirectory()) continue;
          try {
            const projectMetaPath = join(projectsDir, pDir.name, "project.json");
            if (existsSync(projectMetaPath)) {
              const projectData = JSON.parse(readFileSync(projectMetaPath, "utf-8"));
              const agentId = projectData.id.startsWith("proj-") ? projectData.id : `proj-${projectData.id}`;
              const targetAgentDir = join(usersParentDir, username, "agents", agentId);
              if (!existsSync(targetAgentDir)) {
                mkdirSync(targetAgentDir, { recursive: true });
                const def: AgentDefinition = {
                  id: agentId,
                  name: projectData.name || agentId,
                  type: "project",
                  capabilities: {
                    workspace: {
                      workspaceDir: join(projectsDir, pDir.name, "workspace"),
                      cloneUrl: projectData.cloneUrl,
                    },
                    group: projectData.assignment
                      ? {
                          members: projectData.assignment.members ?? [],
                          leaderId: projectData.assignment.leaderId,
                          mode: "debate",
                          teamType: "Orchestration",
                          maxRounds: 5,
                        }
                      : undefined,
                  },
                };
                writeFileSync(join(targetAgentDir, "definition.json"), JSON.stringify(def, null, 2), "utf-8");
              }
            }
          } catch (err) {
            console.error(`[EntityMigration] Failed to migrate project ${pDir.name} for user ${username}:`, err);
          }
        }
      }
    }
  } catch (err) {
    console.error("[EntityMigration] Error during entity migration:", err);
  }
}
