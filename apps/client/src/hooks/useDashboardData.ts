// SPDX-License-Identifier: MIT
import { useSessions, type SessionItem } from "@/contexts/SessionsContext";
import { useToast } from "@/contexts/ToastContext";
import { useLiterals } from "@/lib";
import { agentsService } from "@/lib/api/agents.service";
import { projectsService } from "@/lib/api/projects.service";
import { teamsService } from "@/lib/api/teams.service";
import { EntityEventBus } from "@/lib/event-bus";
import { literals as dashboardLiterals } from "@/pages/DashboardPage.literals";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface RepoItem {
  id?: string;
  name: string;
  path: string;
  lastModified: string;
  cloneUrl?: string | null;
  avatarUrl?: string | null;
  createdAt?: string | null;
  diskPath?: string;
}

export interface AgentItem {
  id: string;
  name: string;
  role: string;
  status: string;
  createdAt: string;
  avatarUrl?: string;
}

export interface TeamItem {
  id: string;
  name: string;
  description?: string;
  teamType?: string;
  members: any[];
  avatarUrl?: string | null;
}

interface UseDashboardDataParams {
  onNavigate?: (path: string) => void;
}

export function useDashboardData({ onNavigate }: UseDashboardDataParams) {
  const l = useLiterals(dashboardLiterals);
  const { addToast } = useToast();
  const { sessions } = useSessions();

  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [projectName, setRepoName] = useState("");
  const [cloneUrl, setCloneUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [tag, setTag] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [deleteRepo, setDeleteRepo] = useState<RepoItem | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [infoProject, setInfoProject] = useState<RepoItem | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [reposData, agentsData, teamsData] = await Promise.all([
        projectsService.fetchProjects().catch(() => []),
        agentsService.fetchAgents().catch(() => []),
        teamsService.fetchTeams().catch(() => []),
      ]);

      setRepos((reposData as any)?.projects || (reposData as any)?.repos || reposData || []);
      setAgents((agentsData as any)?.agents || agentsData || []);
      setTeams((teamsData as any)?.teams || teamsData || []);
    } catch (err: any) {
      setError(err.message || l.loadError);
    } finally {
      setLoading(false);
    }
  }, [l]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    return EntityEventBus.subscribe(() => fetchData());
  }, [fetchData]);

  const handleDeleteRepo = (repo: RepoItem) => {
    setDeleteRepo(repo);
    setConfirmDeleteName("");
  };

  const handleDeleteRepoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteRepo) return;
    setDeleting(true);
    const id = deleteRepo.id || deleteRepo.name;
    try {
      await projectsService.deleteProject(id);
      await fetchData();
      EntityEventBus.emit({ type: "project" });
      setDeleteRepo(null);
      setConfirmDeleteName("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast("error", msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleStartInfo = (repo: RepoItem) => {
    setInfoProject(repo);
  };

  const handleUpdateInfo = async (updates: {
    name: string;
    cloneUrl: string | null;
    avatarUrl: string | null;
  }) => {
    if (!infoProject) return;
    const id = infoProject.id || infoProject.name;
    await projectsService.updateProject(id, updates);
    await fetchData();
    EntityEventBus.emit({ type: "project" });
  };

  const handleUploadProjectAvatar = useCallback(
    async (id: string, file: File) => {
      const url = await projectsService.uploadProjectAvatar(id, file);
      await fetchData();
      EntityEventBus.emit({ type: "project" });
      return url;
    },
    [fetchData],
  );

  const handleDeleteProjectAvatar = useCallback(
    async (id: string) => {
      await projectsService.deleteProjectAvatar(id);
      await fetchData();
      EntityEventBus.emit({ type: "project" });
    },
    [fetchData],
  );

  const handleCreateRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await projectsService.createProject({
        name: projectName.trim(),
        cloneUrl: cloneUrl.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        tag: tag.trim() || undefined,
      });

      await fetchData();
      EntityEventBus.emit({ type: "project" });
      setShowModal(false);
      setRepoName("");
      setCloneUrl("");
      setAvatarUrl("");
      setTag("");
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const activeSessions = useMemo(() => {
    return sessions
      .filter(
        (s) => s.status === "streaming" || s.status === "active" || s.status === "task-running",
      )
      .slice(0, 6);
  }, [sessions]);

  const handleOpenSession = (session: SessionItem) => {
    if (!onNavigate) return;
    let path: string;
    if (session.teamId) {
      path = `/teams/${session.teamId}/session/${session.id}`;
    } else if (session.agentId) {
      if (session.agentId === "lab-architect") {
        path = `/laboratory/session/${session.id}`;
      } else {
        path = `/agents/${session.agentId}/session/${session.id}`;
      }
    } else if (session.projectId) {
      path = `/projects/${session.projectId}/session/${session.id}`;
    } else {
      path = `/session/${session.id}`;
    }
    onNavigate(path);
  };

  const avatarLookup = useMemo(() => {
    const map = new Map<string, string | null | undefined>();
    for (const repo of repos) {
      if (repo.name) map.set(`project:${repo.name}`, repo.avatarUrl);
      if (repo.id) map.set(`project:${repo.id}`, repo.avatarUrl);
    }
    for (const agent of agents) {
      map.set(`agent:${agent.id}`, agent.avatarUrl);
    }
    for (const team of teams) {
      map.set(`team:${team.id}`, team.avatarUrl);
    }
    return (session: SessionItem) => {
      if (session.projectId) {
        const url = map.get(`project:${session.projectId}`);
        if (url) return url;
      }
      if (session.agentId) {
        const url = map.get(`agent:${session.agentId}`);
        if (url) return url;
      }
      if (session.teamId) {
        const url = map.get(`team:${session.teamId}`);
        if (url) return url;
      }
      return null;
    };
  }, [repos, agents, teams]);

  const formatTime = (updatedAt: string) => {
    const diff = Date.now() - new Date(updatedAt).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 30) return "Just now";
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(updatedAt).toLocaleDateString();
  };

  return {
    l,
    repos,
    agents,
    teams,
    loading,
    error,
    showModal,
    setShowModal,
    projectName,
    setRepoName,
    cloneUrl,
    setCloneUrl,
    avatarUrl,
    setAvatarUrl,
    tag,
    setTag,
    submitting,
    submitError,
    setSubmitError,
    deleteRepo,
    setDeleteRepo,
    confirmDeleteName,
    setConfirmDeleteName,
    deleting,
    infoProject,
    setInfoProject,
    handleDeleteRepo,
    handleDeleteRepoSubmit,
    handleStartInfo,
    handleUpdateInfo,
    handleUploadProjectAvatar,
    handleDeleteProjectAvatar,
    handleCreateRepo,
    activeSessions,
    handleOpenSession,
    avatarLookup,
    formatTime,
  };
}
