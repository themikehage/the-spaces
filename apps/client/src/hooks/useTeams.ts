// SPDX-License-Identifier: MIT
import { teamsService } from "@/lib/api/teams.service";
import { useCallback, useEffect, useState } from "react";
import type { CreateTeam, Team, UpdateTeam } from "shared";

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await teamsService.fetchTeams();
      setTeams(data);
    } catch (err: any) {
      setError(err.message || "Failed to load teams");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const createTeam = useCallback(
    async (data: CreateTeam): Promise<Team> => {
      const team = await teamsService.createTeam(data);
      await fetchTeams();
      window.dispatchEvent(new CustomEvent("entity-updated", { detail: { type: "team" } }));
      return team;
    },
    [fetchTeams],
  );

  const updateTeam = useCallback(
    async (id: string, updates: UpdateTeam): Promise<Team> => {
      const team = await teamsService.updateTeam(id, updates);
      await fetchTeams();
      window.dispatchEvent(new CustomEvent("entity-updated", { detail: { type: "team" } }));
      return team;
    },
    [fetchTeams],
  );

  const deleteTeam = useCallback(
    async (id: string): Promise<void> => {
      await teamsService.deleteTeam(id);
      await fetchTeams();
      window.dispatchEvent(new CustomEvent("entity-updated", { detail: { type: "team" } }));
    },
    [fetchTeams],
  );

  const uploadTeamAvatar = useCallback(
    async (id: string, file: File): Promise<string> => {
      const url = await teamsService.uploadTeamAvatar(id, file);
      await fetchTeams();
      return url;
    },
    [fetchTeams],
  );

  const deleteTeamAvatar = useCallback(
    async (id: string): Promise<void> => {
      await teamsService.deleteTeamAvatar(id);
      await fetchTeams();
    },
    [fetchTeams],
  );

  return {
    teams,
    loading,
    error,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    uploadTeamAvatar,
    deleteTeamAvatar,
  };
}
