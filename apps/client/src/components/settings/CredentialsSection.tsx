import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { useCredentials } from "@/hooks/useCredentials";
import { KeyRound, Lock, Plus, ShieldCheck, Trash2, User } from "lucide-react";
import React, { useState } from "react";
import type { CredentialType } from "shared";

const CREDENTIAL_TYPE_OPTIONS: Array<{ value: CredentialType; label: string }> = [
  { value: "bearer", label: "Bearer Token" },
  { value: "basic", label: "Basic Auth (Username + Password)" },
  { value: "api-key", label: "API Key (Custom Header)" },
];

export const CredentialsSection: React.FC = () => {
  const { credentials, loading, error, createCredential, deleteCredential } = useCredentials();
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<CredentialType>("bearer");
  const [secret, setSecret] = useState("");
  const [username, setUsername] = useState("");
  const [headerName, setHeaderName] = useState("X-API-Key");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !secret.trim()) {
      setFormError("Name and secret are required");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const metadata: Record<string, string> = {};
      if (type === "basic" && username.trim()) {
        metadata.username = username.trim();
      }
      if (type === "api-key" && headerName.trim()) {
        metadata.headerName = headerName.trim();
      }

      await createCredential({
        name: name.trim(),
        type,
        secret: secret.trim(),
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });

      setName("");
      setSecret("");
      setUsername("");
      setHeaderName("X-API-Key");
      setIsAdding(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save credential";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-8 border-t border-border mt-8 space-y-4 select-none">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> API Credentials
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Encrypted credentials for HTTP Workflow Nodes (Bearer Tokens, Basic Auth, API Keys)
          </p>
        </div>
        <Button
          onClick={() => setIsAdding(!isAdding)}
          variant="outline"
          className="text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          {isAdding ? "Cancel" : "Add Credential"}
        </Button>
      </div>

      {(error || formError) && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          {error || formError}
        </div>
      )}

      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="p-4 rounded-xl bg-card border border-border space-y-3"
        >
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Credential Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Stripe Production API"
              className="w-full px-3 py-1.5 rounded-lg bg-accent/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary font-sans"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Auth Type
            </label>
            <Dropdown
              value={type}
              onChange={(val) => setType(val as CredentialType)}
              options={CREDENTIAL_TYPE_OPTIONS}
              matchWidth
              className="w-full"
            />
          </div>

          {type === "basic" && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Username
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="api_user"
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-accent/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary font-mono"
                />
              </div>
            </div>
          )}

          {type === "api-key" && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Header Name
              </label>
              <input
                type="text"
                value={headerName}
                onChange={(e) => setHeaderName(e.target.value)}
                placeholder="X-API-Key"
                className="w-full px-3 py-1.5 rounded-lg bg-accent/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Secret / Token / Password
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-accent/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAdding(false)}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="text-xs cursor-pointer"
            >
              {saving ? "Encrypting & Saving..." : "Save Credential"}
            </Button>
          </div>
        </form>
      )}

      {loading && credentials.length === 0 ? (
        <div className="text-xs text-muted-foreground italic py-2">Loading credentials...</div>
      ) : credentials.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
          No HTTP credentials configured. Add one to use authenticated requests in Workflow HTTP Nodes.
        </div>
      ) : (
        <div className="space-y-2">
          {credentials.map((cred) => (
            <div
              key={cred.id}
              className="flex items-center justify-between p-3 rounded-xl bg-accent/30 border border-border/60 hover:border-border transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{cred.name}</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-accent border border-border text-muted-foreground">
                      {cred.type}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                    {cred.type === "basic" && cred.metadata?.username
                      ? `user: ${cred.metadata.username} • `
                      : cred.type === "api-key" && cred.metadata?.headerName
                        ? `header: ${cred.metadata.headerName} • `
                        : ""}
                    id: {cred.id.slice(0, 8)}...
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => deleteCredential(cred.id)}
                className="p-1.5 h-auto text-destructive hover:bg-destructive/10 border-destructive/20 cursor-pointer"
                title="Delete Credential"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
