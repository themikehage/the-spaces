import { Modal } from "@/components/ui/Modal";
import { ProjectAssignmentPanel } from "./ProjectAssignmentPanel";

interface Props {
  projectId: string;
  projectName?: string;
  onClose: () => void;
}

export function ProjectAssignmentModal({ projectId, projectName, onClose }: Props) {
  return (
    <Modal open onClose={onClose} title={`Equipo del Proyecto ${projectName ? `(${projectName})` : ""}`}>
      <div className="p-5">
        <ProjectAssignmentPanel projectId={projectId} />
      </div>
    </Modal>
  );
}
