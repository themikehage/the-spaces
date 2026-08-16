// SPDX-License-Identifier: MIT

export const DEFAULT_RESTRICTED_PATHS = [
  "/etc",
  "/proc",
  "/sys",
  "/dev",
  "~/.ssh",
  "C:\\Windows\\System32",
  "C:\\Windows\\SysWOW64",
];

const REDIRECT_TO_NULL = /(?:\d&?|&)?>>?&?\s*\/dev\/null/gi;

function stripRedirectToNull(command: string): string {
  return command.replace(REDIRECT_TO_NULL, " ");
}

export function isRestrictedPath(
  command: string,
  restrictedPaths: string[] = DEFAULT_RESTRICTED_PATHS,
): { restricted: boolean; matchedPath?: string } {
  const lowerCmd = stripRedirectToNull(command).toLowerCase();
  for (const path of restrictedPaths) {
    const normalized = path.toLowerCase().replace(/\\/g, "/");
    if (lowerCmd.includes(normalized) || lowerCmd.includes(path.toLowerCase())) {
      return { restricted: true, matchedPath: path };
    }
  }
  return { restricted: false };
}
