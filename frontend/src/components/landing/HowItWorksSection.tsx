"use client";

import { motion } from "framer-motion";
import { Search, CreditCard, QrCode } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Search,
    title: "Search Your Route",
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
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden bg-slate-900/50 px-4 py-16 sm:px-6 lg:px-8"
    >
      <div className="mx-auto w-full max-w-7xl">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 lg:mb-12"
        >
          <span className="inline-block text-brand-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">
            Passenger Flow
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
            Three Steps to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-cyan-400">
              Your Seat
            </span>
          </h2>
          <p className="mt-3 text-slate-400 text-base sm:text-lg max-w-xl mx-auto">
            From search to scan in under a minute. No queuing, no disputes, no stress.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line on desktop */}
          <div className="hidden lg:block absolute top-[2.25rem] left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-brand-blue/40 via-brand-orange/40 to-green-500/40" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: index * 0.12 }}
                  className="flex flex-col items-center text-center lg:items-center p-4 sm:p-6 rounded-2xl bg-slate-900/40 border border-white/5 lg:bg-transparent lg:border-none"
                >
                  {/* Icon circle */}
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className={`relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl border ${step.border} ${step.glow} backdrop-blur-xl flex items-center justify-center mb-5 shadow-lg z-10`}
                  >
                    <Icon className={`w-8 h-8 sm:w-9 sm:h-9 ${step.color}`} />
                    <span className={`absolute -top-2 -right-2 text-xs font-black ${step.color} bg-slate-900 border ${step.border} px-2 py-0.5 rounded-lg shadow-md`}>
                      {step.step}
                    </span>
                  </motion.div>

                  <h3 className="text-white font-bold text-xl sm:text-2xl mb-2">{step.title}</h3>
                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-sm">{step.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* CTA nudge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-10 lg:mt-12"
        >
          <a
            href="/buy"
            className="inline-flex min-h-[52px] w-full sm:w-auto items-center justify-center gap-2 bg-brand-blue hover:bg-blue-600 text-white text-base font-bold px-8 py-4 rounded-xl shadow-xl shadow-brand-blue/30 transition-all hover:scale-105 active:scale-[0.98]"
          >
            Start Booking Now →
          </a>
        </motion.div>
      </div>
    </section>
  );
}
