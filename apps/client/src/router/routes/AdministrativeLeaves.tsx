// SPDX-License-Identifier: MIT
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { AgentsPage } from "@/pages/AgentsPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { LogsConsolePage } from "@/pages/LogsConsolePage";
import { PluginsPage } from "@/pages/PluginsPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { SchedulesPage } from "@/pages/SchedulesPage";
import { SessionsPage } from "@/pages/SessionsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SkillsPage } from "@/pages/SkillsPage";
import { TeamsPage } from "@/pages/TeamsPage";
import { Navigate, useNavigate } from "react-router-dom";

export function SchedulesRoute() {
  return <SchedulesPage />;
}

export function DashboardRoute() {
  const navigate = useNavigate();
  const { selectProject } = useWorkspaceContext();
  return <DashboardPage onNavigate={navigate} onSelectProject={selectProject} />;
}
export function ProjectsRoute() {
  const navigate = useNavigate();
  const { selectProject } = useWorkspaceContext();
  return <ProjectsPage onNavigate={navigate} onSelectProject={selectProject} />;
}
export function SettingsRoute() {
  return <SettingsPage />;
}
export function SkillsRoute() {
  return <SkillsPage />;
}
export function AgentsRoute() {
  const { selectAgent } = useWorkspaceContext();
  return <AgentsPage onSelectAgent={selectAgent} />;
}
export function TeamsRoute() {
  return <TeamsPage />;
}
export function LogsRoute() {
  const navigate = useNavigate();
  const { selectProject, selectAgent } = useWorkspaceContext();
  return (
    <LogsConsolePage
      onNavigate={navigate}
      onSelectProject={selectProject}
      onSelectAgent={selectAgent}
    />
  );
}
export function PluginsRoute() {
  return <PluginsPage />;
}
export function SessionsRoute() {
  const navigate = useNavigate();
  return <SessionsPage onNavigate={navigate} />;
}
export function AnalyticsRoute() {
  return <Navigate to="/sessions?tab=analytics" replace />;
}
