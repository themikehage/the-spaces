import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const LICENSE_HEADER = "// SPDX-License-Identifier: MIT";
const TARGET_DIRS = ["apps", "packages"];
const EXTENSIONS = [".ts", ".tsx"];
const EXCLUDE_DIRS = ["node_modules", "dist", ".git", ".next"];

const shouldFix = process.argv.includes("--fix");
let missingCount = 0;
let totalChecked = 0;

function scanDir(dirPath: string) {
  const entries = readdirSync(dirPath);
  for (const entry of entries) {
    if (EXCLUDE_DIRS.includes(entry)) continue;
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (stat.isFile() && EXTENSIONS.some((ext) => fullPath.endsWith(ext))) {
      totalChecked++;
      const content = readFileSync(fullPath, "utf8");
      if (!content.startsWith(LICENSE_HEADER)) {
        missingCount++;
        if (shouldFix) {
          writeFileSync(fullPath, `${LICENSE_HEADER}\n${content}`, "utf8");
          console.log(`[FIXED] Added SPDX header to: ${fullPath}`);
        } else {
          console.error(`[MISSING] Missing SPDX header in: ${fullPath}`);
        }
      }
    }
  }
}

const rootDir = process.cwd();
for (const target of TARGET_DIRS) {
  const fullTarget = join(rootDir, target);
  scanDir(fullTarget);
}

if (shouldFix) {
  console.log(`\nScan complete. Fixed ${missingCount} files out of ${totalChecked} checked.`);
} else if (missingCount > 0) {
  console.error(
    `\nValidation failed: ${missingCount} file(s) missing SPDX header out of ${totalChecked} checked.`,
  );
  process.exit(1);
} else {
  console.log(
    `\nValidation passed: All ${totalChecked} source files contain the required SPDX header.`,
  );
}
