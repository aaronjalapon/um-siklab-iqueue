import { Armchair, ChartLine, Layers3, MessageCircle, QrCode, type LucideIcon } from "lucide-react";

type Feature = {
  icon: LucideIcon;
  title: string;
  label: string;
  shortLabel: string;
  description: string;
  accent: string;
  iconStyle: string;
};

const features: Feature[] = [
  {
    icon: ChartLine,
    title: "Demand forecast prototype",
    label: "7-day scenario",
    shortLabel: "7-day view",
    description: "A seven-day operational view combines historical ridership, holidays, and demo signals. Every forecast names its source.",
    accent: "border-blue-400/35 bg-ui-surface",
    iconStyle: "bg-gradient-to-b from-blue-500/20 to-blue-600/10 dark:from-blue-400/25 dark:to-blue-600/15 text-blue-600 dark:text-blue-300 border-blue-400/40 shadow-[0_6px_16px_rgba(37,99,235,0.2),inset_0_1px_0_rgba(255,255,255,0.25)]",
  },
  {
    icon: Armchair,
    title: "Accessibility-first seating",
    label: "Needs before preferences",
    shortLabel: "Needs-first",
    description: "Required access needs are handled before optional affinity preferences, with explicit reasons for every recommendation.",
    accent: "border-violet-400/35 bg-ui-surface",
    iconStyle: "bg-gradient-to-b from-violet-500/20 to-violet-600/10 dark:from-violet-400/25 dark:to-violet-600/15 text-violet-700 dark:text-violet-300 border-violet-400/40 shadow-[0_6px_16px_rgba(139,92,246,0.2),inset_0_1px_0_rgba(255,255,255,0.25)]",
  },
  {
    icon: QrCode,
    title: "Verified boarding passes",
    label: "Offline-ready",
    shortLabel: "Offline",
    description: "Signed QR tokens support online and offline verification at the gate without presenting a payment claim.",
    accent: "border-orange-400/35 bg-ui-surface",
    iconStyle: "bg-gradient-to-b from-orange-500/20 to-orange-600/10 dark:from-orange-400/25 dark:to-orange-600/15 text-orange-700 dark:text-orange-300 border-orange-400/40 shadow-[0_6px_16px_rgba(249,115,22,0.2),inset_0_1px_0_rgba(255,255,255,0.25)]",
  },
  {
    icon: MessageCircle,
    title: "Multilingual assistance",
    label: "4 languages",
    shortLabel: "4 languages",
    description: "Passenger help is available in English, Filipino, Bahasa Indonesia, and Vietnamese with clear fallback behavior.",
    accent: "border-emerald-400/35 bg-ui-surface",
    iconStyle: "bg-gradient-to-b from-emerald-500/20 to-emerald-600/10 dark:from-emerald-400/25 dark:to-emerald-600/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/40 shadow-[0_6px_16px_rgba(16,185,129,0.2),inset_0_1px_0_rgba(255,255,255,0.25)]",
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative flex min-h-screen min-h-dvh w-full flex-col justify-center overflow-hidden bg-ui-canvas px-4 pt-[4.5rem] pb-6 text-ui-foreground sm:px-6 sm:pb-8 lg:px-8 lg:pb-10"
    >
      <div className="mx-auto my-auto flex w-full max-w-7xl flex-col justify-center">
        {/* Section Header — Centered on Mobile, Blocked Left on Desktop */}
        <div className="flex flex-col items-center text-center mx-auto max-w-3xl sm:items-start sm:text-left sm:mx-0">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-ui-primary/30 bg-ui-primary/10 px-3 py-1 text-xs sm:text-sm font-bold text-ui-primary">
            <Layers3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden /> Features
          </div>
          <h2 className="mt-2.5 sm:mt-4 font-heading text-2xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-ui-foreground">
            Four useful systems. One clear journey.
          </h2>
          <p className="mt-2 sm:mt-3 text-xs sm:text-base lg:text-lg text-ui-muted-foreground leading-relaxed">
            TripSync separates demonstrated behavior from future ambition so passengers and operators always know what they can trust.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-6 sm:mt-10 lg:mt-12 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4 lg:gap-5">
          {features.map(({ icon: Icon, title, label, shortLabel, description, accent, iconStyle }, index) => (
            <article
              key={title}
              className={`feature-card clay-surface group flex min-h-[11rem] sm:min-h-64 lg:min-h-76 flex-col justify-between rounded-xl sm:rounded-2xl border p-2.5 xs:p-3 sm:p-5 lg:p-6 overflow-hidden ${accent}`}
            >
              {/* Top Row: Outward-Displaying Tactile Icon + Responsive Badge */}
              <div className="flex items-center justify-between gap-1.5 sm:gap-3">
                <div className={`relative flex h-8 w-8 xs:h-9 xs:w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105 ${iconStyle}`}>
                  <Icon className="h-4 w-4 sm:h-6 sm:w-6 drop-shadow-sm" aria-hidden />
                </div>
                <span className="clay-badge min-w-0 max-w-[calc(100%-2.5rem)] sm:max-w-none truncate rounded-full border border-ui-border bg-ui-surface/80 px-1.5 xs:px-2 py-0.5 sm:px-2.5 sm:py-1 text-[0.52rem] sm:text-[0.68rem] font-bold uppercase tracking-wide text-ui-muted-foreground">
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{shortLabel}</span>
                </span>
              </div>

              {/* Bottom Area: Step number, aligned title, and description */}
              <div className="pt-3 sm:pt-6 text-left">
                <p className="font-mono text-[0.6rem] sm:text-xs font-bold text-ui-muted-foreground">0{index + 1}</p>
                <h3 className="mt-1 sm:mt-2 font-heading text-xs sm:text-base lg:text-lg font-semibold leading-snug min-h-[2rem] sm:min-h-[2.8rem] flex items-center text-ui-foreground">
                  {title}
                </h3>
                <p className="mt-1 sm:mt-2 text-[0.62rem] sm:text-xs lg:text-sm leading-normal text-ui-muted-foreground line-clamp-2 sm:line-clamp-none">
                  {description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
