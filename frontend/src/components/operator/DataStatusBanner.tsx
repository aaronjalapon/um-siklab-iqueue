import { AlertCircle } from "lucide-react";

interface DataStatusBannerProps {
  message?: string;
}

export function DataStatusBanner({
  message = "Showing demo data — connect the backend to see live metrics.",
}: DataStatusBannerProps) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
      <p>{message}</p>
    </div>
  );
}
