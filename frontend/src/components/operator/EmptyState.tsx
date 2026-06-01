import { Inbox } from "lucide-react";
import { glassStyles } from "@/lib/design-system";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div
      className={`${glassStyles.panel} flex flex-col items-center justify-center py-12 px-6 text-center`}
    >
      <Inbox className="w-10 h-10 text-slate-400 mb-3" aria-hidden />
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className={`${glassStyles.primaryButton} mt-4 text-sm`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
