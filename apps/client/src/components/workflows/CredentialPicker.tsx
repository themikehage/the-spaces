import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";
import { useCredentials } from "@/hooks/useCredentials";
import { KeyRound, ShieldAlert } from "lucide-react";
import React from "react";

interface CredentialPickerProps {
  value: string | undefined;
  onChange: (credentialId: string | undefined) => void;
}

export const CredentialPicker: React.FC<CredentialPickerProps> = ({ value, onChange }) => {
  const { credentials, loading } = useCredentials();

  const options: DropdownOption<string>[] = [
    { value: "", label: "No Auth (Public Request)" },
    ...credentials.map((cred) => ({
      value: cred.id,
      label: `${cred.name} (${cred.type.toUpperCase()})`,
    })),
  ];

  return (
    <div>
      <label className="block text-xs font-medium text-sky-300 mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <KeyRound className="w-3.5 h-3.5" /> Saved HTTP Credential
        </span>
      </label>
      {loading ? (
        <div className="text-[11px] text-muted-foreground italic py-1">Loading credentials...</div>
      ) : (
        <Dropdown
          value={value || ""}
          onChange={(val) => onChange(val || undefined)}
          options={options}
          matchWidth
          className="w-full"
        />
      )}
      {credentials.length === 0 && !loading && (
        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 text-amber-400" /> Configure credentials under Settings &gt; Environment Variables.
        </p>
      )}
    </div>
  );
};
