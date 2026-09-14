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
    <section id="hero" className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-16 sm:py-20 lg:py-0">
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-16 xl:gap-20">
        {/* Left Column: Mobile Centered & Desktop Left-Aligned with Equal, Spacious Vertical Rhythm */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left w-full max-w-xl mx-auto lg:max-w-none">
          {/* Pill Badge */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 bg-brand-blue/15 border border-brand-blue/30 text-brand-blue text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-full mb-4 sm:mb-5 max-w-full backdrop-blur-sm"
          >
            <Zap className="w-3.5 h-3.5 shrink-0 text-brand-blue" />
            <span className="truncate">{BRAND.name} · AI Smart Boarding for ASEAN</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-4 sm:mb-5 text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.18] sm:leading-tight text-white tracking-tight"
          >
            Board smart,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-brand-blue to-cyan-400">
              travel smarter.
            </span>
          </motion.h1>

          {/* Senior-friendly description: spacious, high contrast, readable */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-6 sm:mb-8 text-sm xs:text-base sm:text-lg leading-relaxed text-slate-300 font-normal max-w-lg"
          >
            AI-powered seat allocation, QR boarding passes, and demand forecasting — all in one unified platform built for inter-provincial bus terminals.
          </motion.p>

          {/* CTA Buttons: Generous spacing & thumb-reachable Install App button */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4 justify-center lg:justify-start w-full mb-6 sm:mb-8"
          >
            {/* Primary Action: Book Your Seat */}
            <Link
              id="hero-book-now"
              href="/buy"
              className="group inline-flex min-h-[50px] sm:min-h-[54px] w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl bg-brand-blue px-7 py-3.5 sm:px-8 sm:py-4 text-base font-bold text-white shadow-xl shadow-brand-blue/30 transition-all hover:bg-blue-600 hover:shadow-brand-blue/50 active:scale-[0.98]"
            >
              <span>Book Your Seat</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            {/* Secondary Actions: Operator Login on bottom-left, Install App on bottom-right */}
            <div className="grid grid-cols-2 gap-3 w-full sm:flex sm:w-auto sm:gap-4">
              {/* Operator Login */}
              <Link
                id="hero-operator-login"
                href="/operator"
                className="inline-flex min-h-[46px] sm:min-h-[54px] items-center justify-center gap-2 rounded-xl border border-white/20 bg-slate-900/60 px-4 py-3 sm:px-7 sm:py-4 text-sm sm:text-base font-semibold text-slate-200 backdrop-blur-sm transition-all hover:border-white/40 hover:text-white active:scale-[0.98]"
              >
                <span>Operator Login</span>
              </Link>

              {/* Install App (thumb-friendly right positioning) */}
              <button
                id="hero-install-app"
                type="button"
                onClick={handleInstallApp}
                className="group inline-flex min-h-[46px] sm:min-h-[54px] items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 py-3 sm:px-7 sm:py-4 text-sm sm:text-base font-bold text-white shadow-lg shadow-brand-orange/25 transition-all hover:bg-orange-600 hover:shadow-brand-orange/40 active:scale-[0.98]"
              >
                <Download className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-y-0.5" />
                <span>Install App</span>
              </button>
            </div>
          </motion.div>

          {/* Stats row: Clean, spacious 3-column pill */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-3 divide-x divide-white/10 max-w-md w-full py-3 sm:py-3.5 px-2 sm:px-3 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-sm"
          >
            {[
              { value: "7-Day", label: "Surge Forecast" },
              { value: "4", label: "Languages" },
              { value: "≥70%", label: "Surge Accuracy" },
            ].map((stat) => (
              <div key={stat.label} className="text-center px-2 sm:px-3">
                <p className="text-lg sm:text-2xl font-black text-white">{stat.value}</p>
                <p className="text-slate-400 text-xs font-semibold mt-1 leading-tight">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right Column: Floating Boarding Pass — Hidden on mobile screens to save hardware resources and eliminate cramped layout */}
        <motion.div
          variants={floatingCard}
          initial="hidden"
          animate="visible"
          className="hidden lg:flex lg:col-start-2 lg:row-start-1 relative items-center justify-center px-4 w-full"
        >
          <div className="animate-float-smooth relative w-full max-w-[22rem]">
            {/* Ambient glow behind card */}
            <div className="absolute -inset-2 bg-brand-blue/25 rounded-3xl blur-2xl transform-gpu pointer-events-none" />

            {/* Main ticket card */}
            <div className="relative w-full rounded-3xl border border-white/15 bg-slate-900/95 p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-md">
              {/* Card header */}
              <div className="flex justify-between items-center mb-5">
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{BRAND.name} Boarding Pass</p>
                  <p className="text-white font-bold text-base mt-0.5">Mon, 21 Sep 2026</p>
                </div>
                <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full">
                  Confirmed
                </span>
              </div>

              {/* Route */}
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex flex-col items-start">
                  <p className="text-slate-400 text-xs font-medium">From</p>
                  <p className="text-white font-black text-2xl">DVO</p>
                  <p className="text-slate-300 text-sm mt-0.5 flex items-center gap-1 whitespace-nowrap">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-brand-orange" />
                    <span>Davao City</span>
                  </p>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center px-2">
                  <div className="w-full max-w-[100px] flex items-center gap-1">
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
                    <p className="text-slate-300 text-sm mt-0.5 flex items-center gap-1 whitespace-nowrap justify-end">
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
              <div className="grid grid-cols-3 gap-3 mb-5 text-center">
                {[
                  { label: "Seat", value: "14A" },
                  { label: "Bus", value: "#Bus 01" },
                  { label: "Window", value: "08:00–08:15" },
                ].map((d) => (
                  <div key={d.label} className="bg-slate-950/40 rounded-xl p-2 border border-white/5">
                    <p className="text-slate-400 text-xs uppercase font-semibold tracking-wider">{d.label}</p>
                    <p className="text-white font-black text-base mt-0.5">{d.value}</p>
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
                <p className="text-orange-200 text-sm font-semibold leading-snug">
                  Window: <strong className="text-white font-bold">08:00–08:15</strong> · Gate 3
                </p>
              </div>
            </div>

            {/* Floating badges */}
            <div className="absolute -top-5 -right-4 flex items-center gap-2 rounded-2xl border border-brand-blue/40 bg-slate-900/98 px-3.5 py-2 shadow-xl shadow-brand-blue/25 backdrop-blur-md z-10">
              <TrendingUp className="h-5 w-5 text-brand-blue" aria-hidden />
              <div>
                <p className="text-white text-xs font-bold leading-tight">Surge Predicted</p>
                <p className="text-cyan-300 text-[11px] font-semibold leading-tight">+340% this weekend</p>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-4 flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-slate-900/98 px-3.5 py-2 shadow-xl shadow-emerald-500/15 backdrop-blur-md z-10">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden />
              <div>
                <p className="text-white text-xs font-bold leading-tight">Seat Assigned</p>
                <p className="text-emerald-400 text-[11px] font-semibold leading-tight">Matched by AI</p>
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
