// SPDX-License-Identifier: MIT
import { GlobalAgentSettingsModal } from "@/components/agents/GlobalAgentSettingsModal";
import { RegisterModal } from "@/components/agents/RegisterModal";
import { ProjectAssignmentModal } from "@/components/projects/ProjectAssignmentModal";
import { ProjectSettingsModal } from "@/components/projects/ProjectSettingsModal";
import { TeamSettingsModal } from "@/components/teams/TeamSettingsModal";
import { AnimatePresence } from "framer-motion";
import type { AgentDefinition, AgentInfo } from "shared";

interface LayoutModalsProps {
  showAgentEdit: boolean;
  setShowAgentEdit: (val: boolean) => void;
  activeAgent: { id: string; name: string; avatarUrl?: string } | null;
  handleUpdateAgent: (def: AgentDefinition) => Promise<void>;
  uploadAvatar: (id: string, file: File) => Promise<string>;
  deleteAvatar: (id: string) => Promise<void>;
  showProjectEdit: boolean;
  setShowProjectEdit: (val: boolean) => void;
  activeProjectId: string | null;
  activeProjectName: string | null;
  activeProjectData: any;
  handleUpdateProject: (updates: {
    name: string;
    cloneUrl: string | null;
    avatarUrl: string | null;
  }) => Promise<void>;
  handleUploadProjectAvatar: (id: string, file: File) => Promise<string>;
  handleDeleteProjectAvatar: (id: string) => Promise<void>;
  handleDeleteProject: (id: string) => Promise<void>;
  showTeamEdit: boolean;
  setShowTeamEdit: (val: boolean) => void;
  activeTeamData: any;
  handleUpdateTeam: (updates: any) => Promise<void>;
  handleUploadTeamAvatar: (id: string, file: File) => Promise<string>;
  handleDeleteTeamAvatar: (id: string) => Promise<void>;
  handleDeleteTeam: (id: string) => Promise<void>;
  showGlobalEdit: boolean;
  setShowGlobalEdit: (val: boolean) => void;
  showAssignmentModal: boolean;
  setShowAssignmentModal: (val: boolean) => void;
}

export function LayoutModals({
  showAgentEdit,
  setShowAgentEdit,
  activeAgent,
  handleUpdateAgent,
  uploadAvatar,
  deleteAvatar,
  showProjectEdit,
  setShowProjectEdit,
  activeProjectId,
  activeProjectName,
  activeProjectData,
  handleUpdateProject,
  handleUploadProjectAvatar,
  handleDeleteProjectAvatar,
  handleDeleteProject,
  showTeamEdit,
  setShowTeamEdit,
  activeTeamData,
  handleUpdateTeam,
  handleUploadTeamAvatar,
  handleDeleteTeamAvatar,
  handleDeleteTeam,
  showGlobalEdit,
  setShowGlobalEdit,
  showAssignmentModal,
  setShowAssignmentModal,
}: LayoutModalsProps) {
  return (
    <AnimatePresence>
      {showAgentEdit && activeAgent && (
        <RegisterModal
          agent={
            {
              id: activeAgent.id,
              name: activeAgent.name,
              avatarUrl: activeAgent.avatarUrl,
              role: "",
              status: "idle" as const,
              createdAt: "",
            } as unknown as AgentInfo
          }
          onClose={() => setShowAgentEdit(false)}
          onSubmit={handleUpdateAgent}
          onUploadAvatar={uploadAvatar}
          onDeleteAvatar={deleteAvatar}
        />
      )}
      {showProjectEdit && activeProjectData && (
        <ProjectSettingsModal
          project={{
            id: activeProjectId!,
            name: activeProjectData.name,
            cloneUrl: activeProjectData.cloneUrl,
            avatarUrl: activeProjectData.avatarUrl,
            createdAt: activeProjectData.createdAt,
            diskPath: activeProjectData.diskPath,
          }}
          onClose={() => setShowProjectEdit(false)}
          onSave={handleUpdateProject}
          onUploadAvatar={handleUploadProjectAvatar}
          onDeleteAvatar={handleDeleteProjectAvatar}
          onDeleteProject={handleDeleteProject}
        />
      )}
      {showTeamEdit && activeTeamData && (
        <TeamSettingsModal
          team={activeTeamData}
          onClose={() => setShowTeamEdit(false)}
          onSave={handleUpdateTeam}
          onUploadAvatar={handleUploadTeamAvatar}
          onDeleteAvatar={handleDeleteTeamAvatar}
          onDeleteTeam={handleDeleteTeam}
        />
      )}
      {showGlobalEdit && <GlobalAgentSettingsModal onClose={() => setShowGlobalEdit(false)} />}
      {showAssignmentModal && activeProjectId && (
        <ProjectAssignmentModal
          projectId={activeProjectId}
          projectName={activeProjectName || undefined}
          onClose={() => setShowAssignmentModal(false)}
        />
      )}
    </AnimatePresence>
  );
}
