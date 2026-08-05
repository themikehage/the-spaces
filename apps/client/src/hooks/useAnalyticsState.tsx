// SPDX-License-Identifier: MIT
import { useLiterals } from "@/lib";
import { agentsService } from "@/lib/api/agents.service";
import { projectsService } from "@/lib/api/projects.service";
import { sessionsService } from "@/lib/api/sessions.service";
import { teamsService } from "@/lib/api/teams.service";
import { literals as u } from "@/pages/AnalyticsPage.literals";
import { Cpu, Hourglass, Layers, ShieldAlert, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface AnalyticsData {
  totalSessions: number;
  totalTokens: number;
  totalToolCalls: number;
  totalErrors: number;
  totalDurationMs: number;
  avgDurationMs: number;
  avgTokensPerSession: number;
  sessionsByDay: { date: string; count: number; tokens: number }[];
  topTools: { tool: string; count: number }[];
  topModels: { model: string; count: number }[];
  errorRate: number;
  topErrors: { tool: string; count: number }[];
}

export interface FilterOption {
  id: string;
  name: string;
}

export function useAnalyticsState() {
  const l = useLiterals(u);

  const defaultTo = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
  const defaultFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .substring(0, 10);

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");

  const [projects, setProjects] = useState<FilterOption[]>([]);
  const [agents, setAgents] = useState<FilterOption[]>([]);
  const [teams, setTeams] = useState<FilterOption[]>([]);

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    async function loadFilters() {
      try {
        const [projData, agentData, teamData] = await Promise.all([
          projectsService.fetchProjects().catch(() => []),
          agentsService.fetchAgents().catch(() => []),
          teamsService.fetchTeams().catch(() => []),
        ]);

        const items = ((projData as any).projects || (projData as any).repos || projData || []).map(
          (x: any) => ({
            id: x.name,
            name: x.name,
          }),
        );
        setProjects(items);
        setAgents((agentData as any).agents || agentData || []);
        setTeams((teamData as any).teams || teamData || []);
      } catch (err) {
        console.error("Failed to load analytics filters:", err);
      }
    }
    loadFilters();
  }, []);

  const loadAnalytics = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams();
        if (from) params.append("from", from);
        if (to) params.append("to", to);
        if (selectedProject) params.append("projectId", selectedProject);
        if (selectedAgent) params.append("agentId", selectedAgent);
        if (selectedTeam) params.append("teamId", selectedTeam);

        const analyticsData = await sessionsService.fetchSessionAnalytics(params.toString());
        setData(analyticsData);
      } catch (err) {
        console.error("Failed to load analytics data:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [from, to, selectedProject, selectedAgent, selectedTeam],
  );

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const formatDuration = useCallback(
    (ms: number) => {
      if (!ms) return `0${l.seconds}`;
      const totalSec = Math.floor(ms / 1000);
      if (totalSec < 60) return `${totalSec}${l.seconds}`;
      const totalMin = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      if (totalMin < 60) return `${totalMin}${l.minutes} ${sec}${l.seconds}`;
      const h = Math.floor(totalMin / 60);
      const min = totalMin % 60;
      return `${h}${l.hours} ${min}${l.minutes}`;
    },
    [l],
  );

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const kpis = useMemo(() => {
    if (!data) return [];
    return [
      {
        id: "sessions",
        label: l.kpiSessions,
        value: data.totalSessions.toString(),
        icon: <Layers className="w-4 h-4 text-blue-400" />,
        bg: "border-blue-500/10 bg-blue-500/2",
      },
      {
        id: "tokens",
        label: l.kpiTokens,
        value: formatNumber(data.totalTokens),
        icon: <Zap className="w-4 h-4 text-emerald-400" />,
        bg: "border-emerald-500/10 bg-emerald-500/2",
      },
      {
        id: "toolcalls",
        label: l.kpiToolCalls,
        value: formatNumber(data.totalToolCalls),
        icon: <Cpu className="w-4 h-4 text-purple-400" />,
        bg: "border-purple-500/10 bg-purple-500/2",
      },
      {
        id: "duration",
        label: l.kpiAvgDuration,
        value: formatDuration(data.avgDurationMs),
        icon: <Hourglass className="w-4 h-4 text-amber-400" />,
        bg: "border-amber-500/10 bg-amber-500/2",
      },
      {
        id: "errors",
        label: l.kpiErrorRate,
        value: `${Math.round(data.errorRate * 100)}%`,
        icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
        bg: "border-rose-500/10 bg-rose-500/2",
      },
    ];
  }, [data, l, formatDuration]);

  return {
    l,
    from,
    setFrom,
    to,
    setTo,
    selectedProject,
    setSelectedProject,
    selectedAgent,
    setSelectedAgent,
    selectedTeam,
    setSelectedTeam,
    projects,
    agents,
    teams,
    data,
    loading,
    refreshing,
    loadAnalytics,
    kpis,
  };
}
