import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string | number;
  delta?: string;
  icon?: ReactNode;
  tone?: "default" | "brand" | "success" | "warning" | "danger";
}

const tones: Record<NonNullable<Props["tone"]>, string> = {
  default: "from-slate-50 to-white text-slate-700",
  brand: "from-brand-50 to-white text-brand-700",
  success: "from-emerald-50 to-white text-emerald-700",
  warning: "from-amber-50 to-white text-amber-700",
  danger: "from-rose-50 to-white text-rose-700",
};

export function StatCard({ label, value, delta, icon, tone = "default" }: Props) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br p-5 shadow-card",
        tones[tone],
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
          {delta && (
            <p className="mt-1 text-xs font-medium text-slate-500">{delta}</p>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-current shadow-sm">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
