import { Inbox } from "lucide-react";
import { uiStyles } from "@/lib/design-system";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`${uiStyles.surface} flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}
    >
      <Inbox className="w-10 h-10 text-slate-400 mb-3" aria-hidden />
      <h3 className="text-base font-semibold text-ui-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-ui-muted-foreground mt-1 max-w-sm">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className={`${uiStyles.primaryButton} mt-4 text-sm`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
