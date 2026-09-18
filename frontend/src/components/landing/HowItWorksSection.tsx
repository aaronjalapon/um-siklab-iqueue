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
    <section id="how-it-works" className="border-y border-ui-border bg-ui-surface px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-ui-warning/35 bg-ui-warning-surface px-3.5 py-1.5 text-sm font-bold text-ui-warning">
            <Route className="h-4 w-4" aria-hidden /> Passenger flow
          </div>
          <h2 className="mt-5 font-heading text-3xl font-semibold tracking-tight sm:text-5xl">From route search to gate-ready pass.</h2>
          <p className="mt-5 text-base leading-7 text-ui-muted-foreground sm:text-lg">Four transparent steps, with accessibility needs considered before optional seat preferences.</p>
        </div>

        <div className="relative mt-14">
          <div className="absolute left-[12.5%] right-[12.5%] top-10 hidden h-px bg-ui-border lg:block" aria-hidden="true" />
          <ol className="grid gap-4 lg:grid-cols-4 lg:gap-6">
            {steps.map(({ icon: Icon, title, body, tone }, index) => (
              <li key={title} className="process-card clay-surface relative z-10 flex items-center gap-4 rounded-2xl border border-ui-border bg-ui-canvas p-5 lg:flex-col lg:px-3 lg:text-center">
                <div className={`clay-inset relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border ${tone}`}>
                  <Icon className="h-7 w-7" aria-hidden />
                  <span className="absolute -right-2 -top-2 rounded-lg border border-ui-border bg-ui-surface px-1.5 py-0.5 font-mono text-[0.68rem] font-bold text-ui-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <div>
                  <h3 className="font-heading text-xl font-semibold">{title}</h3>
                  <p className="mt-2 leading-7 text-ui-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-12 text-center">
          <Link href="/buy" className="clay-action inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-ui-primary bg-ui-primary px-7 py-3 font-bold text-white hover:bg-ui-primary-hover dark:text-ui-navy sm:w-auto">
            Start a booking <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
