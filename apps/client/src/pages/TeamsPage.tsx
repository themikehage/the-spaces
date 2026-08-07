// SPDX-License-Identifier: MIT
import { TeamCard } from "@/components/teams/TeamCard";
import { TeamCreateModal } from "@/components/teams/TeamCreateModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { HeaderWithActions } from "@/components/ui/HeaderWithActions";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAgents } from "@/hooks/useAgents";
import { useTeams } from "@/hooks/useTeams";
import { useLiterals } from "@/lib";
import { buildContextPath } from "@/router/paths";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Users } from "lucide-react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { literals as u } from "./TeamsPage.literals";

export function TeamsPage() {
  const l = useLiterals(u);
  const navigate = useNavigate();
  const { teams, loading, error, fetchTeams, createTeam, uploadTeamAvatar } = useTeams();
  const { agents: registeredAgents } = useAgents();

  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleOpenTeam = useCallback(
    (id: string) => {
      navigate(buildContextPath({ type: "team", id }));
    },
    [navigate],
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative font-sans">
      <HeaderWithActions
        title={l.pageTitle}
        subtitle={l.pageSubtitle}
        icon={Users}
        count={teams.length}
        onRefresh={fetchTeams}
        isRefreshing={loading}
        primaryAction={{
          label: l.createTeam,
          icon: Plus,
          onClick: () => setShowCreateModal(true),
        }}
      />

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={fetchTeams} />
        ) : teams.length === 0 ? (
          <EmptyState
            icon={Users}
            title={l.emptyTitle}
            description={l.emptyDescription}
            actionLabel={l.emptyButton}
            onAction={() => setShowCreateModal(true)}
            actionIcon={Plus}
          />
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {teams.map((t) => (
                <TeamCard
                  key={t.id}
                  team={t}
                  registeredAgents={registeredAgents}
                  onOpen={handleOpenTeam}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <TeamCreateModal
            onClose={() => setShowCreateModal(false)}
            onCreate={createTeam}
            onUploadAvatar={uploadTeamAvatar}
            registeredAgents={registeredAgents}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
