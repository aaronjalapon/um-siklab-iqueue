import Link from "next/link";
import { ArrowRight, BusFront, Check, QrCode, ShieldCheck } from "lucide-react";
import { uiStyles } from "@/lib/design-system";

const proof = ["Accessibility-first seats", "Signed QR passes", "Four supported languages"];

export default function HeroSection() {
  return (
    <section id="hero" className="route-motif bg-ui-navy px-4 pb-16 pt-28 text-white sm:px-6 sm:pb-20 sm:pt-32 lg:px-8 lg:py-36">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="min-w-0">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-300/30 px-3 py-1.5 text-sm font-semibold text-blue-100">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Service prototype · Davao pilot routes
          </div>
          <h1 className="max-w-3xl font-heading text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">Board smart, travel smarter.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">Find inter-provincial buses, state your accessibility needs, choose a seat, and carry one verified boarding pass.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/buy" className={`${uiStyles.primaryButton} px-6`}>Find a bus <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            <Link href="/operator" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/30 px-6 py-2 font-semibold text-white transition-colors hover:bg-white/10">View operator demo</Link>
          </div>
          <ul className="mt-8 flex flex-col gap-3 text-sm text-slate-200 sm:flex-row sm:flex-wrap sm:gap-5">
            {proof.map((item) => <li key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-300" aria-hidden />{item}</li>)}
          </ul>
        </div>
        <div className="min-w-0 rounded-xl border border-slate-300 bg-white p-4 text-slate-950 sm:p-6" aria-label="TripSync booking preview">
          <div className="flex min-w-0 items-center justify-between gap-2 border-b border-slate-300 pb-4">
            <div className="min-w-0"><p className="text-sm font-semibold text-slate-600">Sample journey</p><p className="font-heading text-base font-semibold text-slate-950 sm:text-lg">Davao City → Cagayan de Oro</p></div>
            <BusFront className="h-7 w-7 shrink-0 text-blue-600" aria-hidden />
          </div>
          <div className="grid gap-3 py-5 sm:grid-cols-3">
            <div className="min-w-0 rounded-lg bg-slate-100 p-3 text-slate-950 dark:bg-slate-800 dark:text-white"><p className="text-xs font-semibold uppercase tracking-wide text-ui-muted-foreground">Departure</p><p className="mt-1 font-semibold">06:00</p></div>
            <div className="min-w-0 rounded-lg bg-slate-100 p-3 text-slate-950 dark:bg-slate-800 dark:text-white"><p className="text-xs font-semibold uppercase tracking-wide text-ui-muted-foreground">Seat</p><p className="mt-1 font-semibold">12A · Window</p></div>
            <div className="min-w-0 rounded-lg bg-slate-100 p-3 text-slate-950 dark:bg-slate-800 dark:text-white"><p className="text-xs font-semibold uppercase tracking-wide text-ui-muted-foreground">Pass</p><p className="mt-1 flex items-center gap-1.5 font-semibold"><QrCode className="h-4 w-4 shrink-0" aria-hidden /> Signed QR</p></div>
          </div>
          <div className="border-t border-slate-300 pt-4 text-sm text-slate-600">This portfolio demonstrates booking, seat allocation, and gate verification. It does not process payments.</div>
        </div>
      </div>
    </section>
  );
}
