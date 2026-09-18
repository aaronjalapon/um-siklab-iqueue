import type { LucideIcon } from "lucide-react";
import { uiStyles } from "@/lib/design-system";

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
  iconClassName = "text-ui-primary",
  className = "",
}: StatCardProps) {
  return (
    <div className={`${uiStyles.statCard} ${className}`}>
      <Icon className={`w-8 h-8 shrink-0 ${iconClassName}`} aria-hidden />
      <div>
        <p className="text-sm text-ui-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-ui-foreground">{value}</p>
      </div>
    </div>
  );
}
