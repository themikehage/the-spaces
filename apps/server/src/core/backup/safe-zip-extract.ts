// SPDX-License-Identifier: MIT
import type AdmZip from "adm-zip";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";

export interface SafeZipOptions {
  maxEntries?: number;
  maxTotalBytes?: number;
}

export function safeExtractZip(
  zip: AdmZip,
  targetDir: string,
  options: SafeZipOptions = {},
): void {
  const maxEntries = options.maxEntries ?? 50000;
  const maxTotalBytes = options.maxTotalBytes ?? 500 * 1024 * 1024; // 500MB

  const targetDirResolved = resolve(targetDir);
  const entries = zip.getEntries();

  if (entries.length > maxEntries) {
    throw new Error(`Zip contains too many entries: ${entries.length} (max: ${maxEntries})`);
  }

  let totalBytes = 0;

  for (const entry of entries) {
    const entryPath = entry.entryName;
    const destinationPath = resolve(targetDirResolved, entryPath);

    // Prevent Zip Slip / Path Traversal
    if (
      !destinationPath.startsWith(targetDirResolved + sep) &&
      destinationPath !== targetDirResolved
    ) {
      throw new Error(`Illegal zip entry path (path traversal detected): ${entryPath}`);
    }

    if (entry.isDirectory) {
      mkdirSync(destinationPath, { recursive: true });
      continue;
    }

    totalBytes += entry.header.size;
    if (totalBytes > maxTotalBytes) {
      throw new Error(
        `Zip uncompressed size limit exceeded: ${totalBytes} bytes (max: ${maxTotalBytes})`,
      );
    }

    const parentDir = dirname(destinationPath);
    mkdirSync(parentDir, { recursive: true });
    writeFileSync(destinationPath, entry.getData());
  }
}
