// SPDX-License-Identifier: MIT
import { Dialog } from "@/components/ui/Dialog";
import { ProjectAssignmentPanel } from "./ProjectAssignmentPanel";

interface Props {
  projectId: string;
  projectName?: string;
  onClose: () => void;
}

export function ProjectAssignmentModal({ projectId, projectName, onClose }: Props) {
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Equipo del Proyecto ${projectName ? `(${projectName})` : ""}`}
      size="lg"
    >
      <ProjectAssignmentPanel projectId={projectId} />
    </Dialog>
  );
}
