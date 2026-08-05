// SPDX-License-Identifier: MIT
import type { FC, ReactNode } from "react";

export interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export const FormField: FC<FormFieldProps> = ({
  label,
  error,
  hint,
  required,
  className = "",
  children,
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1">
        <span>{label}</span>
        {required && <span className="text-destructive font-bold">*</span>}
      </label>

      {children}

      {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}

      {error && <p className="text-[11px] text-destructive font-medium">{error}</p>}
    </div>
  );
};
