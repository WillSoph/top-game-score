import type { ReactNode } from "react";

type Props = {
  label: string;
  value: string | number;
  icon: ReactNode;
  iconColor?: string;
  change?: string;
};

export default function StatCard({
  label,
  value,
  icon,
  iconColor = "text-emerald-400",
  change,
}: Props) {
  return (
    <div className="rounded-2xl border border-[#29435C] bg-gradient-to-br from-[#102C39] to-[#101A32] p-5 shadow-lg shadow-black/10">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 ${iconColor}`}
        >
          {icon}
        </div>

        <span className="text-sm font-medium text-slate-200">{label}</span>
      </div>

      <div className="mt-4 text-3xl font-bold tracking-tight text-white">
        {value}
      </div>

      {change && (
        <p className="mt-2 text-xs font-medium text-emerald-400">{change}</p>
      )}
    </div>
  );
}
