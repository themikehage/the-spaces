import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getUserDir, type CredentialCreate, type CredentialListItem } from "shared";
import { auth } from "../../auth/index";
import { decryptEnv, encryptEnv } from "../../lib/env-crypto";
import type { ICredentialStore, ResolvedCredential } from "../ports/credential-store.port";

interface StoredCredentialFile {
  id: string;
  name: string;
  type: "bearer" | "basic" | "api-key";
  metadata?: Record<string, string>;
  username: string;
  createdAt: string;
  updatedAt: string;
  _secret: string;
}

export class CredentialStore implements ICredentialStore {
  private getCredentialsDir(username: string): string {
    const dir = join(getUserDir(username), "http-credentials");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  async create(username: string, data: CredentialCreate): Promise<CredentialListItem> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const secretKey = auth.options.secret;
    const encryptedSecret = encryptEnv(data.secret, secretKey);

    const storedFile: StoredCredentialFile = {
      id,
      name: data.name,
      type: data.type,
      metadata: data.metadata,
      username,
      createdAt: now,
      updatedAt: now,
      _secret: encryptedSecret,
    };

    const dir = this.getCredentialsDir(username);
    writeFileSync(join(dir, `${id}.json`), JSON.stringify(storedFile, null, 2), "utf-8");

    return {
      id,
      name: data.name,
      type: data.type,
      metadata: data.metadata,
      createdAt: now,
      updatedAt: now,
    };
  }

  async get(username: string, id: string): Promise<CredentialListItem | null> {
    const dir = this.getCredentialsDir(username);
    const filePath = join(dir, `${id}.json`);
    if (!existsSync(filePath)) return null;

    try {
      const raw = readFileSync(filePath, "utf-8");
      const stored: StoredCredentialFile = JSON.parse(raw);
      return {
        id: stored.id,
        name: stored.name,
        type: stored.type,
        metadata: stored.metadata,
        createdAt: stored.createdAt,
        updatedAt: stored.updatedAt,
      };
    } catch {
      return null;
    }
  }

  async resolve(username: string, id: string): Promise<ResolvedCredential | null> {
    const dir = this.getCredentialsDir(username);
    const filePath = join(dir, `${id}.json`);
    if (!existsSync(filePath)) return null;

    try {
      const raw = readFileSync(filePath, "utf-8");
      const stored: StoredCredentialFile = JSON.parse(raw);
      const secretKey = auth.options.secret;
      const decryptedSecret = decryptEnv(stored._secret, secretKey);

      const authHeader: Record<string, string> = {};

      if (stored.type === "bearer") {
        authHeader["Authorization"] = `Bearer ${decryptedSecret}`;
      } else if (stored.type === "basic") {
        const authUser = stored.metadata?.username || "";
        const encoded = Buffer.from(`${authUser}:${decryptedSecret}`).toString("base64");
        authHeader["Authorization"] = `Basic ${encoded}`;
      } else if (stored.type === "api-key") {
        const headerName = stored.metadata?.headerName || "X-API-Key";
        authHeader[headerName] = decryptedSecret;
      }

      return { authHeader };
    } catch {
      return null;
    }
  }

  async list(username: string): Promise<CredentialListItem[]> {
    const dir = this.getCredentialsDir(username);
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    const results: CredentialListItem[] = [];

    for (const file of files) {
      try {
        const raw = readFileSync(join(dir, file), "utf-8");
        const stored: StoredCredentialFile = JSON.parse(raw);
        results.push({
          id: stored.id,
          name: stored.name,
          type: stored.type,
          metadata: stored.metadata,
          createdAt: stored.createdAt,
          updatedAt: stored.updatedAt,
        });
      } catch {
        // Skip
      }
    }

    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async delete(username: string, id: string): Promise<void> {
    const dir = this.getCredentialsDir(username);
    const filePath = join(dir, `${id}.json`);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }
}

export const credentialStore = new CredentialStore();
