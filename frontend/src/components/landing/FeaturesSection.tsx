import { Armchair, ChartLine, Layers3, MessageCircle, QrCode, type LucideIcon } from "lucide-react";

type Feature = {
  icon: LucideIcon;
  title: string;
  label: string;
  description: string;
  accent: string;
  iconStyle: string;
};

const features: Feature[] = [
  {
    icon: ChartLine,
    title: "Demand forecast prototype",
    label: "7-day scenario",
    description: "A seven-day operational view combines historical ridership, holidays, and demo signals. Every forecast names its source.",
    accent: "border-blue-400/45 bg-ui-surface",
    iconStyle: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  },
  {
    icon: Armchair,
    title: "Accessibility-first seating",
    label: "Needs before preferences",
    description: "Required access needs are handled before optional affinity preferences, with explicit reasons for every recommendation.",
    accent: "border-violet-400/45 bg-ui-surface",
    iconStyle: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  },
  {
    icon: QrCode,
    title: "Verified boarding passes",
    label: "Offline-ready",
    description: "Signed QR tokens support online and offline verification at the gate without presenting a payment claim.",
    accent: "border-orange-400/45 bg-ui-surface",
    iconStyle: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  },
  {
    icon: MessageCircle,
    title: "Multilingual assistance",
    label: "4 languages",
    description: "Passenger help is available in English, Filipino, Bahasa Indonesia, and Vietnamese with clear fallback behavior.",
    accent: "border-emerald-400/45 bg-ui-surface",
    iconStyle: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="bg-ui-canvas px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-ui-primary/30 bg-ui-primary/10 px-3.5 py-1.5 text-sm font-bold text-ui-primary">
            <Layers3 className="h-4 w-4" aria-hidden /> Platform features
          </div>
          <h2 className="mt-5 font-heading text-3xl font-semibold tracking-tight sm:text-5xl">Four useful systems. One clear journey.</h2>
          <p className="mt-5 text-base leading-7 text-ui-muted-foreground sm:text-lg">
            TripSync separates demonstrated behavior from future ambition so passengers and operators always know what they can trust.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {features.map(({ icon: Icon, title, label, description, accent, iconStyle }, index) => (
            <article key={title} className={`feature-card clay-surface flex min-h-72 flex-col rounded-2xl border p-5 sm:p-6 ${accent}`}>
              <div className="flex items-center justify-between gap-3">
                <div className={`clay-inset flex h-12 w-12 items-center justify-center rounded-xl border border-current/15 ${iconStyle}`}>
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <span className="clay-badge rounded-full border border-ui-border bg-ui-surface/80 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-ui-muted-foreground">{label}</span>
              </div>
              <div className="mt-auto pt-10">
                <p className="font-mono text-xs font-bold text-ui-muted-foreground">0{index + 1}</p>
                <h3 className="mt-3 font-heading text-xl font-semibold">{title}</h3>
                <p className="mt-3 leading-7 text-ui-muted-foreground">{description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
