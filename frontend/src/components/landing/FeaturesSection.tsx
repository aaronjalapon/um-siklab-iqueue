"use client";

import { motion } from "framer-motion";
import {
  Armchair,
  ChartLine,
  Layers,
  MessageCircle,
  QrCode,
  type LucideIcon,
} from "lucide-react";
import { BRAND } from "@/lib/brand";

type Feature = {
  icon: LucideIcon;
  iconClass: string;
  title: string;
  subtitle: string;
  summary: string;
  description: string;
  accent: string;
  border: string;
  badge: string;
  badgeText: string;
};

const features: Feature[] = [
  {
    icon: ChartLine,
    iconClass: "text-blue-300",
    title: "Demand Forecasting",
    subtitle: "Prophet + LSTM Hybrid",
    summary: "Predicts passenger surges up to 7 days ahead with 70%+ accuracy.",
    description:
      "Predicts passenger surges up to 7 days ahead using ASEAN holiday calendars, historical ridership, and real-time signals. Operators get early warnings before Holy Week, Eid, and Tết rushes.",
    accent: "from-blue-500/20 to-cyan-500/10",
    border: "border-blue-500/20",
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    badgeText: "7-Day Forecast",
  },
  {
    icon: Armchair,
    iconClass: "text-purple-300",
    title: "Smart Seat Allocator",
    subtitle: "Affinity-Based Pairing",
    summary: "Pairs seatmates by language and groups families together.",
    description:
      "Goes beyond simple assignment — matches seatmates by language, travel habits, and lifestyle. Families stay together. Solo travelers get peace. Every seat is optimized.",
    accent: "from-purple-500/20 to-pink-500/10",
    border: "border-purple-500/20",
    badge: "bg-purple-500/15 text-purple-400 border-purple-500/25",
    badgeText: "AI-Matched",
  },
  {
    icon: QrCode,
    iconClass: "text-orange-300",
    title: "QR Boarding Pass",
    subtitle: "HMAC-SHA256 Signed",
    summary: "Offline-verified QR codes with dynamic 15-min boarding gates.",
    description:
      "Cryptographically signed QR codes work offline at terminal gates. No internet? No problem. Each pass encodes passenger ID, route, seat, and your 15-minute boarding window.",
    accent: "from-orange-500/20 to-red-500/10",
    border: "border-orange-500/20",
    badge: "bg-orange-500/15 text-orange-400 border-orange-500/25",
    badgeText: "Offline-Ready",
  },
  {
    icon: MessageCircle,
    iconClass: "text-green-300",
    title: "Multilingual Chatbot",
    subtitle: "mBERT / Flan-T5",
    summary: "Instant 24/7 help in English, Filipino, Bahasa, and Tiếng Việt.",
    description:
      "Supports Filipino, Bahasa Indonesia, Vietnamese, and English natively. Ask about departure times, seat upgrades, or surge alerts — in your language, naturally.",
    accent: "from-green-500/20 to-teal-500/10",
    border: "border-green-500/20",
    badge: "bg-green-500/15 text-green-400 border-green-500/25",
    badgeText: "4 Languages",
  },
];

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden bg-slate-950 px-3.5 pt-20 pb-6 xs:px-4 xs:pt-24 xs:pb-8 sm:px-6 sm:py-16 lg:px-8"
    >
      <div className="mx-auto w-full max-w-7xl">
        {/* Section header: Refined pill badge and clear breathing room from fixed navbar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20px" }}
          transition={{ duration: 0.4 }}
          className="text-center mb-4 xs:mb-5 sm:mb-10 lg:mb-12"
        >
          <div className="inline-flex items-center gap-1.5 bg-brand-blue/15 border border-brand-blue/30 text-brand-blue text-[10px] xs:text-xs sm:text-sm font-bold uppercase tracking-wider px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full mb-2.5 sm:mb-4 backdrop-blur-sm">
            <Layers className="w-3.5 h-3.5 shrink-0 text-brand-blue" />
            <span>Platform Features</span>
          </div>
          <h2 className="text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.2] sm:leading-tight">
            Four Systems.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange to-yellow-400">
              One Platform.
            </span>
          </h2>
          <p className="mt-2 sm:mt-3.5 text-slate-300 text-xs xs:text-sm sm:text-base lg:text-lg leading-relaxed max-w-2xl mx-auto font-normal">
            TripSync integrates AI forecasting, intelligent seating, verified boarding, and multilingual support into a single cohesive experience.
          </p>
        </motion.div>

        {/* Feature cards: 2x2 grid on mobile (extended length/taller), 4 columns on desktop */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-20px" }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 xs:gap-3 sm:gap-4 lg:gap-6"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`relative rounded-2xl border ${feature.border} bg-gradient-to-br ${feature.accent} backdrop-blur-xl p-3 xs:p-3.5 sm:p-5 lg:p-6 flex flex-col justify-between min-h-[165px] xs:min-h-[175px] sm:min-h-0 overflow-hidden group cursor-default shadow-lg shadow-black/25`}
              >
                {/* Subtle glow on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 transition-opacity duration-300 rounded-2xl" />

                {/* Top: Icon + Badge side-by-side with single-line whitespace-nowrap badge */}
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-2 xs:mb-2.5">
                    <div className="h-8 w-8 xs:h-9 xs:w-9 sm:h-12 sm:w-12 rounded-xl bg-slate-900/70 border border-white/10 flex items-center justify-center shrink-0">
                      <Icon className={`h-4.5 w-4.5 xs:h-5 xs:w-5 sm:h-7 sm:w-7 ${feature.iconClass}`} aria-hidden />
                    </div>
                    <span className={`text-[7.5px] xs:text-[8.5px] sm:text-xs font-bold uppercase tracking-tight xs:tracking-wider border px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full whitespace-nowrap shrink-0 ${feature.badge}`}>
                      {feature.badgeText}
                    </span>
                  </div>

                  {/* Title and Subtitle */}
                  <div>
                    <h3 className="text-white font-bold text-xs xs:text-sm sm:text-xl leading-snug">{feature.title}</h3>
                    <p className="text-slate-400 text-[10px] xs:text-[11px] sm:text-xs font-medium mt-0.5">{feature.subtitle}</p>
                  </div>
                </div>

                {/* Summarized text for mobile, full text for desktop */}
                <div className="mt-2 xs:mt-2.5">
                  <p className="text-slate-300 text-[11px] xs:text-xs sm:hidden leading-relaxed">
                    {feature.summary}
                  </p>
                  <p className="hidden sm:block text-slate-300 text-sm sm:text-base leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
