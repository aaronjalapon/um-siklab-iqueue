"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  MapPin,
  QrCode,
  TrendingUp,
  Zap,
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import { PWA_INSTALL_REQUEST_EVENT } from "@/lib/pwa-runtime";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const floatingCard = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};

export default function HeroSection() {
  function handleInstallApp() {
    window.dispatchEvent(new Event(PWA_INSTALL_REQUEST_EVENT));
  }

  return (
    <section id="hero" className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 pb-14 pt-20 sm:pt-24 md:pb-16">
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-20">
        {/* Left: Text */}
        <div className="text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-brand-blue/15 border border-brand-blue/30 text-brand-blue text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-full mb-5 max-w-full text-center backdrop-blur-sm"
          >
            <Zap className="w-3.5 h-3.5" />
            {BRAND.name} · AI-Powered Smart Boarding for ASEAN
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-4 text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-tight text-white tracking-tight"
          >
            Board smart,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-cyan-400">
              travel smarter.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mb-7 max-w-xl text-base sm:text-lg lg:mx-0 lg:text-xl leading-relaxed text-slate-300 font-normal"
          >
            AI-powered seat allocation, QR boarding passes, and demand forecasting — all in one platform built for inter-provincial bus terminals.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4 justify-center lg:justify-start"
          >
            <Link
              id="hero-book-now"
              href="/buy"
              className="group inline-flex min-h-[52px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-brand-blue px-7 py-4 text-base font-bold text-white shadow-xl shadow-brand-blue/30 transition-all hover:bg-blue-600 hover:shadow-brand-blue/50 active:scale-[0.98]"
            >
              Book Your Seat
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button
              id="hero-install-app"
              type="button"
              onClick={handleInstallApp}
              className="group inline-flex min-h-[52px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-brand-orange px-7 py-4 text-base font-bold text-white shadow-xl shadow-brand-orange/25 transition-all hover:bg-orange-600 hover:shadow-brand-orange/40 active:scale-[0.98]"
            >
              <Download className="h-5 w-5 transition-transform group-hover:translate-y-0.5" />
              Install the App
            </button>
            <Link
              id="hero-operator-login"
              href="/operator"
              className="inline-flex min-h-[52px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-white/20 bg-slate-900/40 px-7 py-4 text-base font-semibold text-slate-200 backdrop-blur-sm transition-all hover:border-white/40 hover:text-white active:scale-[0.98]"
            >
              Operator Dashboard
            </Link>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-8 lg:justify-start"
          >
            {[
              { value: "7-Day", label: "Surge Forecast" },
              { value: "4", label: "ASEAN Languages" },
              { value: "≥70%", label: "Surge Accuracy" },
            ].map((stat) => (
              <div key={stat.label} className="text-center lg:text-left">
                <p className="text-2xl sm:text-3xl font-black text-white">{stat.value}</p>
                <p className="text-slate-300 text-xs sm:text-sm font-semibold mt-0.5">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: Floating UI mockup */}
        <motion.div
          variants={floatingCard}
          initial="hidden"
          animate="visible"
          className="relative flex items-center justify-center px-2 sm:px-4"
        >
          {/* Unified Floating Assembly — Entire card and badges move as one solid object */}
          <div className="animate-float-smooth relative w-full max-w-[20.5rem] sm:max-w-[22rem]">
            {/* Ambient glow behind card */}
            <div className="absolute -inset-2 bg-brand-blue/25 rounded-3xl blur-2xl transform-gpu pointer-events-none" />

            {/* Main ticket card */}
            <div className="relative w-full rounded-3xl border border-white/15 bg-slate-900/90 p-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-md sm:p-6">
              {/* Card header */}
              <div className="flex justify-between items-center mb-5">
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{BRAND.name} Boarding Pass</p>
                  <p className="text-white font-bold text-sm sm:text-base mt-0.5">Mon, 21 Sep 2026</p>
                </div>
                <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full">
                  Confirmed
                </span>
              </div>

              {/* Route */}
              <div className="flex items-center justify-between gap-2 sm:gap-3 mb-5">
                <div className="flex flex-col items-start">
                  <p className="text-slate-400 text-xs font-medium">From</p>
                  <p className="text-white font-black text-2xl">DVO</p>
                  <p className="text-slate-300 text-xs sm:text-sm mt-0.5 flex items-center gap-1 whitespace-nowrap">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-brand-orange" />
                    <span>Davao City</span>
                  </p>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center px-1 sm:px-2">
                  <div className="w-full max-w-[80px] sm:max-w-[100px] flex items-center gap-1">
                    <div className="h-px flex-1 bg-slate-600" />
                    <div className="w-2.5 h-2.5 rounded-full bg-brand-orange" />
                    <div className="h-px flex-1 bg-slate-600" />
                  </div>
                  <p className="text-slate-400 text-[11px] whitespace-nowrap mt-1 font-medium">Est. 12h 30m</p>
                </div>

                <div className="flex flex-col items-end">
                  <div className="text-right">
                    <p className="text-slate-400 text-xs font-medium">To</p>
                    <p className="text-white font-black text-2xl">MNL</p>
                    <p className="text-slate-300 text-xs sm:text-sm mt-0.5 flex items-center gap-1 whitespace-nowrap justify-end">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-cyan-400" />
                      <span>Manila PITX</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Dashed separator */}
              <div className="border-t border-dashed border-white/10 my-4 relative">
                <div className="absolute -left-7 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-950" />
                <div className="absolute -right-7 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-950" />
              </div>

              {/* Details row */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5 text-center">
                {[
                  { label: "Seat", value: "14A" },
                  { label: "Bus", value: "#Bus 01" },
                  { label: "Window", value: "08:00–08:15" },
                ].map((d) => (
                  <div key={d.label} className="bg-slate-950/40 rounded-xl p-2 border border-white/5">
                    <p className="text-slate-400 text-[10px] sm:text-xs uppercase font-semibold tracking-wider">{d.label}</p>
                    <p className="text-white font-black text-sm sm:text-base mt-0.5">{d.value}</p>
                  </div>
                ))}
              </div>

              {/* QR Code placeholder */}
              <div className="bg-white rounded-2xl p-3.5 flex items-center justify-center shadow-inner">
                <QrCode className="w-24 h-24 text-slate-950" strokeWidth={1.2} />
              </div>

              {/* Boarding window badge */}
              <div className="mt-4 flex items-center gap-2.5 bg-brand-orange/15 border border-brand-orange/30 rounded-xl p-3">
                <Clock className="w-4 h-4 text-brand-orange flex-shrink-0" />
                <p className="text-orange-200 text-xs sm:text-sm font-semibold leading-snug">
                  Boarding window: <strong className="text-white font-bold">08:00 – 08:15</strong>. Gate 3.
                </p>
              </div>
            </div>

            {/* Floating badges pinned safely to card corners without overflow */}
            <div className="absolute -top-3.5 right-0 sm:-right-4 sm:-top-5 flex items-center gap-2 rounded-2xl border border-brand-blue/40 bg-slate-900/98 px-3.5 py-2 shadow-xl shadow-brand-blue/25 backdrop-blur-md z-10">
              <TrendingUp className="h-5 w-5 text-brand-blue" aria-hidden />
              <div>
                <p className="text-white text-xs font-bold">Surge Predicted</p>
                <p className="text-cyan-300 text-[11px] font-semibold">+340% this weekend</p>
              </div>
            </div>

            <div className="absolute -bottom-3.5 left-0 sm:-left-4 sm:-bottom-5 flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-slate-900/98 px-3.5 py-2 shadow-xl shadow-emerald-500/15 backdrop-blur-md z-10">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden />
              <div>
                <p className="text-white text-xs font-bold">Seat Assigned</p>
                <p className="text-emerald-400 text-[11px] font-semibold">Matched by AI</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-slate-500 sm:flex"
      >
        <p className="text-xs font-medium tracking-widest uppercase">Scroll to explore</p>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-px h-8 bg-gradient-to-b from-slate-500 to-transparent"
        />
      </motion.div>
    </section>
  );
}
