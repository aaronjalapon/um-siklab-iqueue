import type { LucideIcon } from "lucide-react";
import { glassStyles } from "@/lib/design-system";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  iconClassName?: string;
  className?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  iconClassName = "text-brand-blue",
  className = "",
}: StatCardProps) {
  return (
    <div className={`${glassStyles.statCard} ${className}`}>
      <Icon className={`w-8 h-8 shrink-0 ${iconClassName}`} aria-hidden />
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
