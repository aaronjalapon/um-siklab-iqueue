"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, CreditCard, QrCode, Route, Search, type LucideIcon } from "lucide-react";

type Step = {
  step: string;
  icon: LucideIcon;
  title: string;
  summary: string;
  description: string;
  color: string;
  glow: string;
  border: string;
};

const steps: Step[] = [
  {
    step: "01",
    icon: Search,
    title: "Search Your Route",
    summary: "Select your route and travel date to see live seat availability and AI surge predictions.",
    description:
      "Enter your origin, destination, and travel date. IQueue checks real-time seat availability and surge predictions across all operators.",
    color: "text-brand-blue",
    glow: "bg-brand-blue/20",
    border: "border-brand-blue/30",
  },
  {
    step: "02",
    icon: CreditCard,
    title: "Book & Pay",
    summary: "AI matches the ideal seat for you or your family with secure, instant payment.",
    description:
      "Our AI seat allocator picks the best seat for you — or lets you choose. Complete your booking in seconds with a secure payment flow.",
    color: "text-brand-orange",
    glow: "bg-brand-orange/20",
    border: "border-brand-orange/30",
  },
  {
    step: "03",
    icon: QrCode,
    title: "Scan & Board",
    summary: "Scan your offline HMAC QR pass at the gate within your 15-minute boarding window.",
    description:
      "Receive your HMAC-signed QR boarding pass. Arrive in your 15-minute window. Scan at the gate — even offline — and step on your bus.",
    color: "text-green-400",
    glow: "bg-green-500/20",
    border: "border-green-500/30",
  },
];

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden bg-slate-900/50 px-3.5 pt-16 pb-0 sm:px-6 sm:py-16 lg:px-8"
    >
      <div className="mx-auto w-full max-w-lg lg:max-w-7xl">
        {/* Section header: Perfectly centered with balanced vertical rhythm */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-3 sm:mb-10 lg:mb-12"
        >
          <div className="inline-flex items-center gap-1.5 bg-brand-orange/15 border border-brand-orange/30 text-brand-orange text-[10px] xs:text-xs sm:text-sm font-bold uppercase tracking-wider px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full mb-2 sm:mb-3 backdrop-blur-sm">
            <Route className="w-3.5 h-3.5 shrink-0 text-brand-orange" />
            <span>Passenger Flow</span>
          </div>
          <h2 className="text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.2] sm:leading-tight">
            Three Steps to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-cyan-400">
              Your Seat
            </span>
          </h2>
          <p className="mt-2 sm:mt-3 text-slate-300 text-xs xs:text-sm sm:text-base lg:text-lg max-w-xl mx-auto leading-relaxed font-normal">
            From search to scan in under a minute. No queuing, no disputes, no stress.
          </p>
        </motion.div>

        {/* Steps: Vertically stacked on mobile (single-viewport fit), 3-column on desktop */}
        <div className="relative">
          {/* Connecting line on desktop */}
          <div className="hidden lg:block absolute top-[2.25rem] left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-brand-blue/40 via-brand-orange/40 to-green-500/40" />

          <div className="space-y-2.5 xs:space-y-3 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-10">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-20px" }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ scale: 1.01 }}
                  className="flex flex-row lg:flex-col items-center text-left lg:text-center p-3 xs:p-3.5 sm:p-4 lg:p-6 rounded-2xl bg-slate-900/60 border border-white/10 lg:bg-transparent lg:border-none backdrop-blur-xl shadow-md lg:shadow-none"
                >
                  {/* Icon with Step Badge */}
                  <div
                    className={`relative w-11 h-11 xs:w-12 xs:h-12 lg:w-20 lg:h-20 rounded-xl lg:rounded-2xl border ${step.border} ${step.glow} backdrop-blur-xl flex items-center justify-center shrink-0 mb-0 lg:mb-5 shadow-lg z-10`}
                  >
                    <Icon className={`w-5 h-5 xs:w-6 xs:h-6 lg:w-9 lg:h-9 ${step.color}`} />
                    <span
                      className={`absolute -top-1.5 -left-1.5 lg:-top-2 lg:-right-2 lg:left-auto text-[9px] xs:text-[10px] lg:text-xs font-black ${step.color} bg-slate-950 border ${step.border} px-1.5 py-0.5 rounded-md lg:rounded-lg shadow-md`}
                    >
                      {step.step}
                    </span>
                  </div>

                  {/* Text Container */}
                  <div className="flex-1 min-w-0 pl-3 xs:pl-3.5 lg:pl-0">
                    <h3 className="text-white font-bold text-xs xs:text-sm lg:text-2xl leading-snug mb-0.5 lg:mb-2">
                      {step.title}
                    </h3>
                    {/* Summarized for mobile */}
                    <p className="text-slate-300 text-[11px] xs:text-xs leading-relaxed lg:hidden line-clamp-2">
                      {step.summary}
                    </p>
                    {/* Detailed for desktop */}
                    <p className="hidden lg:block text-slate-300 text-sm sm:text-base leading-relaxed max-w-sm">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* CTA nudge: Compact & thumb-friendly */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="text-center mt-3 sm:mt-8 lg:mt-12"
        >
          <Link
            href="/buy"
            className="inline-flex min-h-[44px] xs:min-h-[48px] sm:min-h-[52px] w-full sm:w-auto items-center justify-center gap-2 bg-brand-blue hover:bg-blue-600 text-white text-xs xs:text-sm sm:text-base font-bold px-6 py-2.5 sm:px-8 sm:py-4 rounded-xl shadow-xl shadow-brand-blue/30 transition-all hover:scale-105 active:scale-[0.98]"
          >
            <span>Start Booking Now</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
