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
      <ol className="grid grid-cols-4 gap-1 rounded-xl border border-ui-border bg-ui-surface p-1.5 text-[10px] sm:gap-2 sm:p-2 sm:text-xs">
        {STEPS.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isDone = index < currentIndex;
          const Icon = isDone ? Check : Circle;

          return (
            <li
              key={step.id}
              className={`flex min-w-0 items-center justify-center gap-0.5 sm:gap-1.5 rounded-lg sm:rounded-xl px-1 py-1.5 sm:px-2 sm:py-2 font-semibold ${
                isCurrent
                  ? "bg-ui-primary text-white"
                  : isDone
                    ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-200"
                    : "text-ui-muted-foreground"
              }`}
              aria-current={isCurrent ? "step" : undefined}
            >
              <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
