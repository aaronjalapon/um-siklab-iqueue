import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { uiStyles } from "@/lib/design-system";

const steps = [
  ["Search", "Choose your origin, destination, and local travel date."],
  ["Preferences", "Tell us about accessibility needs and optional seat preferences."],
  ["Seat", "Review the recommendation and select the seat that works for you."],
  ["Pass", "Confirm the booking and receive a signed QR boarding pass."],
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-white px-4 py-20 text-slate-900 dark:bg-ui-surface dark:text-ui-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-ui-primary">Choose & confirm</p>
        <h2 className="mt-3 max-w-2xl font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Four steps from route search to gate-ready pass.</h2>
        <ol className="mt-12 grid gap-8 border-t border-ui-border pt-8 md:grid-cols-4">
          {steps.map(([title, body], index) => <li key={title} className="relative"><span className="font-mono text-sm font-bold text-ui-primary">{String(index + 1).padStart(2, "0")}</span><h3 className="mt-4 font-heading text-xl font-semibold">{title}</h3><p className="mt-2 leading-7 text-ui-muted-foreground">{body}</p></li>)}
        </ol>
        <Link href="/buy" className={`${uiStyles.primaryButton} mt-10 w-full sm:w-auto`}>Start a booking <ArrowRight className="h-4 w-4" aria-hidden /></Link>
      </div>
    </section>
  );
}
