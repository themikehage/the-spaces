export interface WorkspaceSyncTarget {
  type: "remote" | "local";
  path: string;
}

export interface IWorkspaceProvider {
  resolvePath(relativePath: string): string;
  watch(pattern: string, onChange: () => void): () => void;
  sync(remote: WorkspaceSyncTarget): Promise<void>;
}
