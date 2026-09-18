import Link from "next/link";
import { ArrowRight, Armchair, QrCode, Route, Search, SlidersHorizontal, type LucideIcon } from "lucide-react";

type Step = {
  icon: LucideIcon;
  title: string;
  body: string;
  tone: string;
};

const steps: Step[] = [
  { icon: Search, title: "Search", body: "Choose your origin, destination, and local travel date.", tone: "border-blue-400/35 bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  { icon: SlidersHorizontal, title: "Preferences", body: "Tell us about accessibility needs and optional seat preferences.", tone: "border-violet-400/35 bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  { icon: Armchair, title: "Seat", body: "Review the recommendation and select the seat that works for you.", tone: "border-orange-400/35 bg-orange-500/10 text-orange-700 dark:text-orange-300" },
  { icon: QrCode, title: "Pass", body: "Confirm the booking and receive a signed QR boarding pass.", tone: "border-emerald-400/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
];

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative flex min-h-screen min-h-dvh w-full flex-col justify-center overflow-hidden bg-ui-surface px-4 pt-[4.5rem] pb-4 text-ui-foreground sm:px-6 sm:pb-8 lg:px-8 lg:pb-10"
    >
      <div className="mx-auto my-auto flex w-full max-w-7xl flex-col justify-center">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-ui-warning/35 bg-ui-warning-surface px-3 py-1 text-xs sm:text-sm font-bold text-ui-warning">
            <Route className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden /> Passenger flow
          </div>
          <h2 className="mt-1.5 sm:mt-4 font-heading text-xl sm:text-3xl lg:text-4xl xl:text-5xl font-semibold tracking-tight">
            From route search to gate-ready pass.
          </h2>
          <p className="mt-1 sm:mt-3 text-xs sm:text-base lg:text-lg text-ui-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Four transparent steps, with accessibility needs considered before optional seat preferences.
          </p>
        </div>

        <div className="relative mt-4 sm:mt-8 lg:mt-10">
          <div className="absolute left-[12.5%] right-[12.5%] top-10 hidden h-px bg-ui-border lg:block" aria-hidden="true" />
          <ol className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4 lg:gap-6">
            {steps.map(({ icon: Icon, title, body, tone }, index) => (
              <li
                key={title}
                className="process-card clay-surface relative z-10 flex flex-col justify-between rounded-xl sm:rounded-2xl border border-ui-border bg-ui-canvas p-2.5 sm:p-5 lg:text-center min-h-[9.5rem] sm:min-h-56"
              >
                <div className="flex items-center justify-between lg:justify-center w-full">
                  <div className={`clay-inset relative flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl border ${tone}`}>
                    <Icon className="h-4 w-4 sm:h-6 sm:w-6" aria-hidden />
                  </div>
                  <span className="rounded-md border border-ui-border bg-ui-surface px-1.5 py-0.5 font-mono text-[0.6rem] sm:text-xs font-bold text-ui-muted-foreground lg:hidden">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="mt-2 sm:mt-4">
                  <span className="hidden lg:inline-block font-mono text-xs font-bold text-ui-muted-foreground mb-1">
                    Step {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-heading text-xs sm:text-base lg:text-lg font-semibold">{title}</h3>
                  <p className="mt-1 text-[0.62rem] sm:text-xs lg:text-sm text-ui-muted-foreground leading-normal line-clamp-2 sm:line-clamp-none">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-4 sm:mt-8 text-center">
          <Link
            href="/buy"
            className="clay-action inline-flex min-h-10 sm:min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-ui-primary bg-ui-primary px-5 py-2 sm:px-7 sm:py-3 text-xs sm:text-sm lg:text-base font-bold text-white hover:bg-ui-primary-hover dark:text-ui-navy"
          >
            Start a booking <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
