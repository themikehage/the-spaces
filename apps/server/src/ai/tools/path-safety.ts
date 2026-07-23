import { resolve, relative, isAbsolute } from "node:path";

/**
 * Resolves targetPath relative to workspaceDir and ensures the resolved path
 * lies within workspaceDir or one of the allowedDirs (no directory traversal attacks).
 */
export function resolveSafePath(workspaceDir: string, targetPath: string, allowedDirs?: string[]): string {
  const resolved = resolve(workspaceDir, targetPath);
  
  const absWorkspace = resolve(workspaceDir);
  const absResolved = resolve(resolved);
  
  // Normalize both paths to lowercase to make the safety check case-insensitive.
  // This is particularly important on Windows, but also safeguards against environment quirks.
  const rel = relative(absWorkspace.toLowerCase(), absResolved.toLowerCase());
  
  if (!rel.startsWith("..") && !isAbsolute(rel)) {
    return resolved;
  }

  // Check if it falls inside any of the explicitly allowed directories
  if (allowedDirs && allowedDirs.length > 0) {
    for (const allowedDir of allowedDirs) {
      const absAllowed = resolve(allowedDir);
      const relAllowed = relative(absAllowed.toLowerCase(), absResolved.toLowerCase());
      if (!relAllowed.startsWith("..") && !isAbsolute(relAllowed)) {
        return resolved;
      }
    }
  }
  
  throw new Error(`Access Denied: Path "${targetPath}" resolves outside of workspace.`);
}
