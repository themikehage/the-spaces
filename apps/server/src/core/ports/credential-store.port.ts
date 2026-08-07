import type { CredentialCreate, CredentialListItem } from "shared";

export interface ResolvedCredential {
  authHeader: Record<string, string>;
}

export interface ICredentialStore {
  create(username: string, data: CredentialCreate): Promise<CredentialListItem>;
  get(username: string, id: string): Promise<CredentialListItem | null>;
  resolve(username: string, id: string): Promise<ResolvedCredential | null>;
  list(username: string): Promise<CredentialListItem[]>;
  delete(username: string, id: string): Promise<void>;
}
