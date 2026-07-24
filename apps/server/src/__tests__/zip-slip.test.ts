// SPDX-License-Identifier: MIT
import AdmZip from "adm-zip";
import { describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { safeExtractZip } from "../core/backup/safe-zip-extract";

describe("safeExtractZip (Zip Slip protection)", () => {
  it("extracts normal entries safely into target directory", () => {
    const tempTarget = mkdtempSync(join(tmpdir(), "zip-test-good-"));
    try {
      const zip = new AdmZip();
      zip.addFile("test.txt", Buffer.from("hello world"));
      zip.addFile("sub/folder/data.json", Buffer.from("{}"));

      safeExtractZip(zip, tempTarget);

      expect(existsSync(join(tempTarget, "test.txt"))).toBeTrue();
      expect(existsSync(join(tempTarget, "sub", "folder", "data.json"))).toBeTrue();
    } finally {
      rmSync(tempTarget, { recursive: true, force: true });
    }
  });

  it("throws error and blocks path traversal attempts using ../", () => {
    const tempTarget = mkdtempSync(join(tmpdir(), "zip-test-bad-"));
    try {
      const zip = new AdmZip();
      zip.addFile("dummy.txt", Buffer.from("malicious content"));
      const entries = zip.getEntries();
      entries[0].entryName = "../outside.txt";

      expect(() => safeExtractZip(zip, tempTarget)).toThrow(
        /Illegal zip entry path \(path traversal detected\)/,
      );
    } finally {
      rmSync(tempTarget, { recursive: true, force: true });
    }
  });

  it("enforces max entry count limits", () => {
    const tempTarget = mkdtempSync(join(tmpdir(), "zip-test-count-"));
    try {
      const zip = new AdmZip();
      zip.addFile("1.txt", Buffer.from("1"));
      zip.addFile("2.txt", Buffer.from("2"));
      zip.addFile("3.txt", Buffer.from("3"));

      expect(() => safeExtractZip(zip, tempTarget, { maxEntries: 2 })).toThrow(
        /Zip contains too many entries/,
      );
    } finally {
      rmSync(tempTarget, { recursive: true, force: true });
    }
  });
});
