import { Armchair, ChartLine, MessageCircle, QrCode } from "lucide-react";

const features = [
  { icon: ChartLine, title: "Demand forecast prototype", description: "A seven-day operational view combines historical ridership, holidays, and demo signals. Every forecast names its source." },
  { icon: Armchair, title: "Accessibility-first seating", description: "Required access needs are handled before optional affinity preferences, with explicit reasons for every recommendation." },
  { icon: QrCode, title: "Verified boarding passes", description: "Signed QR tokens support online and offline verification at the gate without presenting a payment claim." },
  { icon: MessageCircle, title: "Multilingual assistance", description: "Passenger help is available in English, Filipino, Bahasa Indonesia, and Vietnamese with clear fallback behavior." },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="bg-ui-canvas px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-ui-primary">Platform</p>
        <div className="mt-3 grid gap-6 border-b border-ui-border pb-10 lg:grid-cols-2 lg:items-end">
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Useful systems, clearly explained.</h2>
          <p className="max-w-2xl text-lg text-ui-muted-foreground lg:justify-self-end">TripSync separates demonstrated behavior from future ambition so passengers and operators always know what they can trust.</p>
        </div>
        <div className="divide-y divide-ui-border">
          {features.map(({ icon: Icon, title, description }, index) => (
            <article key={title} className="grid gap-4 py-7 sm:grid-cols-[48px_1fr] lg:grid-cols-[64px_0.7fr_1.3fr] lg:items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-ui-border bg-ui-surface text-ui-primary"><Icon className="h-6 w-6" aria-hidden /></div>
              <h3 className="font-heading text-xl font-semibold"><span className="mr-3 font-mono text-sm text-ui-muted-foreground">0{index + 1}</span>{title}</h3>
              <p className="max-w-2xl leading-7 text-ui-muted-foreground">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
