import { uiStyles } from "@/lib/design-system";

interface LoadingSkeletonProps {
  variant?: "card" | "chart" | "table" | "grid";
  rows?: number;
}

export function LoadingSkeleton({
  variant = "card",
  rows = 3,
}: LoadingSkeletonProps) {
  if (variant === "chart") {
    return (
      <div className={`${uiStyles.surface} min-w-0 p-6 xl:col-span-3`} role="status" aria-busy="true" aria-label="Loading chart">
        <div className={`${uiStyles.skeleton} h-6 w-48 mb-4`} />
        <div className={`${uiStyles.skeleton} h-80 w-full`} />
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={`${uiStyles.surface} p-6 space-y-3`} role="status" aria-busy="true" aria-label="Loading table">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={`${uiStyles.skeleton} h-12 w-full`} />
        ))}
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        role="status"
        aria-busy="true"
        aria-label="Loading fleet"
      >
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={`${uiStyles.surface} p-5`}>
            <div className={`${uiStyles.skeleton} h-5 w-24 mb-3`} />
            <div className={`${uiStyles.skeleton} h-4 w-full mb-2`} />
            <div className={`${uiStyles.skeleton} h-2 w-full`} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-3 gap-4"
      role="status"
      aria-busy="true"
      aria-label="Loading stats"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`${uiStyles.statCard}`}>
          <div className={`${uiStyles.skeleton} w-10 h-10 rounded-lg`} />
          <div className="flex-1 space-y-2">
            <div className={`${uiStyles.skeleton} h-4 w-24`} />
            <div className={`${uiStyles.skeleton} h-8 w-16`} />
          </div>
        </div>
      ))}
    </div>
  );
}
