"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, MapPin, QrCode, Clock, Zap } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartLine, faCheck } from "@fortawesome/free-solid-svg-icons";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EASE_IN_OUT = [0.42, 0, 0.58, 1] as const;

const floatingCard = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: EASE_OUT } },
};

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 pt-24 pb-16">
      {/* Animated gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-15%] w-[600px] h-[600px] bg-brand-blue/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-brand-orange/15 rounded-full blur-[120px] animate-pulse [animation-delay:1s]" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[80px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Left: Text */}
        <div className="text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-brand-blue/15 border border-brand-blue/30 text-brand-blue text-xs font-bold px-3 py-1.5 rounded-full mb-6 backdrop-blur-sm"
          >
            <Zap className="w-3.5 h-3.5" />
            AI-Powered Smart Boarding for ASEAN
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-6"
          >
            Board Smarter{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-cyan-400">
              Across ASEAN
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-slate-400 text-lg sm:text-xl leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0"
          >
            AI-powered seat allocation, QR boarding passes, and demand forecasting — all in one platform built for inter-provincial bus terminals.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
          >
            <Link
              id="hero-book-now"
              href="/buy"
              className="group inline-flex items-center justify-center gap-2 bg-brand-blue hover:bg-blue-600 text-white font-bold px-7 py-4 rounded-xl shadow-xl shadow-brand-blue/30 hover:shadow-brand-blue/50 transition-all hover:scale-105 active:scale-95 text-base"
            >
              Book Your Seat
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              id="hero-operator-login"
              href="/operator"
              className="inline-flex items-center justify-center gap-2 text-slate-300 hover:text-white font-semibold px-7 py-4 rounded-xl border border-white/20 hover:border-white/40 backdrop-blur-sm transition-all text-base"
            >
              Operator Dashboard
            </Link>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex flex-wrap gap-8 justify-center lg:justify-start mt-12"
          >
            {[
              { value: "7-Day", label: "Surge Forecast" },
              { value: "4", label: "ASEAN Languages" },
              { value: "≥70%", label: "Surge Accuracy" },
            ].map((stat) => (
              <div key={stat.label} className="text-center lg:text-left">
                <p className="text-2xl font-extrabold text-white">{stat.value}</p>
                <p className="text-slate-500 text-xs font-medium mt-0.5">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: Floating UI mockup */}
        <motion.div
          variants={floatingCard}
          initial="hidden"
          animate="visible"
          className="relative flex items-center justify-center"
        >
          {/* Glow behind card */}
          <div className="absolute inset-0 bg-brand-blue/20 rounded-3xl blur-3xl scale-90" />

          {/* Main ticket card */}
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: EASE_IN_OUT }}
            className="relative bg-white/8 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
          >
            {/* Card header */}
            <div className="flex justify-between items-center mb-5">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">IQueue Boarding Pass</p>
                <p className="text-white font-bold text-sm mt-0.5">Mon, 19 Feb 2026</p>
              </div>
              <span className="bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-bold px-2.5 py-1 rounded-full">
                Confirmed
              </span>
            </div>

            {/* Route */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1">
                <p className="text-slate-400 text-xs">From</p>
                <p className="text-white font-bold text-xl">MNL</p>
                <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />Manila Terminal
                </p>
              </div>
              <div className="flex flex-col items-center gap-1 flex-1">
                <div className="w-full flex items-center gap-1">
                  <div className="h-px flex-1 bg-slate-600" />
                  <div className="w-2 h-2 rounded-full bg-brand-orange" />
                  <div className="h-px flex-1 bg-slate-600" />
                </div>
                <p className="text-slate-500 text-[10px]">Est. 12h 30m</p>
              </div>
              <div className="flex-1 text-right">
                <p className="text-slate-400 text-xs">To</p>
                <p className="text-white font-bold text-xl">DVO</p>
                <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1 justify-end">
                  <MapPin className="w-3 h-3" />Davao City
                </p>
              </div>
            </div>

            {/* Dashed separator */}
            <div className="border-t border-dashed border-white/10 my-4 relative">
              <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-950" />
              <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-950" />
            </div>

            {/* Details row */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: "Seat", value: "14A" },
                { label: "Bus", value: "#Bus 01" },
                { label: "Window", value: "08:00–08:15" },
              ].map((d) => (
                <div key={d.label}>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider">{d.label}</p>
                  <p className="text-white font-bold text-sm mt-0.5">{d.value}</p>
                </div>
              ))}
            </div>

            {/* QR Code placeholder */}
            <div className="bg-white rounded-xl p-3 flex items-center justify-center">
              <QrCode className="w-20 h-20 text-slate-900" strokeWidth={1} />
            </div>

            {/* Boarding window badge */}
            <div className="mt-4 flex items-center gap-2 bg-brand-orange/15 border border-brand-orange/25 rounded-xl p-3">
              <Clock className="w-4 h-4 text-brand-orange flex-shrink-0" />
              <p className="text-brand-orange text-xs font-semibold">
                Boarding window: <strong>08:00 – 08:15</strong>. Please arrive at Gate 3.
              </p>
            </div>
          </motion.div>

          {/* Floating badges */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: EASE_IN_OUT, delay: 0.5 }}
            className="absolute -top-5 -right-4 bg-brand-blue/20 backdrop-blur-xl border border-brand-blue/30 rounded-2xl px-3 py-2 flex items-center gap-2"
          >
              <FontAwesomeIcon icon={faChartLine} className="text-brand-blue text-lg" />
            <div>
              <p className="text-white text-xs font-bold">Surge Predicted</p>
              <p className="text-blue-300 text-[10px]">+340% this weekend</p>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: EASE_IN_OUT, delay: 1 }}
            className="absolute -bottom-5 -left-4 bg-green-500/15 backdrop-blur-xl border border-green-500/25 rounded-2xl px-3 py-2 flex items-center gap-2"
          >
              <FontAwesomeIcon icon={faCheck} className="text-green-400 text-lg" />
            <div>
              <p className="text-white text-xs font-bold">Seat Assigned</p>
              <p className="text-green-400 text-[10px]">Matched by AI</p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500"
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
