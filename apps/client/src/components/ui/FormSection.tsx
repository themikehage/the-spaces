// SPDX-License-Identifier: MIT
import type { FC, ReactNode } from "react";

export interface FormSectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export const FormSection: FC<FormSectionProps> = ({
  title,
  description,
  action,
  className = "",
  children,
}) => {
  return (
    <section
      className={`bg-card/50 border border-input rounded-2xl p-5 flex flex-col gap-4 ${className}`}
    >
      <div className="flex items-start justify-between pb-3 border-b border-input">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>

      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
};
