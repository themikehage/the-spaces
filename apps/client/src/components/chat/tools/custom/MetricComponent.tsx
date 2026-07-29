// SPDX-License-Identifier: MIT
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

interface MetricProps {
  label: string;
  value: string;
  trend?: "up" | "down" | "neutral";
  subtitle?: string;
}

export function MetricComponent({ label, value, trend, subtitle }: MetricProps) {
  const trendConfig = {
    up: {
      color: "text-success",
      icon: <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />,
    },
    down: {
      color: "text-error",
      icon: <ArrowDownRight className="w-3.5 h-3.5" strokeWidth={2.5} />,
    },
    neutral: {
      color: "text-muted-foreground",
      icon: <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />,
    },
  };

  return (
    <div className="bg-card text-card-foreground border border-border rounded-lg p-4 shadow-sm flex flex-col justify-between gap-1 min-w-[120px]">
      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
        {trend && trendConfig[trend] && (
          <span
            className={`inline-flex items-center ${trendConfig[trend].color}`}
            title={`Trend: ${trend}`}
          >
            {trendConfig[trend].icon}
          </span>
        )}
      </div>
      {subtitle && <span className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</span>}
    </div>
  );
}
