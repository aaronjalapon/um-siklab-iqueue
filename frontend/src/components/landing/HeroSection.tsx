"use client";

import Link from "next/link";
import {
  ArrowRight,
  Armchair,
  BusFront,
  Check,
  Clock3,
  Download,
  MapPin,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { PWA_INSTALL_REQUEST_EVENT } from "@/lib/pwa-runtime";

const proof = ["Accessibility-first seats", "Signed QR passes", "Four supported languages"];

export default function HeroSection() {
  function handleInstallApp() {
    window.dispatchEvent(new Event(PWA_INSTALL_REQUEST_EVENT));
  }

  const actionClass = "clay-interactive inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border px-5 py-3 text-center text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:text-base";

  return (
    <section id="hero" className="route-motif relative overflow-hidden bg-ui-navy px-4 pb-20 pt-28 text-white sm:px-6 sm:pb-24 sm:pt-32 lg:px-8 lg:pb-28 lg:pt-36">
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[minmax(0,1.08fr)_minmax(21rem,0.92fr)] lg:gap-16">
        <div className="min-w-0 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-blue-400/10 px-3.5 py-1.5 text-sm font-bold text-blue-100 backdrop-blur-sm">
            <ShieldCheck className="h-4 w-4 text-blue-300" aria-hidden />
            Service prototype · Davao pilot routes
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl font-heading text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:mx-0 lg:text-6xl">
            Board smart, <span className="text-cyan-300">travel smarter.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl lg:mx-0">
            Find inter-provincial buses, state your accessibility needs, choose a seat, and carry one verified boarding pass.
          </p>

          <div className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-3 lg:mx-0">
            <Link href="/buy" className={`${actionClass} clay-action border-blue-500 bg-blue-600 text-white hover:bg-blue-500`}>
              Find a bus <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/operator" className={`${actionClass} border-white/25 bg-white/10 text-white hover:bg-white/15`}>
              Operator demo <BusFront className="h-4 w-4" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={handleInstallApp}
              data-testid="hero-install-app"
              className={`${actionClass} border-orange-300/45 bg-orange-400/10 text-orange-100 hover:bg-orange-400/15`}
            >
              Install app <Download className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <ul className="mt-8 flex flex-col justify-center gap-3 text-sm text-slate-200 sm:flex-row sm:flex-wrap sm:gap-5 lg:justify-start">
            {proof.map((item) => (
              <li key={item} className="flex items-center justify-center gap-2 lg:justify-start">
                <Check className="h-4 w-4 text-cyan-300" aria-hidden /> {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="hero-ticket mx-auto w-full max-w-md" aria-label="TripSync booking preview">
          <div className="clay-dark-panel relative overflow-hidden rounded-3xl border border-white/15 bg-slate-900 p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">TripSync sample pass</p>
                <p className="mt-1 font-heading text-lg font-semibold text-white">Davao City → Cagayan de Oro</p>
              </div>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-300">Verified</span>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-6">
              <div>
                <p className="text-xs font-semibold text-slate-400">From</p>
                <p className="mt-1 font-heading text-3xl font-semibold text-white">DVO</p>
                <p className="mt-1 flex items-center gap-1 text-sm text-slate-300"><MapPin className="h-3.5 w-3.5 text-orange-400" aria-hidden /> Davao City</p>
              </div>
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <BusFront className="h-5 w-5 text-cyan-300" aria-hidden />
                <span className="text-[0.68rem] font-bold uppercase tracking-wide">Pilot route</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-400">To</p>
                <p className="mt-1 font-heading text-3xl font-semibold text-white">CDO</p>
                <p className="mt-1 flex items-center justify-end gap-1 text-sm text-slate-300"><MapPin className="h-3.5 w-3.5 text-cyan-300" aria-hidden /> Cagayan de Oro</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-y border-dashed border-white/15 py-4 text-center">
              <div className="rounded-xl border border-white/5 bg-slate-800 p-3 shadow-[inset_3px_3px_8px_rgba(0,0,0,0.28),inset_-2px_-2px_6px_rgba(120,155,205,0.08)]">
                <Clock3 className="mx-auto h-4 w-4 text-blue-300" aria-hidden />
                <p className="mt-1 text-xs text-slate-400">Departure</p><p className="font-bold text-white">06:00</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-slate-800 p-3 shadow-[inset_3px_3px_8px_rgba(0,0,0,0.28),inset_-2px_-2px_6px_rgba(120,155,205,0.08)]">
                <Armchair className="mx-auto h-4 w-4 text-orange-300" aria-hidden />
                <p className="mt-1 text-xs text-slate-400">Seat</p><p className="font-bold text-white">12A</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-slate-800 p-3 shadow-[inset_3px_3px_8px_rgba(0,0,0,0.28),inset_-2px_-2px_6px_rgba(120,155,205,0.08)]">
                <QrCode className="mx-auto h-4 w-4 text-emerald-300" aria-hidden />
                <p className="mt-1 text-xs text-slate-400">Pass</p><p className="font-bold text-white">Signed QR</p>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-xl border border-blue-300/20 bg-blue-400/10 p-3 text-sm leading-6 text-blue-100">
              <ShieldCheck className="h-5 w-5 shrink-0 text-blue-300" aria-hidden />
              Sample data only. This portfolio does not process payments or expose live transport inventory.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
