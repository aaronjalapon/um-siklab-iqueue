"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowRight,
  Armchair,
  BusFront,
  Calendar,
  Check,
  Clock3,
  Download,
  MapPin,
} from "lucide-react";
import { PWA_INSTALL_REQUEST_EVENT } from "@/lib/pwa-runtime";

const proof = [
  { full: "Accessibility-first seats", short: "Priority seats" },
  { full: "Signed QR passes", short: "Signed QR passes" },
  { full: "Four supported languages", short: "4 languages" },
];

export default function HeroSection() {
  function handleInstallApp() {
    window.dispatchEvent(new Event(PWA_INSTALL_REQUEST_EVENT));
  }

  const actionClass = "clay-interactive inline-flex min-h-11 sm:min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 sm:px-5 sm:py-3 text-center text-xs sm:text-sm lg:text-base font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300";

  return (
    <section
      id="hero"
      className="route-motif relative flex min-h-screen min-h-dvh w-full flex-col justify-center overflow-hidden bg-ui-canvas dark:bg-ui-navy px-4 pt-[4.5rem] pb-6 text-ui-foreground dark:text-white sm:px-6 sm:pb-8 lg:px-8 lg:pb-10"
    >
      <div className="mx-auto my-auto flex w-full max-w-7xl flex-col items-center justify-center lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(21rem,0.92fr)] lg:gap-14 xl:gap-16">
        {/* Hero Copy & Actions — Centered vertically & horizontally on mobile, elevated slightly upward */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left min-w-0 w-full order-1 -translate-y-5 sm:translate-y-0">
          <h1 className="max-w-3xl font-heading text-3xl xs:text-4xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold sm:font-bold leading-[1.15] tracking-tight text-ui-foreground dark:text-white">
            Board smart, <span className="text-blue-600 dark:text-cyan-300">travel smarter.</span>
          </h1>
          <p className="mt-2.5 sm:mt-4 lg:mt-6 max-w-md sm:max-w-2xl text-sm sm:text-base lg:text-xl leading-relaxed text-ui-muted-foreground dark:text-slate-300">
            Find inter-provincial buses, state your accessibility needs, choose a seat, and carry one verified boarding pass.
          </p>

          <div className="mt-6 sm:mt-8 grid w-full max-w-sm sm:max-w-md lg:max-w-2xl grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3.5">
            <Link href="/buy" className={`${actionClass} col-span-2 sm:col-span-1 clay-action border-blue-600 bg-blue-600 text-white hover:bg-blue-500 shadow-sm`}>
              Find a bus <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/operator" className={`${actionClass} border-ui-border bg-ui-surface text-ui-foreground hover:bg-ui-muted dark:border-white/25 dark:bg-white/10 dark:text-white dark:hover:bg-white/15`}>
              Operator demo <BusFront className="h-4 w-4" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={handleInstallApp}
              data-testid="hero-install-app"
              className={`${actionClass} border-orange-500/30 bg-orange-500/10 text-orange-800 hover:bg-orange-500/15 dark:border-orange-300/45 dark:bg-orange-400/10 dark:text-orange-100 dark:hover:bg-orange-400/15`}
            >
              Install app <Download className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <ul className="mt-4 sm:mt-6 lg:mt-8 flex flex-row flex-nowrap items-center justify-center lg:justify-start gap-x-2.5 sm:gap-x-5 text-[0.68rem] sm:text-sm text-ui-muted-foreground dark:text-slate-200">
            {proof.map((item) => (
              <li key={item.full} className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-cyan-300 shrink-0" aria-hidden />
                <span className="hidden sm:inline">{item.full}</span>
                <span className="sm:hidden font-medium">{item.short}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Authentic Gate Boarding Pass — Hidden on mobile screens, shown on tablet/desktop */}
        <div className="hero-ticket hidden sm:block mx-auto w-full sm:max-w-xs md:max-w-sm lg:max-w-md order-2 cursor-pointer" aria-label="TripSync verified boarding pass">
          <div className="clay-surface dark:clay-dark-panel relative overflow-hidden rounded-2xl sm:rounded-3xl border border-ui-border dark:border-white/15 bg-ui-surface dark:bg-slate-900 p-4 lg:p-6 shadow-md dark:shadow-2xl transition-shadow duration-300">
            {/* Pass Header */}
            <div className="flex items-center justify-between gap-1.5 border-b border-ui-border/70 dark:border-white/10 pb-2 sm:pb-3">
              <div className="flex items-center gap-1.5">
                <BusFront className="h-4 w-4 text-blue-600 dark:text-cyan-300 shrink-0" aria-hidden />
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-ui-foreground dark:text-white">TRIPSYNC BOARDING PASS</span>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 dark:border-emerald-400/30 dark:bg-emerald-400/10 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                Gate Ready
              </span>
            </div>

            {/* Center Highlight: High-Contrast Scannable QR Code */}
            <div className="my-3 sm:my-3.5 flex flex-col items-center justify-center">
              <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-3 sm:p-3.5 shadow-sm border border-slate-200/80 dark:border-white/10">
                <QRCodeSVG
                  value="TRIPSYNC:PASS:DVO-MNL:2026-09-21:SEAT-12A:GATE-VERIFIED"
                  size={128}
                  level="M"
                  className="h-28 w-28 sm:h-32 sm:w-32 lg:h-36 lg:w-36"
                  aria-label="TripSync Boarding Pass QR Code for Gate Scanning"
                />
              </div>
              <p className="mt-1 font-mono text-xs font-semibold text-blue-600 dark:text-cyan-300 tracking-wider">
                #TS-DVO-MNL-20260921
              </p>
            </div>

            {/* Perforation Line with Side Notches */}
            <div className="relative my-2 sm:my-2.5">
              <div className="absolute -left-5 sm:-left-6 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-ui-canvas dark:bg-ui-navy border-r border-ui-border dark:border-white/15" aria-hidden />
              <div className="border-t border-dashed border-ui-border/70 dark:border-white/15" />
              <div className="absolute -right-5 sm:-right-6 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-ui-canvas dark:bg-ui-navy border-l border-ui-border dark:border-white/15" aria-hidden />
            </div>

            {/* Route Codes Below QR */}
            <div className="flex items-center justify-center gap-3 sm:gap-5 py-1 sm:py-2 text-center">
              <div className="min-w-[4.5rem] sm:min-w-[5.25rem]">
                <p className="text-xs font-semibold text-ui-muted-foreground dark:text-slate-400">From</p>
                <p className="font-heading text-lg sm:text-xl lg:text-2xl font-bold text-ui-foreground dark:text-white leading-tight">DVO</p>
                <p className="flex items-center justify-center gap-1 text-xs text-ui-muted-foreground dark:text-slate-300">
                  <MapPin className="h-3 w-3 shrink-0 text-orange-500 dark:text-orange-400" aria-hidden /> Davao City
                </p>
              </div>
              <div className="flex flex-col items-center px-1 text-ui-muted-foreground dark:text-slate-400 shrink-0">
                <ArrowRight className="h-4 w-4 text-blue-600 dark:text-cyan-300" aria-hidden />
                <span className="text-[0.55rem] sm:text-[0.58rem] font-bold uppercase tracking-wide">Direct</span>
              </div>
              <div className="min-w-[4.5rem] sm:min-w-[5.25rem]">
                <p className="text-xs font-semibold text-ui-muted-foreground dark:text-slate-400">To</p>
                <p className="font-heading text-lg sm:text-xl lg:text-2xl font-bold text-ui-foreground dark:text-white leading-tight">MNL</p>
                <p className="flex items-center justify-center gap-1 text-xs text-ui-muted-foreground dark:text-slate-300">
                  <MapPin className="h-3 w-3 shrink-0 text-cyan-600 dark:text-cyan-300" aria-hidden /> Manila
                </p>
              </div>
            </div>

            {/* Travel Details Grid */}
            <div className="grid grid-cols-3 gap-1 sm:gap-1.5 pt-1.5 sm:pt-2 border-t border-ui-border/60 dark:border-white/10 text-center">
              <div className="rounded-lg sm:rounded-xl border border-ui-border/60 bg-ui-surface-soft dark:border-white/5 dark:bg-slate-800/90 p-1 sm:p-1.5 shadow-sm">
                <Calendar className="mx-auto h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600 dark:text-blue-300" aria-hidden />
                <p className="mt-0.5 text-[0.55rem] sm:text-[0.58rem] text-ui-muted-foreground dark:text-slate-400">Date</p>
                <p className="text-xs font-bold text-ui-foreground dark:text-white">Sep 21, 2026</p>
              </div>
              <div className="rounded-lg sm:rounded-xl border border-ui-border/60 bg-ui-surface-soft dark:border-white/5 dark:bg-slate-800/90 p-1 sm:p-1.5 shadow-sm">
                <Clock3 className="mx-auto h-3 w-3 sm:h-3.5 sm:w-3.5 text-orange-500 dark:text-orange-300" aria-hidden />
                <p className="mt-0.5 text-[0.55rem] sm:text-[0.58rem] text-ui-muted-foreground dark:text-slate-400">Departure</p>
                <p className="text-xs font-bold text-ui-foreground dark:text-white">06:00 AM</p>
              </div>
              <div className="rounded-lg sm:rounded-xl border border-ui-border/60 bg-ui-surface-soft dark:border-white/5 dark:bg-slate-800/90 p-1 sm:p-1.5 shadow-sm">
                <Armchair className="mx-auto h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-600 dark:text-emerald-300" aria-hidden />
                <p className="mt-0.5 text-[0.55rem] sm:text-[0.58rem] text-ui-muted-foreground dark:text-slate-400">Seat</p>
                <p className="text-xs font-bold text-ui-foreground dark:text-white">12A</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
