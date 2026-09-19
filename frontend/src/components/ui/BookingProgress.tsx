import { Check, Circle } from "lucide-react";

export type BookingStep = "search" | "preferences" | "seat" | "pass";

const STEPS: { id: BookingStep; label: string }[] = [
  { id: "search", label: "Search" },
  { id: "preferences", label: "Preferences" },
  { id: "seat", label: "Seat" },
  { id: "pass", label: "Pass" },
];

interface BookingProgressProps {
  current: BookingStep;
}

export function BookingProgress({ current }: BookingProgressProps) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <nav aria-label="Booking progress" className="w-full">
      <ol className="clay-inset relative grid grid-cols-4 gap-0.5 sm:gap-2 overflow-hidden rounded-xl sm:rounded-2xl border border-ui-border bg-ui-surface-soft p-1 pb-2 sm:p-2 sm:pb-3 text-[9px] sm:text-xs">
        <span aria-hidden className="absolute inset-x-1.5 sm:inset-x-2 bottom-0.5 sm:bottom-1 h-0.5 overflow-hidden rounded-full bg-ui-muted">
          <span className="route-reveal block h-full rounded-full bg-ui-primary" style={{ width: `${Math.max(0, (currentIndex / (STEPS.length - 1)) * 100)}%` }} />
        </span>
        {STEPS.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isDone = index < currentIndex;
          const Icon = isDone ? Check : Circle;

          return (
            <li
              key={step.id}
              className={`relative z-10 flex min-w-0 items-center justify-center gap-0.5 rounded-md sm:rounded-lg px-0.5 py-1 sm:px-2 sm:py-2 font-semibold transition-colors duration-200 sm:gap-1.5 ${
                isCurrent
                  ? "clay-action bg-ui-primary text-white dark:text-ui-navy"
                  : isDone
                    ? "clay-inset bg-ui-success-surface text-ui-success"
                    : "text-ui-muted-foreground"
              }`}
              aria-current={isCurrent ? "step" : undefined}
            >
              <Icon className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
